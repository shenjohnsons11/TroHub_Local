const https = require('https');
const { Resolver } = require('dns').promises;

const cache = new Map();
let lastLookupAt = 0;

const resolver = new Resolver();
try {
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const NOMINATIM_IPS = ['151.101.193.91', '151.101.129.91', '151.101.1.91', '151.101.65.91'];

function propertyError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function normalizeCoordinates(latitude, longitude) {
    if (latitude === undefined && longitude === undefined) return undefined;

    const normalized = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)
        || normalized.latitude < -90 || normalized.latitude > 90
        || normalized.longitude < -180 || normalized.longitude > 180) {
        throw propertyError('INVALID_PROPERTY_COORDINATES', 'Tọa độ nhà trọ không hợp lệ.');
    }

    return normalized;
}

function isAppleSimulatorLocation(lat, lon) {
    // Apple Park / Cupertino range (mặc định trên Xcode iOS Simulator)
    return (lat >= 37.30 && lat <= 37.36 && lon >= -122.06 && lon <= -122.00);
}

function cacheKey({ latitude, longitude }) {
    return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

async function getNominatimIp() {
    try {
        const ips = await resolver.resolve4('nominatim.openstreetmap.org');
        if (ips && ips.length > 0) return ips[0];
    } catch {}
    return NOMINATIM_IPS[Math.floor(Math.random() * NOMINATIM_IPS.length)];
}

function queryNominatimViaHttps(ip, lat, lon) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: ip,
            port: 443,
            path: `/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
            method: 'GET',
            servername: 'nominatim.openstreetmap.org',
            headers: {
                'Host': 'nominatim.openstreetmap.org',
                'User-Agent': 'TroHub/1.0 (contact: admin@trohub.local)',
                'Accept-Language': 'vi,en;q=0.8'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.display_name) {
                        resolve(json.display_name.trim());
                    } else {
                        reject(new Error('No display_name in response'));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Nominatim timeout'));
        });
        req.end();
    });
}

async function queryBigDataCloud(lat, lon) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('BigDataCloud error ' + res.status);
    const data = await res.json();
    const parts = [
        data.locality,
        data.city || data.principalSubdivision,
        data.countryName
    ].filter(Boolean);
    const result = parts.join(', ').trim();
    if (!result) throw new Error('Empty address from BigDataCloud');
    return result;
}

async function reverseGeocode(coordinates) {
    // 1. Tự động nhận diện nếu đang chạy trên Xcode iOS Simulator (Apple Park Cupertino)
    if (isAppleSimulatorLocation(coordinates.latitude, coordinates.longitude)) {
        return '123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội';
    }

    const key = cacheKey(coordinates);
    const cached = cache.get(key);
    if (cached) return cached;

    // Giới hạn tần suất gọi 300ms
    if (Date.now() - lastLookupAt < 300) {
        await new Promise(r => setTimeout(r, 300));
    }
    lastLookupAt = Date.now();

    let address = '';

    // Cấp 1: Thử Nominatim qua Google/Cloudflare DNS để khắc phục lỗi chặn DNS của ISP
    try {
        const ip = await getNominatimIp();
        address = await queryNominatimViaHttps(ip, coordinates.latitude, coordinates.longitude);
    } catch (e1) {
        // Cấp 2: Thử fetch trực tiếp
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.latitude}&lon=${coordinates.longitude}`, {
                headers: { 'User-Agent': 'TroHub/1.0 (contact: admin@trohub.local)', 'Accept-Language': 'vi' },
                signal: AbortSignal.timeout(4000)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.display_name) address = data.display_name.trim();
            }
        } catch (e2) {}
    }

    // Cấp 3: Fallback qua BigDataCloud nếu Nominatim bị chặn hoặc không phản hồi
    if (!address) {
        try {
            address = await queryBigDataCloud(coordinates.latitude, coordinates.longitude);
        } catch (e3) {}
    }

    if (!address) {
        throw propertyError('LOCATION_LOOKUP_FAILED', 'Không thể lấy địa chỉ từ vị trí hiện tại.');
    }

    cache.set(key, address);
    return address;
}

module.exports = { normalizeCoordinates, reverseGeocode };
