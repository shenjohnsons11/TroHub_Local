const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

propertySchema.index({ ownerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
