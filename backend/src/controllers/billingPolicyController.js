const BillingPolicy = require('../models/BillingPolicy');
const {
    BillingPolicyValidationError,
    normalizeBillingPolicy,
} = require('../services/billingPolicy');

const DEFAULT_POLICY = { lateFeeGraceDays: 3, lateFeeRate: 5 };

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
        const payload = normalizeBillingPolicy(req.body);
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
