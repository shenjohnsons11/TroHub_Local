const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');

// GET /api/payments - Lấy toàn bộ lịch sử giao dịch (Dành cho Chủ trọ - Web)
exports.getAllPayments = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate({
                path: 'invoiceId',
                select: 'room tenant period totalAmount contractId',
                populate: {
                    path: 'contractId',
                    select: 'roomId tenantId',
                    populate: [
                        { path: 'roomId', select: 'roomCode' },
                        { path: 'tenantId', select: 'fullName' }
                    ]
                }
            })
            .sort({ createdAt: -1 });

        const data = transactions.map(t => {
            const invoice = t.invoiceId;
            const contract = invoice?.contractId;
            const room = contract?.roomId?.roomCode || invoice?.room || '-';
            const tenant = contract?.tenantId?.fullName || invoice?.tenant || '-';
            const period = invoice?.period || '';

            return {
                _id: t._id,
                transactionCode: t._id.toString().slice(-8).toUpperCase(),
                invoiceId: invoice?._id?.toString() || '',
                room,
                tenant,
                month: period,
                amount: t.amount || 0,
                method: t.method || 'Tiền mặt',
                status: t.status, // 0: Thất bại, 1: Thành công
                createdAt: t.createdAt
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};
