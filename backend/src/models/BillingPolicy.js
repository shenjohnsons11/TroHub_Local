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
}, { timestamps: true });

module.exports = mongoose.model('BillingPolicy', billingPolicySchema);
