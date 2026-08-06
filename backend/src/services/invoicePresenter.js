const INVOICE_STATUS_LABELS = Object.freeze({
    0: 'Nháp',
    1: 'Chưa thanh toán',
    2: 'Đã thanh toán',
    3: 'Quá hạn',
});

function getInvoiceStatusLabel(status) {
    return INVOICE_STATUS_LABELS[Number(status)] || 'Không xác định';
}

function presentInvoiceListItem(invoice) {
    const contract = invoice.contractId || {};
    const room = contract.roomId || {};
    const nguoiThue = contract.tenantId || {};

    return {
        id: String(invoice._id),
        invoiceCode: invoice.invoiceCode || 'Chưa xác định',
        period: invoice.period || 'Chưa xác định',
        roomCode: room.roomCode || invoice.room || 'Chưa xác định',
        nguoiThue: nguoiThue.fullName || invoice.tenant || 'Chưa xác định',
        totalAmount: Number(invoice.totalAmount || 0),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
        statusCode: Number(invoice.status),
        statusLabel: getInvoiceStatusLabel(invoice.status),
    };
}

module.exports = {
    getInvoiceStatusLabel,
    presentInvoiceListItem,
};
