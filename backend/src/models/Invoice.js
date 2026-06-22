const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: false },
    period: { type: String, required: true }, // ky_hoa_don (VD: '05/2026')
    dueDate: { type: Date },                  // han_thanh_toan
    totalAmount: { type: Number },            // tong_tien
    status: { type: Number, default: 0 },     // 0: Nháp, 1: Chưa TT, 2: Đã TT, 3: Quá hạn
    remindCount: { type: Number, default: 0 },

    // Các trường phẳng lưu dữ liệu đồng bộ trực tiếp từ Frontend
    room: { type: String, default: "" },
    tenant: { type: String, default: "" },
    fromDate: { type: String, default: "" },
    toDate: { type: String, default: "" },
    roomAmount: { type: Number, default: 0 },
    electricityOld: { type: Number, default: 0 },
    electricityNew: { type: Number, default: 0 },
    electricity: { type: Number, default: 0 },
    waterOld: { type: Number, default: 0 },
    waterNew: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    services: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    penaltyDays: { type: Number, default: 0 },
    penaltyRate: { type: Number, default: 0.1 },
    penalty: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    transactionCode: { type: String, default: "" },
    
    // Gộp bảng CHI_TIET_HOA_DON vào mảng này:
    details: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        oldIndex: { type: Number, default: null }, // chi_so_cu
        newIndex: { type: Number, default: null }, // chi_so_moi
        quantity: { type: Number },                // so_luong
        appliedPrice: { type: Number },            // don_gia_ap_dung
        amount: { type: Number }                   // thanh_tien
    }]
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);