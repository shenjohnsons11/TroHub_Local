const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    amount: { type: Number, required: true }, // so_tien
    method: { type: String },                 // phuong_thuc (VNPay, Momo...)
    status: { type: Number, enum: [0, 1], default: 1 }, // 0: Thất bại, 1: Thành công
    gatewayReference: { type: String }        // ma_tham_chieu_gateway
}, { timestamps: true }); // Tự động có createdAt làm thoi_gian_giao_dich

module.exports = mongoose.model('Transaction', transactionSchema);