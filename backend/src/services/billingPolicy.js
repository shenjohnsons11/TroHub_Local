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
        automaticRemindersEnabled: input.automaticRemindersEnabled !== false,
        remindBeforeDueDays: normalizeReminderDays(input.remindBeforeDueDays ?? [3], 'remindBeforeDueDays'),
        remindOnDueDate: input.remindOnDueDate !== false,
        remindAfterOverdueDays: normalizeReminderDays(input.remindAfterOverdueDays ?? [1], 'remindAfterOverdueDays'),
    };
}

function normalizeReminderDays(value, field) {
    if (!Array.isArray(value)) {
        throw new BillingPolicyValidationError('Danh sách ngày nhắc không hợp lệ.', field);
    }
    const days = value.map(Number);
    if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 90)) {
        throw new BillingPolicyValidationError('Ngày nhắc phải là số nguyên từ 1 đến 90.', field);
    }
    return [...new Set(days)].sort((a, b) => a - b);
}

module.exports = {
    BillingPolicyValidationError,
    normalizeBillingPolicy,
    normalizeReminderDays,
};
