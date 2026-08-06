class ServiceValidationError extends Error {
    constructor(code, message, field) {
        super(message);
        this.name = 'ServiceValidationError';
        this.code = code;
        this.field = field;
    }
}

function normalizeText(value, field, label) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new ServiceValidationError(
            'SERVICE_FIELD_REQUIRED',
            `${label} là bắt buộc.`,
            field
        );
    }
    return value.trim();
}

function normalizeCode(value, fallbackName) {
    const source = typeof value === 'string' && value.trim() ? value : fallbackName;
    return normalizeText(source, 'code', 'Mã dịch vụ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Đ/g, 'D')
        .replace(/đ/g, 'd')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toUpperCase();
}

function normalizeServiceInput(input, { partial = false } = {}) {
    const result = {};

    if (!partial || input.name !== undefined) {
        result.name = normalizeText(input.name, 'name', 'Tên dịch vụ');
    }
    if (!partial || input.code !== undefined || input.name !== undefined) {
        result.code = normalizeCode(input.code, result.name || input.name);
    }
    if (!partial || input.billingMode !== undefined || input.type !== undefined) {
        const legacyType = Number(input.type);
        const billingMode = input.billingMode
            ? String(input.billingMode).trim().toUpperCase()
            : legacyType === 1 ? 'METER' : legacyType === 2 ? 'FIXED' : '';
        if (!['FIXED', 'QUANTITY', 'METER'].includes(billingMode)) {
            throw new ServiceValidationError(
                'INVALID_SERVICE_TYPE',
                'Cách tính phải là cố định, theo số lượng hoặc theo chỉ số.',
                'billingMode'
            );
        }
        result.billingMode = billingMode;
        result.type = billingMode === 'METER' ? 1 : 2;
    }
    if (!partial || input.unit !== undefined) {
        result.unit = normalizeText(input.unit, 'unit', 'Đơn vị');
    }
    if (!partial || input.defaultPrice !== undefined) {
        const defaultPrice = Number(input.defaultPrice);
        if (!Number.isFinite(defaultPrice) || defaultPrice < 0) {
            throw new ServiceValidationError(
                'INVALID_SERVICE_PRICE',
                'Đơn giá phải là một số hữu hạn không âm.',
                'defaultPrice'
            );
        }
        result.defaultPrice = Math.round(defaultPrice);
    }
    if (!partial || input.defaultQuantity !== undefined) {
        const defaultQuantity = Number(input.defaultQuantity ?? 1);
        if (!Number.isFinite(defaultQuantity) || defaultQuantity < 0) {
            throw new ServiceValidationError(
                'INVALID_SERVICE_QUANTITY',
                'Số lượng mặc định phải là số hữu hạn không âm.',
                'defaultQuantity'
            );
        }
        result.defaultQuantity = defaultQuantity;
    }
    if (input.isActive !== undefined) {
        if (typeof input.isActive !== 'boolean') {
            throw new ServiceValidationError(
                'INVALID_SERVICE_STATUS',
                'Trạng thái dịch vụ không hợp lệ.',
                'isActive'
            );
        }
        result.isActive = input.isActive;
    } else if (!partial) {
        result.isActive = true;
    }

    if (partial && Object.keys(result).length === 0) {
        throw new ServiceValidationError(
            'EMPTY_SERVICE_UPDATE',
            'Không có trường dịch vụ hợp lệ để cập nhật.'
        );
    }

    return result;
}

module.exports = {
    ServiceValidationError,
    normalizeServiceInput,
};
