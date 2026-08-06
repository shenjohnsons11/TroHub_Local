const Invoice = require('../models/Invoice');
const { createAndDeliverNotification } = require('./notificationService');

class InvoiceNotificationError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const toId = (value) => String(value?._id || value || '');

const defaultDependencies = {
    findInvoice: (id) => Invoice.findById(id).populate({
        path: 'contractId',
        select: 'tenantId roomId',
        populate: { path: 'roomId', select: 'landlordId' },
    }),
    deliver: createAndDeliverNotification,
    incrementReminder: (id) => Invoice.findByIdAndUpdate(id, { $inc: { remindCount: 1 } }),
};

async function remindInvoicePayment(
    { invoiceId, adminId },
    dependencies = defaultDependencies,
) {
    const invoice = await dependencies.findInvoice(invoiceId);
    if (!invoice) throw new InvoiceNotificationError('INVOICE_NOT_FOUND', 'Không tìm thấy hóa đơn.', 404);
    if (invoice.status === 2) throw new InvoiceNotificationError('INVOICE_ALREADY_PAID', 'Hóa đơn đã được thanh toán.');
    if (![1, 3].includes(invoice.status)) {
        throw new InvoiceNotificationError('INVOICE_NOT_REMINDABLE', 'Hóa đơn chưa sẵn sàng để gửi nhắc.');
    }
    if (toId(invoice.contractId?.roomId?.landlordId) !== toId(adminId)) {
        throw new InvoiceNotificationError('INVOICE_FORBIDDEN', 'Bạn không có quyền nhắc hóa đơn này.', 403);
    }

    const amount = Number(invoice.totalAmount || 0).toLocaleString('vi-VN');
    const result = await dependencies.deliver({
        recipientId: toId(invoice.contractId.tenantId),
        type: 'INVOICE_MANUAL_REMINDER',
        title: 'Nhắc thanh toán hóa đơn',
        message: `Hóa đơn kỳ ${invoice.period} có số tiền ${amount}đ đang chờ thanh toán.`,
        entityType: 'INVOICE',
        entityId: toId(invoice._id),
        deepLink: `/invoice?id=${toId(invoice._id)}&payment=true`,
    });
    await dependencies.incrementReminder(invoice._id);
    return result;
}

module.exports = {
    InvoiceNotificationError,
    remindInvoicePayment,
};
