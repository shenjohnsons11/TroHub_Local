function asAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
}

function presentInvoice(invoice) {
    const source = typeof invoice?.toObject === 'function' ? invoice.toObject() : { ...invoice };
    const contract = source.contractId && typeof source.contractId === 'object' ? source.contractId : {};
    const room = contract.roomId && typeof contract.roomId === 'object' ? contract.roomId : {};
    const tenant = contract.tenantId && typeof contract.tenantId === 'object' ? contract.tenantId : {};
    const isDeposit = source.type === 'deposit'
        || source.period === 'Tiền cọc'
        || String(source.invoiceCode || '').includes('Tiền cọc');
    const meterCharge = (stored, oldIndex, newIndex, price) => {
        const savedAmount = asAmount(stored);
        return savedAmount || Math.max(asAmount(newIndex) - asAmount(oldIndex), 0) * asAmount(price);
    };

    return {
        ...source,
        type: isDeposit ? 'deposit' : 'monthly',
        depositAmount: isDeposit ? asAmount(source.totalAmount) || asAmount(contract.fixedDeposit) : 0,
        rent: isDeposit ? 0 : asAmount(source.roomAmount) || asAmount(contract.fixedRentPrice) || asAmount(room.defaultRentPrice),
        electricity: isDeposit ? 0 : meterCharge(source.electricity, source.electricityOld, source.electricityNew, source.electricityPrice || contract.electricityPrice),
        water: isDeposit ? 0 : meterCharge(source.water, source.waterOld, source.waterNew, source.waterPrice || contract.waterPrice),
        tenantName: tenant.fullName || source.tenant || '',
        tenantPhone: tenant.phone || '',
        roomName: room.roomCode || source.room || '',
    };
}

module.exports = { presentInvoice };
