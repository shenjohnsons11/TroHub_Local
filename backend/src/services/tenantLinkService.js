const bcrypt = require('bcryptjs');
const Account = require('../models/Account');
const PropertyMembership = require('../models/PropertyMembership');
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

function getIdentity(input) {
    const phone = String(input.phone || '').replace(/\D/g, '');
    const idCard = String(input.idCard || '').replace(/\D/g, '');
    const email = String(input.email || '').trim().toLowerCase();
    const identifiers = [phone && { phone }, idCard && { idCard }, email && { email }].filter(Boolean);
    return { phone, idCard, email, identifiers };
}

async function createOrInviteTenant(input, dependencies = {}) {
    const {
        AccountModel = Account,
        MembershipModel = PropertyMembership,
        hashPassword = (plain) => bcrypt.hash(plain, 10),
        notify = sendNotification,
    } = dependencies;
    const propertyId = input.propertyId;
    const landlordId = input.landlordId;
    const propertyName = String(input.propertyName || 'nhà trọ').trim();
    if (!propertyId || !landlordId) throw new TenantLinkError('Không tìm thấy thông tin nhà trọ hoặc chủ trọ!', 401);

    const { phone, idCard, email, identifiers } = getIdentity(input);
    const matches = identifiers.length ? await AccountModel.find({ role: 2, $or: identifiers }) : [];
    const uniqueMatches = [...new Map(matches.map((account) => [String(account._id), account])).values()];
    if (uniqueMatches.length > 1) {
        throw new TenantLinkError('SĐT, CCCD hoặc Email đang thuộc các tài khoản khác nhau!', 409, 'TENANT_IDENTITY_CONFLICT');
    }

    let tenant = uniqueMatches[0];
    const created = !tenant;
    if (created) {
        if (!String(input.fullName || '').trim()) throw new TenantLinkError('Họ và tên người thuê không được để trống!');
        if (phone.length !== 10) throw new TenantLinkError('Số điện thoại phải gồm đúng 10 chữ số!');
        if (idCard.length !== 12) throw new TenantLinkError('Số CCCD phải gồm đúng 12 chữ số!');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TenantLinkError('Email không hợp lệ!');
        tenant = await AccountModel.create({
            username: email,
            password: await hashPassword('123456'),
            fullName: String(input.fullName).trim(),
            phone,
            email,
            idCard,
            role: 2,
            status: 1,
            mustChangePassword: true,
        });
    }

    let membership = await MembershipModel.findOne({ propertyId, tenantId: tenant._id });
    if (membership?.status === 'active' || membership?.status === 'invited') {
        throw new TenantLinkError('Người thuê đã thuộc hoặc đang có lời mời vào nhà trọ này.', 409, 'MEMBERSHIP_EXISTS');
    }
    if (membership) {
        membership.status = 'invited';
        membership.invitedAt = new Date();
        membership.joinedAt = null;
        membership.leftAt = null;
        await membership.save();
    } else {
        membership = await MembershipModel.create({ propertyId, tenantId: tenant._id, status: 'invited' });
    }

    await notify({
        userId: tenant._id,
        title: 'Lời mời vào nhà trọ',
        content: `Bạn được mời tham gia ${propertyName}.`,
        category: 'tenant',
        deepLink: 'home',
        metadata: { propertyId, membershipId: membership._id, action: 'membership-invite' },
        eventKey: `membership:${membership._id}:invited`,
    });

    return { tenant, membership, created };
}

module.exports = {
    TenantLinkError,
    createOrInviteTenant,
    lookupTenantAccount,
    normalizeTenantIdentifier,
};
