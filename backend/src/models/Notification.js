const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
    type: {
        type: String,
        enum: [
            'CONTRACT_SENT',
            'INVOICE_DUE_SOON',
            'INVOICE_DUE_TODAY',
            'INVOICE_OVERDUE',
            'INVOICE_MANUAL_REMINDER',
            'SYSTEM',
            'TENANT',
            'REPAIR',
            'UTILITY',
            'INVOICE',
            'CONTRACT',
            'CHECKOUT',
        ],
        required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    content: { type: String, trim: true },
    category: { type: String, trim: true },
    entityType: { type: String, enum: ['CONTRACT', 'INVOICE'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    deepLink: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    eventKey: { type: String },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    deduplicationKey: { type: String },
    delivery: {
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true, sparse: true });
notificationSchema.index(
    { deduplicationKey: 1 },
    { unique: true, sparse: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
