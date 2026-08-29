const BillingPolicy = require('../models/BillingPolicy');
const {
    BillingPolicyValidationError,
    normalizeBillingPolicy,
} = require('../services/billingPolicy');

const DEFAULT_POLICY = {
    lateFeeGraceDays: 3,
    lateFeeRate: 5,
    automaticRemindersEnabled: true,
    remindBeforeDueDays: [3],
    remindOnDueDate: true,
    remindAfterOverdueDays: [1],
<<<<<<< HEAD
=======
    autoInvoiceEnabled: true,
    invoiceDay: 25,
    dueDay: 5,
    autoRemindEnabled: true,
    remindDaysBeforeDue: 2,
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
};

exports.getBillingPolicy = async (req, res) => {
    try {
        const policy = await BillingPolicy.findOne({ landlordId: req.auth.id });
        return res.status(200).json({
            success: true,
            data: policy || { ...DEFAULT_POLICY, landlordId: req.auth.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Không thể tải chính sách hóa đơn: ${error.message}`,
        });
    }
};

exports.updateBillingPolicy = async (req, res) => {
    try {
<<<<<<< HEAD
        const payload = normalizeBillingPolicy(req.body);
=======
        const current = await BillingPolicy.findOne({ landlordId: req.auth.id }).lean();
        const payload = normalizeBillingPolicy({ ...DEFAULT_POLICY, ...current, ...req.body });
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
        const policy = await BillingPolicy.findOneAndUpdate(
            { landlordId: req.auth.id },
            { ...payload, landlordId: req.auth.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return res.status(200).json({
            success: true,
            message: 'Đã lưu chính sách hóa đơn.',
            data: policy,
        });
    } catch (error) {
        if (error instanceof BillingPolicyValidationError) {
            return res.status(400).json({
                success: false,
                code: error.code,
                field: error.field,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: `Không thể lưu chính sách hóa đơn: ${error.message}`,
        });
    }
};
