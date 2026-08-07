const mongoose = require('mongoose');

const propertyMembershipSchema = new mongoose.Schema({
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    status: { type: String, enum: ['invited', 'active', 'left'], default: 'invited' },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
}, { timestamps: true });

propertyMembershipSchema.index({ propertyId: 1, tenantId: 1 }, { unique: true });
propertyMembershipSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PropertyMembership', propertyMembershipSchema);
