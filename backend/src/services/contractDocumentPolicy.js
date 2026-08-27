function normalizeId(value, seen = new Set()) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'bigint') return String(value).trim();
    if (typeof value !== 'object' || seen.has(value)) return '';

    seen.add(value);
    try {
        for (const candidate of [value._id, value.id]) {
            if (candidate === undefined || candidate === value || Buffer.isBuffer(candidate)) continue;
            const id = normalizeId(candidate, seen);
            if (id) return id;
        }
        if (typeof value.toHexString === 'function') {
            return normalizeId(value.toHexString(), seen);
        }
    } catch (_error) {
        return '';
    }
    return '';
}

function splitArguments(first, second) {
    if (second === undefined && first && typeof first === 'object' && first.contract) {
        return {
            contract: first.contract,
            user: first.user ?? first.actor ?? first.auth ?? first,
        };
    }
    if (first && typeof first === 'object' && first.role !== undefined && second) {
        return { contract: second, user: first };
    }
    return { contract: first, user: second };
}

function contractOwnerId(contract) {
    return normalizeId(
        contract?.landlordId
        ?? contract?.ownerId
        ?? contract?.roomLandlordId
        ?? contract?.room?.landlordId
        ?? contract?.roomId?.landlordId
    );
}

function userId(user) {
    return normalizeId(user?.id ?? user?._id ?? user?.userId ?? user?.accountId);
}

function canViewContract(first, second) {
    const { contract, user } = splitArguments(first, second);
    const id = userId(user);
    if (!id) return false;
    if (user?.role === 1) return id === contractOwnerId(contract);
    if (user?.role === 2) return id === normalizeId(contract?.tenantId);
    return false;
}

function canDownloadDocx(first, second) {
    const { contract, user } = splitArguments(first, second);
    return user?.role === 1
        && contract?.status === 0
        && canViewContract(contract, user);
}

module.exports = {
    normalizeId,
    canViewContract,
    canDownloadDocx,
};
