const mongoose = require('mongoose');

const pushDeviceSchema = new mongoose.Schema({
    nguoiThueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
    expoPushToken: { type: String, required: true, unique: true, trim: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
    deviceId: { type: String, required: true, trim: true },
    lastActiveAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

pushDeviceSchema.index({ nguoiThueId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('PushDevice', pushDeviceSchema);
