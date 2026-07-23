function money(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function idOf(value) {
    if (!value) return '';
    return String(value._id || value);
}

function buildSuccessfulPaymentFilter() {
    return {
        status: 1,
        paidAt: { $type: 'date' },
    };
}

function mapSuccessfulPayment(transaction) {
    const invoice = transaction.invoiceId || {};
    const contract = invoice.contractId || {};
    const nguoiThue = contract.tenantId || {};
    const room = contract.roomId || {};
    const serviceCharge =
        money(invoice.services)
        + money(invoice.parking)
        + money(invoice.internet)
        + money(invoice.garbage);

    return {
        id: idOf(transaction),
        transactionCode:
            transaction.orderCode
            || idOf(transaction).slice(-8).toUpperCase(),
        gatewayReference: transaction.gatewayReference || null,
        invoiceId: idOf(invoice),
        nguoiThueId: idOf(nguoiThue),
        nguoiThue: nguoiThue.fullName || '-',
        room: room.roomCode || invoice.room || '-',
        period: invoice.period || '',
        method: transaction.method || 'Tiền mặt',
        amount: money(transaction.amount),
        paidAt: new Date(transaction.paidAt).toISOString(),
        invoiceBreakdown: {
            roomCharge: money(invoice.roomAmount),
            electricityCharge: money(invoice.electricity),
            waterCharge: money(invoice.water),
            serviceCharge,
            lateFee: money(invoice.penalty),
            discount: money(invoice.discount),
            totalAmount: money(invoice.totalAmount),
        },
    };
}

module.exports = {
    buildSuccessfulPaymentFilter,
    mapSuccessfulPayment,
};
