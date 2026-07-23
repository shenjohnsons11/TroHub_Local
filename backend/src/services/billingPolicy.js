class BillingPolicyValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'BillingPolicyValidationError';
        this.field = field;
        this.code = 'INVALID_BILLING_POLICY';
    }
}

function normalizeBillingPolicy(input = {}) {
    const lateFeeGraceDays = Number(input.lateFeeGraceDays);
    const lateFeeRate = Number(input.lateFeeRate);

    if (!Number.isInteger(lateFeeGraceDays) || lateFeeGraceDays < 0 || lateFeeGraceDays > 90) {
        throw new BillingPolicyValidationError(
            'Số ngày ân hạn phải là số nguyên từ 0 đến 90.',
            'lateFeeGraceDays'
        );
    }
    if (!Number.isFinite(lateFeeRate) || lateFeeRate < 0 || lateFeeRate > 100) {
        throw new BillingPolicyValidationError(
            'Tỷ lệ phạt phải từ 0 đến 100.',
            'lateFeeRate'
        );
    }

    return {
        lateFeeGraceDays,
        lateFeeRate: Math.round(lateFeeRate * 100) / 100,
    };
}

module.exports = { BillingPolicyValidationError, normalizeBillingPolicy };
