const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    method: {
        type: String,
        default: 'vietqr'
    },

    // 0: Thất bại, 1: Thành công, 2: Đang chờ thanh toán, 3: Đã hủy
    status: {
        type: Number,
        enum: [0, 1, 2, 3],
        default: 2
    },

    // Mã giao dịch riêng để đối chiếu với nội dung chuyển khoản
    orderCode: {
        type: String,
        unique: true,
        sparse: true
    },

    // Nội dung chuyển khoản, ví dụ: TROHUB_HD_123456
    description: {
        type: String
    },

    // Link ảnh QR VietQR
    qrUrl: {
        type: String
    },

    // Mã giao dịch từ ngân hàng / cổng thanh toán
    gatewayReference: {
        type: String
    },

    paidAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);