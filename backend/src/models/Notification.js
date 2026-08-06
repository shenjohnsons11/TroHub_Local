const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'CONTRACT_SENT',
            'INVOICE_DUE_SOON',
            'INVOICE_DUE_TODAY',
            'INVOICE_OVERDUE',
            'INVOICE_MANUAL_REMINDER',
        ],
        required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ['CONTRACT', 'INVOICE'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    deepLink: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    deduplicationKey: { type: String, default: null },
    delivery: {
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index(
    { deduplicationKey: 1 },
    { unique: true, sparse: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
