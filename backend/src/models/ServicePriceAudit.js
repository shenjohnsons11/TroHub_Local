const mongoose = require('mongoose');

const servicePriceAuditSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    oldPrice: { type: Number, required: true, min: 0 },
    newPrice: { type: Number, required: true, min: 0 },
    changedAt: { type: Date, default: Date.now },
}, { timestamps: true });

servicePriceAuditSchema.index({ serviceId: 1, changedAt: -1 });

module.exports = mongoose.model('ServicePriceAudit', servicePriceAuditSchema);
