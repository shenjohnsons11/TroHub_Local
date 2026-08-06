const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    otpHash: { type: String, default: null },
    resetTokenHash: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attemptCount: { type: Number, default: 0 },
    usedAt: { type: Date, default: null },
    requestedIp: { type: String, required: true },
}, { timestamps: true });

passwordResetSchema.index({ accountId: 1, createdAt: -1 });
passwordResetSchema.index({ requestedIp: 1, createdAt: -1 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
