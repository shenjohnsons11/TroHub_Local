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

// POST /api/payments/vietqr/create
// Tạo giao dịch chờ thanh toán và sinh mã QR VietQR
exports.createVietQRPayment = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        if (!invoiceId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu invoiceId"
            });
        }

        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hóa đơn"
            });
        }

        if (invoice.status === 2) {
            return res.status(400).json({
                success: false,
                message: "Hóa đơn này đã được thanh toán"
            });
        }

        const amount = invoice.totalAmount || 0;

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Số tiền hóa đơn không hợp lệ"
            });
        }

        // Nếu đã có giao dịch VietQR đang chờ thì trả lại QR cũ, không tạo mới
        const existingPending = await Transaction.findOne({
            invoiceId: invoice._id,
            method: "VietQR",
            status: 2
        }).sort({ createdAt: -1 });

        if (existingPending) {
            return res.status(200).json({
                success: true,
                message: "Đã có giao dịch đang chờ thanh toán",
                data: {
                    transactionId: existingPending._id,
                    invoiceId: invoice._id,
                    amount: existingPending.amount,
                    method: existingPending.method,
                    status: existingPending.status,
                    orderCode: existingPending.orderCode,
                    description: existingPending.description,
                    qrUrl: existingPending.qrUrl
                }
            });
        }

        const bankId = process.env.VIETQR_BANK_ID;
        const accountNo = process.env.VIETQR_ACCOUNT_NO;
        const accountName = process.env.VIETQR_ACCOUNT_NAME;

        if (!bankId || !accountNo || !accountName) {
            return res.status(500).json({
                success: false,
                message: "Thiếu cấu hình VietQR trong file .env"
            });
        }

        const shortInvoiceId = invoice._id.toString().slice(-6).toUpperCase();
        const timeCode = Date.now().toString().slice(-6);

        // Mã này sẽ xuất hiện trong nội dung chuyển khoản
        const orderCode = `TROHUB${shortInvoiceId}${timeCode}`;

        // Nội dung CK phải duy nhất để webhook thật đối chiếu
        const description = orderCode;
        const qrUrl =
            `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
            `?amount=${amount}` +
            `&addInfo=${encodeURIComponent(description)}` +
            `&accountName=${encodeURIComponent(accountName)}`;

        const transaction = await Transaction.create({
            invoiceId: invoice._id,
            amount,
            method: "VietQR",
            status: 2, // Đang chờ thanh toán
            orderCode,
            description,
            qrUrl
        });

        // Hóa đơn chuyển sang trạng thái Chưa thanh toán / Đang chờ
        invoice.status = 1;
        invoice.paymentMethod = "VietQR";
        invoice.transactionCode = orderCode;
        await invoice.save();

        res.status(201).json({
            success: true,
            message: "Tạo mã VietQR thành công",
            data: {
                transactionId: transaction._id,
                invoiceId: invoice._id,
                amount,
                method: transaction.method,
                status: transaction.status,
                orderCode,
                description,
                qrUrl
            }
        });
    } catch (error) {
        console.error("Lỗi tạo VietQR:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi Server: " + error.message
        });
    }
};

// GET /api/payments/:id/status
// Kiểm tra trạng thái giao dịch thanh toán
exports.getPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .populate({
                path: "invoiceId",
                select: "period totalAmount status room tenant paymentMethod transactionCode"
            });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                transactionId: transaction._id,
                invoiceId: transaction.invoiceId?._id,
                amount: transaction.amount,
                method: transaction.method,
                status: transaction.status,
                statusText:
                    transaction.status === 1
                        ? "success"
                        : transaction.status === 2
                            ? "pending"
                            : transaction.status === 3
                                ? "cancelled"
                                : "failed",
                orderCode: transaction.orderCode,
                description: transaction.description,
                qrUrl: transaction.qrUrl,
                gatewayReference: transaction.gatewayReference,
                paidAt: transaction.paidAt,
                invoice: transaction.invoiceId
            }
        });
    } catch (error) {
        console.error("Lỗi kiểm tra trạng thái thanh toán:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi Server: " + error.message
        });
    }
};

// POST /api/payments/vietqr/webhook
// Webhook giả lập: xác nhận giao dịch VietQR đã thanh toán thành công
// POST /api/payments/vietqr/webhook
// Webhook nhận thông báo thanh toán từ VietQR/Casso/SePay/payOS hoặc test PowerShell
exports.vietQRWebhook = async (req, res) => {
    try {
        const body = req.body || {};

        // Một số cổng gửi data trong body.data
        const rawData = Array.isArray(body.data)
            ? body.data[0]
            : body.data || body;

        const normalize = (value) => {
            return String(value || "")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "");
        };

        const transactionId =
            rawData.transactionId ||
            rawData.transaction_id ||
            body.transactionId;

        const orderCode =
            rawData.orderCode ||
            rawData.order_code ||
            rawData.orderId ||
            rawData.order_id ||
            body.orderCode;

        const content =
            rawData.description ||
            rawData.content ||
            rawData.transferContent ||
            rawData.transactionContent ||
            rawData.memo ||
            rawData.remark ||
            rawData.addInfo ||
            body.description ||
            body.content ||
            "";

        const amount =
            Number(rawData.amount) ||
            Number(rawData.transferAmount) ||
            Number(rawData.transactionAmount) ||
            Number(rawData.creditAmount) ||
            Number(body.amount);

        const gatewayReference =
            rawData.gatewayReference ||
            rawData.transactionId ||
            rawData.transaction_id ||
            rawData.reference ||
            rawData.refNo ||
            rawData.bankTransactionId ||
            body.gatewayReference ||
            `BANK_${Date.now()}`;

        let transaction = null;

        // 1. Test nội bộ bằng Mongo transactionId
        if (transactionId) {
            transaction = await Transaction.findById(transactionId);
        }

        // 2. Tìm bằng orderCode nếu cổng thanh toán trả về
        if (!transaction && orderCode) {
            transaction = await Transaction.findOne({
                orderCode,
                method: "VietQR"
            });
        }

        // 3. Tìm bằng nội dung chuyển khoản thật
        if (!transaction && content && amount) {
            const normalizedContent = normalize(content);

            const pendingTransactions = await Transaction.find({
                method: "VietQR",
                status: 2,
                amount
            }).sort({ createdAt: -1 });

            transaction = pendingTransactions.find((item) => {
                const code1 = normalize(item.orderCode);
                const code2 = normalize(item.description);

                return (
                    (code1 && normalizedContent.includes(code1)) ||
                    (code2 && normalizedContent.includes(code2))
                );
            });
        }

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giao dịch cần xác nhận",
                received: {
                    transactionId,
                    orderCode,
                    content,
                    amount
                }
            });
        }

        if (transaction.status === 1) {
            return res.status(200).json({
                success: true,
                message: "Giao dịch này đã được thanh toán trước đó",
                data: {
                    transactionId: transaction._id,
                    status: transaction.status
                }
            });
        }

        if (!amount || amount !== transaction.amount) {
            return res.status(400).json({
                success: false,
                message: "Số tiền thanh toán không khớp",
                expectedAmount: transaction.amount,
                receivedAmount: amount
            });
        }

        transaction.status = 1; // Thành công
        transaction.gatewayReference = gatewayReference;
        transaction.paidAt = new Date();
        await transaction.save();

        const invoice = await Invoice.findById(transaction.invoiceId);

        if (invoice) {
            invoice.status = 2; // Đã thanh toán
            invoice.paymentMethod = "VietQR";
            invoice.transactionCode = transaction.orderCode;
            await invoice.save();
        }

        return res.status(200).json({
            success: true,
            message: "Xác nhận thanh toán VietQR thành công",
            data: {
                transactionId: transaction._id,
                invoiceId: transaction.invoiceId,
                amount: transaction.amount,
                status: transaction.status,
                statusText: "success",
                paidAt: transaction.paidAt,
                gatewayReference: transaction.gatewayReference
            }
        });
    } catch (error) {
        console.error("Lỗi webhook VietQR:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi Server: " + error.message
        });
    }
};