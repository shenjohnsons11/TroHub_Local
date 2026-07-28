const FIELDS = {
    electricityPrice: 'Giá tiền điện',
    waterPrice: 'Giá tiền nước',
    initialElectricity: 'Chỉ số điện đầu',
    initialWater: 'Chỉ số nước đầu',
};

class ContractTermsError extends Error {
    constructor(code, message, field) {
        super(message);
        this.name = 'ContractTermsError';
        this.code = code;
        this.field = field;
        this.status = 400;
    }
}

function normalizeContractMeterTerms(input, { partial = false } = {}) {
    const result = {};

    for (const [field, label] of Object.entries(FIELDS)) {
        const value = input[field];
        const missing = value === undefined
            || value === null
            || (typeof value === 'string' && !value.trim());

        if (missing) {
            if (!partial) {
                throw new ContractTermsError(
                    'CONTRACT_METER_TERM_REQUIRED',
                    `${label} là bắt buộc.`,
                    field
                );
            }
            continue;
        }

        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) {
            throw new ContractTermsError(
                'INVALID_CONTRACT_METER_TERM',
                `${label} phải là số hữu hạn không âm.`,
                field
            );
        }

        result[field] = field.endsWith('Price') ? Math.round(number) : number;
    }

    return result;
}

function resolveContractMeterSnapshot(contract, previousInvoice) {
    let electricityPrice = contract.electricityPrice;
    let waterPrice = contract.waterPrice;

    for (const item of contract.services || []) {
        const service = item.serviceId;
        if (!service || Number(service.type) !== 1) continue;

        const name = String(service.name || '').toLowerCase();
        if (
            electricityPrice === undefined
            && (name.includes('điện') || name.includes('dien'))
        ) {
            electricityPrice = Number(item.fixedPrice) || 0;
        }
        if (
            waterPrice === undefined
            && (name.includes('nước') || name.includes('nuoc'))
        ) {
            waterPrice = Number(item.fixedPrice) || 0;
        }
    }

    return {
        electricityPrice: electricityPrice ?? 0,
        waterPrice: waterPrice ?? 0,
        electricityOld: previousInvoice?.electricityNew
            ?? contract.initialElectricity
            ?? 0,
        waterOld: previousInvoice?.waterNew
            ?? contract.initialWater
            ?? 0,
    };
}

module.exports = {
    ContractTermsError,
    normalizeContractMeterTerms,
    resolveContractMeterSnapshot,
};
