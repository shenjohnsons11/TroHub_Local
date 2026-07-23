class CalculationError extends Error {
    constructor(code, message, field) {
        super(message);
        this.name = 'CalculationError';
        this.code = code;
        this.field = field;
    }
}

function parseNonNegativeFinite(value, field, label = field) {
    if (value === '' || value === null || value === undefined) {
        throw new CalculationError(
            'INVALID_CALCULATION_INPUT',
            `${label} phải là một số hữu hạn không âm.`,
            field
        );
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new CalculationError(
            'INVALID_CALCULATION_INPUT',
            `${label} phải là một số hữu hạn không âm.`,
            field
        );
    }

    return parsed;
}

function parseOptionalMoney(value, field, label = field) {
    if (value === '' || value === null || value === undefined) return 0;
    return parseNonNegativeFinite(value, field, label);
}

function roundVnd(value) {
    return Math.round(value);
}

function calculateMeterCharge({ label, oldIndex, newIndex, unitPrice }) {
    const normalizedOldIndex = parseNonNegativeFinite(
        oldIndex,
        `${label}.oldIndex`,
        `Chỉ số ${label.toLowerCase()} cũ`
    );
    const normalizedNewIndex = parseNonNegativeFinite(
        newIndex,
        `${label}.newIndex`,
        `Chỉ số ${label.toLowerCase()} mới`
    );
    const normalizedUnitPrice = parseNonNegativeFinite(
        unitPrice,
        `${label}.unitPrice`,
        `Đơn giá ${label.toLowerCase()}`
    );

    if (normalizedNewIndex < normalizedOldIndex) {
        throw new CalculationError(
            'METER_INDEX_REGRESSION',
            `Chỉ số ${label} mới không được nhỏ hơn chỉ số cũ.`,
            `${label}.newIndex`
        );
    }

    const usage = normalizedNewIndex - normalizedOldIndex;
    return {
        oldIndex: normalizedOldIndex,
        newIndex: normalizedNewIndex,
        unitPrice: normalizedUnitPrice,
        usage,
        amount: roundVnd(usage * normalizedUnitPrice),
    };
}

function calculateInvoiceAmounts(input) {
    const electricity = calculateMeterCharge({
        label: 'Điện',
        oldIndex: input.electricityOld,
        newIndex: input.electricityNew,
        unitPrice: input.electricityPrice,
    });
    const water = calculateMeterCharge({
        label: 'Nước',
        oldIndex: input.waterOld,
        newIndex: input.waterNew,
        unitPrice: input.waterPrice,
    });

    const roomAmount = roundVnd(parseOptionalMoney(input.roomAmount, 'roomAmount', 'Tiền phòng'));
    const services = roundVnd(parseOptionalMoney(input.services, 'services', 'Phí dịch vụ'));
    const parking = roundVnd(parseOptionalMoney(input.parking, 'parking', 'Phí giữ xe'));
    const internet = roundVnd(parseOptionalMoney(input.internet, 'internet', 'Phí internet'));
    const garbage = roundVnd(parseOptionalMoney(input.garbage, 'garbage', 'Phí vệ sinh'));
    const penalty = roundVnd(parseOptionalMoney(input.penalty, 'penalty', 'Phí phạt'));
    const discount = roundVnd(parseOptionalMoney(input.discount, 'discount', 'Giảm giá'));

    const subtotal = roundVnd(
        roomAmount +
        electricity.amount +
        water.amount +
        services +
        parking +
        internet +
        garbage +
        penalty
    );

    return {
        roomAmount,
        electricityOld: electricity.oldIndex,
        electricityNew: electricity.newIndex,
        electricityPrice: electricity.unitPrice,
        electricityUsage: electricity.usage,
        electricity: electricity.amount,
        waterOld: water.oldIndex,
        waterNew: water.newIndex,
        waterPrice: water.unitPrice,
        waterUsage: water.usage,
        water: water.amount,
        services,
        parking,
        internet,
        garbage,
        penalty,
        discount,
        subtotal,
        totalAmount: Math.max(0, roundVnd(subtotal - discount)),
    };
}

module.exports = {
    CalculationError,
    calculateInvoiceAmounts,
    calculateMeterCharge,
    parseNonNegativeFinite,
    roundVnd,
};
