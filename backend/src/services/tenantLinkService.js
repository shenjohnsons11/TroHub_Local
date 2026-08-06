const bcrypt = require('bcryptjs');
const Account = require('../models/Account');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const { sendNotification } = require('./notificationService');

class TenantLinkError extends Error {
    constructor(message, status = 400, code = 'TENANT_LINK_INVALID') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function normalizeTenantIdentifier(identifier) {
    const value = String(identifier || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { email: value.toLowerCase() };
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return { phone: digits };
    if (digits.length === 12) return { idCard: digits };
    throw new TenantLinkError('Vui lòng nhập SĐT 10 số, CCCD 12 số hoặc Email hợp lệ!');
}

function safeTenantProfile(account) {
    return {
        _id: String(account._id),
        fullName: account.fullName || '',
        phone: account.phone || '',
        email: account.email || '',
        idCard: account.idCard || '',
    };
}

async function lookupTenantAccount(identifier, { AccountModel = Account } = {}) {
    const query = normalizeTenantIdentifier(identifier);
    const account = await AccountModel.findOne({ role: 2, ...query });
    return account ? safeTenantProfile(account) : null;
}

async function createOrLinkTenant(input, dependencies = {}) {
    const {
        AccountModel = Account,
        RoomModel = Room,
        ContractModel = Contract,
        hashPassword = (plain) => bcrypt.hash(plain, 10),
        notify = sendNotification,
    } = dependencies;
    const landlordId = input.landlordId;
    const phone = String(input.phone || '').replace(/\D/g, '');
    const idCard = String(input.idCard || '').replace(/\D/g, '');
    const email = String(input.email || '').trim().toLowerCase();
    const roomCode = String(input.roomCode || '').trim();
    const identifiers = [phone && { phone }, idCard && { idCard }, email && { email }].filter(Boolean);

    if (!landlordId) throw new TenantLinkError('Không tìm thấy thông tin chủ trọ!', 401);
    let room = null;
    if (roomCode) {
        room = await RoomModel.findOne({ roomCode, landlordId });
        if (!room || room.status !== 0) throw new TenantLinkError('Phòng đã chọn không còn trống hoặc không thuộc Chủ trọ!');
        if (await ContractModel.exists({ roomId: room._id, status: { $in: [0, 1, 4, 5] } })) {
            throw new TenantLinkError('Phòng đã có hợp đồng đang chờ hoặc đang hiệu lực!');
        }
    }

    const matches = identifiers.length ? await AccountModel.find({ role: 2, $or: identifiers }) : [];
    const uniqueMatches = [...new Map(matches.map((account) => [String(account._id), account])).values()];
    if (uniqueMatches.length > 1) {
        throw new TenantLinkError('SĐT, CCCD hoặc Email đang thuộc các tài khoản khác nhau!');
    }

    let tenant = uniqueMatches[0];
    const created = !tenant;
    if (created) {
        if (!String(input.fullName || '').trim()) throw new TenantLinkError('Họ và tên người thuê không được để trống!');
        if (phone.length !== 10) throw new TenantLinkError('Số điện thoại phải gồm đúng 10 chữ số!');
        if (idCard.length !== 12) throw new TenantLinkError('Số CCCD phải gồm đúng 12 chữ số!');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TenantLinkError('Email không hợp lệ!');
        tenant = new AccountModel({
            username: email,
            password: await hashPassword('123456'),
            fullName: String(input.fullName).trim(),
            phone,
            email,
            idCard,
            role: 2,
            status: 1,
            linkedLandlords: [landlordId],
            pendingLandlords: [],
            mustChangePassword: true,
        });
    } else {
        tenant.linkedLandlords = tenant.linkedLandlords || [];
        if (!tenant.linkedLandlords.some((id) => String(id) === String(landlordId))) tenant.linkedLandlords.push(landlordId);
        tenant.pendingLandlords = (tenant.pendingLandlords || []).filter((id) => String(id) !== String(landlordId));
    }
    await tenant.save();

    let contract = null;
    if (room) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        contract = new ContractModel({
            roomId: room._id,
            tenantId: tenant._id,
            startDate,
            endDate,
            fixedRentPrice: room.defaultRentPrice || 0,
            fixedDeposit: room.defaultDeposit || 0,
            services: [],
            status: 0,
        });
        await contract.save();
    }

    await notify({
        userId: tenant._id,
        title: room ? 'Đã được thêm vào phòng' : 'Đã được thêm vào danh bạ chủ trọ',
        content: created
            ? (room ? `Bạn đã được Chủ trọ thêm vào Phòng ${room.roomCode}. Mật khẩu mặc định: 123456` : `Bạn đã được Chủ trọ thêm vào danh sách người thuê. Mật khẩu mặc định: 123456`)
            : (room ? `Bạn đã được Chủ trọ thêm vào Phòng ${room.roomCode}.` : `Bạn đã được Chủ trọ thêm vào danh sách người thuê.`),
        category: 'tenant',
        deepLink: room ? 'home' : 'profile',
        metadata: { roomId: room?._id, roomCode: room?.roomCode, action: room ? 'room-assigned' : 'linked' },
        eventKey: room
            ? `tenant:${tenant._id}:room:${room._id}:assigned`
            : `tenant:${tenant._id}:landlord:${landlordId}:linked`,
    });

    return { tenant, contract, created, roomCode: room?.roomCode };
}

module.exports = {
    TenantLinkError,
    createOrLinkTenant,
    lookupTenantAccount,
    normalizeTenantIdentifier,
};
