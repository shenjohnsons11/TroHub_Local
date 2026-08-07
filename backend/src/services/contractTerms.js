const FIELDS = {
    electricityPrice: 'Giá tiền điện',
    waterPrice: 'Giá tiền nước',
    initialElectricity: 'Chỉ số điện đầu',
    initialWater: 'Chỉ số nước đầu',
};
const DEFAULT_UTILITY_PRICES = {
    electricityPrice: 3500,
    waterPrice: 15000,
};

function readFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

function readPositiveNumber(value) {
    const number = readFiniteNumber(value);
    return number !== undefined && number > 0 ? number : undefined;
}

function resolveUtilityPriceDefaults(services = []) {
    const defaults = { ...DEFAULT_UTILITY_PRICES };
    const found = { electricity: false, water: false };

    for (const service of services) {
        if (Number(service?.type) !== 1 && service?.billingMode !== 'METER') continue;
        const price = readPositiveNumber(service?.defaultPrice);
        if (!price) continue;
        const key = `${service.code || ''} ${service.name || ''}`.toLowerCase();
        if (!found.electricity && (key.includes('điện') || key.includes('dien') || key.includes('electric'))) {
            defaults.electricityPrice = price;
            found.electricity = true;
        }
        if (!found.water && (key.includes('nước') || key.includes('nuoc') || key.includes('water'))) {
            defaults.waterPrice = price;
            found.water = true;
        }
    }

    return defaults;
}

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

function resolveLatestMeterValue({
    previousInvoice,
    roomSnapshot,
    previousContract,
    invoiceField,
    roomField,
    contractField,
    checkoutField,
}) {
    return readFiniteNumber(previousInvoice?.[invoiceField])
        ?? readFiniteNumber(roomSnapshot?.[roomField])
        ?? readFiniteNumber(previousContract?.checkoutSettlement?.[checkoutField])
        ?? readFiniteNumber(previousContract?.[contractField])
        ?? 0;
}

function resolveContractMeterSnapshot(contract, previousInvoice, roomSnapshot = {}, utilityDefaults = DEFAULT_UTILITY_PRICES) {
    let electricityPrice = readPositiveNumber(contract.electricityPrice);
    let waterPrice = readPositiveNumber(contract.waterPrice);

    for (const item of contract.services || []) {
        const service = item.serviceId;
        if (!service || Number(service.type) !== 1) continue;

        const name = String(service.name || '').toLowerCase();
        if (
            electricityPrice === undefined
            && (name.includes('điện') || name.includes('dien'))
        ) {
            electricityPrice = readPositiveNumber(item.fixedPrice);
        }
        if (
            waterPrice === undefined
            && (name.includes('nước') || name.includes('nuoc'))
        ) {
            waterPrice = readPositiveNumber(item.fixedPrice);
        }
    }

    return {
        electricityPrice: electricityPrice ?? readPositiveNumber(utilityDefaults.electricityPrice) ?? DEFAULT_UTILITY_PRICES.electricityPrice,
        waterPrice: waterPrice ?? readPositiveNumber(utilityDefaults.waterPrice) ?? DEFAULT_UTILITY_PRICES.waterPrice,
        electricityOld: resolveLatestMeterValue({
            previousInvoice,
            roomSnapshot,
            previousContract: contract,
            invoiceField: 'electricityNew',
            roomField: 'lastElectricityReading',
            contractField: 'initialElectricity',
            checkoutField: 'electricityNew',
        }),
        waterOld: resolveLatestMeterValue({
            previousInvoice,
            roomSnapshot,
            previousContract: contract,
            invoiceField: 'waterNew',
            roomField: 'lastWaterReading',
            contractField: 'initialWater',
            checkoutField: 'waterNew',
        }),
    };
}

function resolveInitialContractMeterTerms({ room, previousInvoice, previousContract } = {}) {
    return {
        initialElectricity: resolveLatestMeterValue({
            previousInvoice,
            roomSnapshot: room,
            previousContract,
            invoiceField: 'electricityNew',
            roomField: 'lastElectricityReading',
            contractField: 'initialElectricity',
            checkoutField: 'electricityNew',
        }),
        initialWater: resolveLatestMeterValue({
            previousInvoice,
            roomSnapshot: room,
            previousContract,
            invoiceField: 'waterNew',
            roomField: 'lastWaterReading',
            contractField: 'initialWater',
            checkoutField: 'waterNew',
        }),
    };
}

module.exports = {
    ContractTermsError,
    normalizeContractMeterTerms,
    resolveUtilityPriceDefaults,
    resolveContractMeterSnapshot,
    resolveInitialContractMeterTerms,
};
