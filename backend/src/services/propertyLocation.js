const cache = new Map();
let lastLookupAt = 0;

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

function cacheKey({ latitude, longitude }) {
    return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

async function reverseGeocode(coordinates) {
    const key = cacheKey(coordinates);
    const cached = cache.get(key);
    if (cached) return cached;

    if (Date.now() - lastLookupAt < 1000) {
        throw propertyError('LOCATION_RATE_LIMITED', 'Vui lòng đợi một lát trước khi thử lại.');
    }
    lastLookupAt = Date.now();

    let response;
    try {
        response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.latitude}&lon=${coordinates.longitude}`, {
            headers: { 'User-Agent': 'TroHub/1.0 (property-location)' },
        });
    } catch (_error) {
        throw propertyError('LOCATION_LOOKUP_FAILED', 'Không thể lấy địa chỉ từ vị trí hiện tại.');
    }

    if (!response.ok) {
        throw propertyError('LOCATION_LOOKUP_FAILED', 'Không thể lấy địa chỉ từ vị trí hiện tại.');
    }

    const data = await response.json();
    const address = typeof data.display_name === 'string' ? data.display_name.trim() : '';
    if (!address) throw propertyError('LOCATION_LOOKUP_FAILED', 'Không thể lấy địa chỉ từ vị trí hiện tại.');

    // ponytail: process-local cache; use Redis only when multiple instances need shared rate limiting.
    cache.set(key, address);
    return address;
}

module.exports = { normalizeCoordinates, reverseGeocode };
