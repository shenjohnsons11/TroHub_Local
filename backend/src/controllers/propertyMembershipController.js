const Account = require('../models/Account');
const Property = require('../models/Property');
const PropertyMembership = require('../models/PropertyMembership');
const { assertOwnedProperty, acceptMembership, PropertyMembershipError } = require('../services/propertyMembershipService');
const { createOrInviteTenant, normalizeTenantIdentifier } = require('../services/tenantLinkService');

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
        const result = await createOrInviteTenant({
            ...req.body,
            propertyId: property._id,
            propertyName: property.name,
            landlordId: req.auth.id,
        });
        return res.status(result.created ? 201 : 200).json({ success: true, data: result, created: result.created });
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
