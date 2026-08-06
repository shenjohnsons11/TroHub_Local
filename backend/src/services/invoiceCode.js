class InvoiceCodeValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'InvoiceCodeValidationError';
        this.code = 'INVALID_INVOICE_CODE_SOURCE';
        this.field = field;
    }
}

function normalizeInvoicePeriod(period) {
    const value = String(period || '').trim();
    if (/^tiền\s*cọc$/i.test(value.normalize('NFC'))) return 'COC';
    const monthYear = value.match(/^(?:tháng\s*)?(\d{1,2})[/-](\d{4})$/i);
    const yearMonth = value.match(/^(\d{4})[/-](\d{1,2})$/);
    const match = monthYear || (yearMonth && [yearMonth[0], yearMonth[2], yearMonth[1]]);

    if (!match) {
        throw new InvoiceCodeValidationError('Kỳ hóa đơn không hợp lệ', 'period');
    }

    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month < 1 || month > 12 || year < 2000 || year > 9999) {
        throw new InvoiceCodeValidationError('Kỳ hóa đơn không hợp lệ', 'period');
    }

    return `${year}${String(month).padStart(2, '0')}`;
}

function normalizeRoomCode(roomCode) {
    const value = String(roomCode || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Đ/g, 'D')
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!value) {
        throw new InvoiceCodeValidationError('Mã phòng không hợp lệ', 'roomCode');
    }

    return value;
}

function buildInvoiceCode({ period, roomCode }) {
    return `HD-${normalizeInvoicePeriod(period)}-${normalizeRoomCode(roomCode)}`;
}

async function allocateInvoiceCode(source, dependencies) {
    if (!dependencies || typeof dependencies.exists !== 'function') {
        throw new TypeError('Thiếu hàm kiểm tra mã hóa đơn');
    }

    const baseCode = buildInvoiceCode(source);
    if (!await dependencies.exists(baseCode)) return baseCode;

    let sequence = 2;
    while (sequence <= 9999) {
        const candidate = `${baseCode}-${String(sequence).padStart(2, '0')}`;
        if (!await dependencies.exists(candidate)) return candidate;
        sequence += 1;
    }

    throw new InvoiceCodeValidationError('Không thể cấp mã hóa đơn duy nhất', 'invoiceCode');
}

module.exports = {
    InvoiceCodeValidationError,
    allocateInvoiceCode,
    buildInvoiceCode,
    normalizeInvoicePeriod,
    normalizeRoomCode,
};
