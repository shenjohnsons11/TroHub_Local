const {
    calculateMeterCharge,
    parseNonNegativeFinite,
    roundVnd,
} = require('./invoiceCalculator');

const BILLING_MODES = Object.freeze(['FIXED', 'QUANTITY', 'METER']);

function normalizeBillingMode(value, legacyType) {
    const mode = String(value || '').trim().toUpperCase();
    if (BILLING_MODES.includes(mode)) return mode;
    if (legacyType === 1) return 'METER';
    if (legacyType === 2) return 'FIXED';
    throw new TypeError('Chế độ tính phí dịch vụ không hợp lệ');
}

function calculateServiceAmount(input) {
    const billingMode = normalizeBillingMode(input.billingMode, input.type);
    const appliedPrice = parseNonNegativeFinite(
        input.appliedPrice,
        'appliedPrice',
        'Đơn giá dịch vụ'
    );

    if (billingMode === 'FIXED') return roundVnd(appliedPrice);
    if (billingMode === 'QUANTITY') {
        const quantity = parseNonNegativeFinite(input.quantity, 'quantity', 'Số lượng dịch vụ');
        return roundVnd(quantity * appliedPrice);
    }
    return calculateMeterCharge({
        label: input.serviceName || 'dịch vụ theo chỉ số',
        oldIndex: input.oldIndex,
        newIndex: input.newIndex,
        unitPrice: appliedPrice,
    }).amount;
}

function buildContractServiceSnapshot(service, overrides = {}) {
    return Object.freeze({
        serviceId: service._id,
        serviceName: service.name,
        serviceCode: service.code,
        billingMode: normalizeBillingMode(service.billingMode, service.type),
        unit: service.unit,
        fixedPrice: parseNonNegativeFinite(
            overrides.fixedPrice ?? service.defaultPrice,
            'fixedPrice',
            'Đơn giá dịch vụ'
        ),
        defaultQuantity: parseNonNegativeFinite(
            overrides.defaultQuantity ?? service.defaultQuantity ?? 1,
            'defaultQuantity',
            'Số lượng mặc định'
        ),
    });
}

function buildInvoiceServiceLine(snapshot, usage = {}) {
    const quantity = usage.quantity ?? snapshot.defaultQuantity ?? 1;
    const line = {
        serviceId: snapshot.serviceId,
        serviceName: snapshot.serviceName,
        serviceCode: snapshot.serviceCode,
        billingMode: normalizeBillingMode(snapshot.billingMode, snapshot.type),
        unit: snapshot.unit,
        appliedPrice: snapshot.fixedPrice,
        quantity,
        oldIndex: usage.oldIndex ?? null,
        newIndex: usage.newIndex ?? null,
    };
    return Object.freeze({
        ...line,
        amount: calculateServiceAmount(line),
    });
}

module.exports = {
    BILLING_MODES,
    buildContractServiceSnapshot,
    buildInvoiceServiceLine,
    calculateServiceAmount,
    normalizeBillingMode,
};
