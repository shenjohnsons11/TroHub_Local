const bcrypt = require('bcryptjs');
const Account = require('../models/Account');
const Property = require('../models/Property');
const PropertyMembership = require('../models/PropertyMembership');
const { sendNotification } = require('../services/notificationService');
const { assertOwnedProperty, acceptMembership, PropertyMembershipError } = require('../services/propertyMembershipService');
const { normalizeTenantIdentifier } = require('../services/tenantLinkService');

function tenantIdentity(input) {
    const phone = String(input.phone || '').replace(/\D/g, '');
    const idCard = String(input.idCard || '').replace(/\D/g, '');
    const email = String(input.email || '').trim().toLowerCase();
    const identities = [phone && { phone }, idCard && { idCard }, email && { email }].filter(Boolean);
    return { phone, idCard, email, identities };
}

async function resolveTenant(input) {
    const { phone, idCard, email, identities } = tenantIdentity(input);
    if (!identities.length) throw new PropertyMembershipError('Vui lòng cung cấp SĐT, CCCD hoặc Email của người thuê.', 400, 'TENANT_IDENTIFIER_REQUIRED');
    const matches = await Account.find({ role: 2, $or: identities });
    const uniqueMatches = [...new Map(matches.map((item) => [String(item._id), item])).values()];
    if (uniqueMatches.length > 1) throw new PropertyMembershipError('SĐT, CCCD hoặc Email đang thuộc các tài khoản khác nhau.', 409, 'TENANT_IDENTITY_CONFLICT');
    if (uniqueMatches[0]) return { tenant: uniqueMatches[0], created: false };

    if (!String(input.fullName || '').trim() || phone.length !== 10 || idCard.length !== 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new PropertyMembershipError('Hồ sơ mới cần họ tên, SĐT 10 số, CCCD 12 số và Email hợp lệ.', 400, 'TENANT_PROFILE_INVALID');
    }
    const tenant = await Account.create({
        username: email,
        password: await bcrypt.hash('123456', 10),
        fullName: String(input.fullName).trim(),
        phone,
        email,
        idCard,
        role: 2,
        status: 1,
        mustChangePassword: true,
    });
    return { tenant, created: true };
}

exports.listForProperty = async (req, res) => {
    try {
        await assertOwnedProperty({ propertyId: req.params.propertyId, landlordId: req.auth.id });
        const data = await PropertyMembership.find({ propertyId: req.params.propertyId })
            .populate('tenantId', 'fullName phone email idCard')
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
};

exports.invite = async (req, res) => {
    try {
        await assertOwnedProperty({ propertyId: req.params.propertyId, landlordId: req.auth.id });
        const property = await Property.findOne({ _id: req.params.propertyId, ownerId: req.auth.id });
        const { tenant, created } = await resolveTenant(req.body);
        let membership = await PropertyMembership.findOne({ propertyId: property._id, tenantId: tenant._id });
        if (membership?.status === 'active' || membership?.status === 'invited') {
            return res.status(409).json({ success: false, code: 'MEMBERSHIP_EXISTS', message: 'Người thuê đã thuộc hoặc đang có lời mời vào nhà trọ này.' });
        }
        if (membership) {
            membership.status = 'invited';
            membership.invitedAt = new Date();
            membership.joinedAt = null;
            membership.leftAt = null;
            await membership.save();
        } else {
            membership = await PropertyMembership.create({ propertyId: property._id, tenantId: tenant._id });
        }
        await sendNotification({
            userId: tenant._id,
            title: 'Lời mời vào nhà trọ',
            content: `Bạn được mời tham gia ${property.name}.`,
            category: 'tenant',
            deepLink: 'home',
            metadata: { propertyId: property._id, membershipId: membership._id, action: 'membership-invite' },
            eventKey: `membership:${membership._id}:invited`,
        });
        return res.status(created ? 201 : 200).json({ success: true, data: { membership, tenant }, created });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message || 'Không thể mời người thuê.' });
    }
};

exports.listMine = async (req, res) => {
    try {
        const data = await PropertyMembership.find({ tenantId: req.auth.id })
            .populate('propertyId', 'name address status')
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: `Không thể tải nhà trọ: ${error.message}` });
    }
};

exports.accept = async (req, res) => {
    try {
        const membership = await PropertyMembership.findOne({ _id: req.params.membershipId, tenantId: req.auth.id });
        const data = await acceptMembership({ membership, tenantId: req.auth.id });
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
};

exports.decline = async (req, res) => {
    try {
        const membership = await PropertyMembership.findOne({ _id: req.params.membershipId, tenantId: req.auth.id });
        if (!membership) throw new PropertyMembershipError('Không tìm thấy lời mời nhà trọ.', 404, 'MEMBERSHIP_NOT_FOUND');
        if (membership.status !== 'invited') throw new PropertyMembershipError('Chỉ có thể từ chối lời mời đang chờ.', 409, 'MEMBERSHIP_NOT_INVITED');
        await membership.deleteOne();
        return res.json({ success: true });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
};

exports.lookup = async (req, res) => {
    try {
        const query = normalizeTenantIdentifier(req.query.identifier);
        const tenant = await Account.findOne({ role: 2, ...query }).select('fullName phone email idCard').lean();
        return res.json({ success: true, found: Boolean(tenant), data: tenant || null });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
};
