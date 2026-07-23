const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceCode: { type: String, trim: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: false },
    period: { type: String, required: true }, // ky_hoa_don (VD: '05/2026')
    dueDate: { type: Date },                  // han_thanh_toan
    totalAmount: { type: Number },            // tong_tien
    status: { type: Number, default: 0 },     // 0: Nháp, 1: Chưa TT, 2: Đã TT, 3: Quá hạn
    remindCount: { type: Number, default: 0 },
    issuedAt: { type: Date },
    graceDaysSnapshot: { type: Number, min: 0 },
    penaltyRateSnapshot: { type: Number, min: 0 },
    overdueAt: { type: Date },
    penaltyBaseAmount: { type: Number, min: 0 },
    penaltyAppliedAt: { type: Date, default: null },

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
    services: { type: Number, default: 0 }, // Tổng hoặc phụ phí khác
    parking: { type: Number, default: 0 },
    internet: { type: Number, default: 0 },
    garbage: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    penaltyDays: { type: Number, default: 0 },
    penaltyRate: { type: Number, default: 0.1 },
    penalty: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    transactionCode: { type: String, default: "" },
    note: { type: String, default: "" },
    
    // Gộp bảng CHI_TIET_HOA_DON vào mảng này:
    details: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        serviceName: { type: String },
        serviceCode: { type: String },
        billingMode: { type: String, enum: ['FIXED', 'QUANTITY', 'METER'] },
        unit: { type: String },
        oldIndex: { type: Number, default: null }, // chi_so_cu
        newIndex: { type: Number, default: null }, // chi_so_moi
        quantity: { type: Number },                // so_luong
        appliedPrice: { type: Number },            // don_gia_ap_dung
        amount: { type: Number }                   // thanh_tien
    }]
}, { timestamps: true });

invoiceSchema.index(
    { contractId: 1, period: 1 },
    {
        unique: true,
        partialFilterExpression: {
            period: "Tiền cọc",
            contractId: { $type: "objectId" }
        }
    }
);
invoiceSchema.index(
    { invoiceCode: 1 },
    {
        unique: true,
        partialFilterExpression: { invoiceCode: { $type: 'string' } }
    }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
