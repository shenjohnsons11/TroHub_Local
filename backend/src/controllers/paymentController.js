const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');
const { applyOverduePenalty } = require('../services/overdueInvoice');
const { notifyLandlord } = require('../services/landlordNotificationService');
const {
    buildSuccessfulPaymentFilter,
    mapSuccessfulPayment,
} = require('../services/paymentHistory');

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}


// GET /api/payments - Lấy lịch sử tiền đã thanh toán thành công cho Admin
exports.getAllPayments = async (req, res) => {
    try {
        const transactions = await Transaction.find(buildSuccessfulPaymentFilter())
            .populate({
                path: 'invoiceId',
                select: [
                    'room',
                    'period',
                    'totalAmount',
                    'contractId',
                    'roomAmount',
                    'electricity',
                    'water',
                    'services',
                    'parking',
                    'internet',
                    'garbage',
                    'penalty',
                    'discount',
                ].join(' '),
                populate: {
                    path: 'contractId',
                    select: 'roomId tenantId',
                    populate: [
                        { path: 'roomId', select: 'roomCode' },
                        { path: 'tenantId', select: 'fullName' }
                    ]
                }
            })
            .sort({ paidAt: -1 });

        res.status(200).json({
            success: true,
            data: transactions.map(mapSuccessfulPayment),
        });
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

        await applyOverduePenalty(invoiceId);
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy hóa đơn"
            });
        }

        if ([2, 4].includes(invoice.status)) {
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
            await notifyLandlord({
                event: 'invoice_paid',
                contractId: invoice.contractId,
                entityId: invoice._id,
            });
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

// VNPay logic
exports.createVNPayUrl = async (req, res) => {
    try {
        const { invoiceId, nguoiThueId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ success: false, message: "Thiếu invoiceId" });
        }

        await applyOverduePenalty(invoiceId);
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
        }
        if ([2, 4].includes(invoice.status)) {
            return res.status(400).json({ success: false, message: "Hóa đơn này đã được thanh toán" });
        }

        const amount = invoice.totalAmount || 0;
        if (amount <= 0) {
            return res.status(400).json({ success: false, message: "Số tiền hóa đơn không hợp lệ" });
        }

        const tmnCode = process.env.VNPAY_TMN_CODE || 'TD3422D1';
        const secretKey = process.env.VNPAY_SECRET_KEY;
        if (!secretKey) {
            return res.status(503).json({ success: false, message: "VNPay chưa được cấu hình" });
        }
        const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNPAY_RETURN_URL || 'https://yourdomain.com/vnpay_return';

        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';

        const shortInvoiceId = invoice._id.toString().slice(-6).toUpperCase();
        const timeCode = Date.now().toString().slice(-6);
        let orderId = `TROHUB${shortInvoiceId}${timeCode}`;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan hoa don: ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        vnp_Params = sortObject(vnp_Params);
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        let finalRedirectUrl = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });

        const transaction = await Transaction.create({
            invoiceId: invoice._id,
            amount,
            method: "VNPay",
            status: 2,
            orderCode: orderId,
            description: vnp_Params['vnp_OrderInfo']
        });

        invoice.status = 1;
        invoice.paymentMethod = "VNPay";
        invoice.transactionCode = orderId;
        await invoice.save();

        res.status(200).json({ success: true, paymentUrl: finalRedirectUrl, transactionId: transaction._id });
    } catch (error) {
        console.error("Lỗi tạo VNPay:", error);
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

exports.vnpayIpn = async (req, res) => {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];
        const receivedAt = new Date().toISOString();

        console.log('[VNPAY_IPN] Received', {
            receivedAt,
            txnRef: vnp_Params['vnp_TxnRef'],
            responseCode: vnp_Params['vnp_ResponseCode'],
            transactionStatus: vnp_Params['vnp_TransactionStatus'],
            transactionNo: vnp_Params['vnp_TransactionNo'],
            bankCode: vnp_Params['vnp_BankCode'],
            amount: Number(vnp_Params['vnp_Amount'] || 0) / 100,
        });

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);

        const secretKey = process.env.VNPAY_SECRET_KEY;
        if (!secretKey) {
            return res.status(503).json({ RspCode: '99', Message: 'VNPay chưa được cấu hình' });
        }
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let orderId = vnp_Params['vnp_TxnRef'];
            let rspCode = vnp_Params['vnp_ResponseCode'];
            let amount = parseInt(vnp_Params['vnp_Amount'], 10) / 100;

            let transaction = await Transaction.findOne({ orderCode: orderId, method: "VNPay" });
            if (!transaction) {
                console.warn('[VNPAY_IPN] Rejected: transaction not found', { orderId });
                return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }

            if (transaction.amount !== amount) {
                console.warn('[VNPAY_IPN] Rejected: invalid amount', {
                    orderId,
                    expectedAmount: transaction.amount,
                    receivedAmount: amount,
                });
                return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
            }

            if (transaction.status === 1) {
                console.info('[VNPAY_IPN] Idempotent response: already confirmed', { orderId });
                return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
            }

            if (rspCode === '00' && vnp_Params['vnp_TransactionStatus'] === '00') {
                const invoice = await Invoice.findById(transaction.invoiceId).populate({
                    path: 'contractId',
                    select: 'tenantId',
                });
                const nguoiThueId = invoice?.contractId?.tenantId?.toString();

                if (!invoice || !nguoiThueId) {
                    console.error('[VNPAY_IPN] Rejected: invoice is not linked to NGUOI_THUE', {
                        orderId,
                        invoiceId: transaction.invoiceId?.toString(),
                    });
                    return res.status(200).json({ RspCode: '01', Message: 'Invoice owner not found' });
                }

                transaction.status = 1;
                transaction.gatewayReference = vnp_Params['vnp_TransactionNo'];
                transaction.paidAt = new Date();
                await transaction.save();

                invoice.status = 2; // Đã thanh toán
                await invoice.save();
                await notifyLandlord({
                    event: 'invoice_paid',
                    contractId: invoice.contractId,
                    entityId: invoice._id,
                });

                console.info('[VNPAY_IPN] Payment confirmed and invoice updated', {
                    orderId,
                    invoiceId: invoice._id.toString(),
                    nguoiThueId,
                    amount,
                    gatewayReference: transaction.gatewayReference,
                });
            } else {
                transaction.status = 0; // Failed
                await transaction.save();
                console.warn('[VNPAY_IPN] Payment failed or cancelled', {
                    orderId,
                    responseCode: rspCode,
                    transactionStatus: vnp_Params['vnp_TransactionStatus'],
                });
            }

            return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
        } else {
            console.warn('[VNPAY_IPN] Rejected: invalid signature', {
                txnRef: vnp_Params['vnp_TxnRef'],
            });
            return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
        }
    } catch (error) {
        console.error("[VNPAY_IPN] Unexpected error", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
    }
};
