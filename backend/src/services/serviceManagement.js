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
    if (!partial || input.type !== undefined) {
        const type = Number(input.type);
        if (type !== 1 && type !== 2) {
            throw new ServiceValidationError(
                'INVALID_SERVICE_TYPE',
                'Loại dịch vụ phải là tính theo chỉ số hoặc tính khoán.',
                'type'
            );
        }
        result.type = type;
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
