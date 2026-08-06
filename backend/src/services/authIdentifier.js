function cleanIdentifier(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
    const cleaned = cleanIdentifier(value);
    return cleaned.toLowerCase();
}

function normalizePhone(value) {
    const cleaned = cleanIdentifier(value);
    if (!cleaned || /[a-zA-Z]/.test(cleaned)) return '';
    
    // Xóa toàn bộ ký tự không phải là chữ số (. - khoảng trắng +)
    let digits = cleaned.replace(/\D/g, '');
    
    // Nếu bắt đầu bằng 84 (ví dụ: +84901234567 hoặc 84901234567) và dài 11 số -> đổi về 0901234567
    if (digits.startsWith('84') && digits.length === 11) {
        digits = '0' + digits.slice(2);
    }
    
    return digits;
}

function normalizeLoginIdentifier(value) {
    const identifier = cleanIdentifier(value);
    if (identifier.includes('@')) {
        return normalizeEmail(identifier);
    }
    return normalizePhone(identifier) || identifier;
}

function buildLoginLookup(value) {
    const original = cleanIdentifier(value);
    const phoneNorm = normalizePhone(original);

    if (phoneNorm) {
        return {
            $or: [
                { phone: phoneNorm },
                { username: original },
                { email: phoneNorm },
            ]
        };
    }

    const emailNorm = normalizeEmail(original);
    return {
        $or: [
            { phone: emailNorm },
            { username: original },
            { email: emailNorm },
        ]
    };
}

module.exports = {
    buildLoginLookup,
    normalizeLoginIdentifier,
    normalizeEmail,
    normalizePhone,
};
