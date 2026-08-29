const mongoose = require('mongoose');

const billingPolicySchema = new mongoose.Schema({
    landlordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        unique: true,
        index: true,
    },
    lateFeeGraceDays: { type: Number, min: 0, max: 90, default: 3 },
    lateFeeRate: { type: Number, min: 0, max: 100, default: 5 },
    automaticRemindersEnabled: { type: Boolean, default: true },
    remindBeforeDueDays: { type: [Number], default: [3] },
    remindOnDueDate: { type: Boolean, default: true },
    remindAfterOverdueDays: { type: [Number], default: [1] },
<<<<<<< HEAD
=======
    autoInvoiceEnabled: { type: Boolean, default: true },
    invoiceDay: { type: Number, min: 1, max: 31, default: 25 },
    dueDay: { type: Number, min: 1, max: 31, default: 5 },
    autoRemindEnabled: { type: Boolean, default: true },
    remindDaysBeforeDue: { type: Number, min: 1, max: 31, default: 2 },
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
}, { timestamps: true });

module.exports = mongoose.model('BillingPolicy', billingPolicySchema);
