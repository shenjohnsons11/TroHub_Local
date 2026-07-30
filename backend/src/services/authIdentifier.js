function cleanIdentifier(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function looksLikeFormattedPhone(identifier) {
    return /^[+\d][\d\s.-]*$/.test(identifier);
}

function normalizeLoginIdentifier(value) {
    const identifier = cleanIdentifier(value);
    if (identifier.includes('@')) {
        return identifier.toLowerCase();
    }
    if (!identifier || !looksLikeFormattedPhone(identifier)) {
        return identifier;
    }

    return identifier.replace(/[\s.-]/g, '');
}

function buildLoginLookup(value) {
    const originalIdentifier = cleanIdentifier(value);
    const normalizedIdentifier = normalizeLoginIdentifier(originalIdentifier);

    return {
        $or: [
            { phone: normalizedIdentifier },
            { username: originalIdentifier },
            { email: normalizedIdentifier },
        ],
    };
}

module.exports = {
    buildLoginLookup,
    normalizeLoginIdentifier,
};
