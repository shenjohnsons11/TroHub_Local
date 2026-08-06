const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    fixedRentPrice: { type: Number, required: true }, // gia_thue_chot
    fixedDeposit: { type: Number, required: true },   // tien_coc_chot
    electricityPrice: { type: Number, min: 0 },
    waterPrice: { type: Number, min: 0 },
    initialElectricity: { type: Number, min: 0 },
    initialWater: { type: Number, min: 0 },
    tenantConfirmedAt: { type: Date },                // thoi_gian_nguoi_thue_xac_nhan
    lastSentAt: { type: Date },
    unpaidAmount: { type: Number, min: 0, default: 0 },
    checkoutRequestedAt: Date,
    status: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 }, // 0: Chờ ký, 1: Hiệu lực, 2: Đã kết thúc, 3: Hủy, 4: Chờ chủ duyệt, 5: Chờ duyệt trả phòng
    checkoutSettlement: {
        electricityOld: Number,
        electricityNew: Number,
        electricityPrice: Number,
        electricityUsage: Number,
        electricityAmount: Number,
        waterOld: Number,
        waterNew: Number,
        waterPrice: Number,
        waterUsage: Number,
        waterAmount: Number,
        utilitiesAmount: Number,
        depositAmount: Number,
        unpaidAmount: Number,
        damageAmount: Number,
        totalDebt: Number,
        deductionAmount: Number,
        refundAmount: Number,
        amountDue: Number,
        finalInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        note: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        approvedAt: Date,
    },
    
    // Tuyệt chiêu Nhúng dữ liệu: Gộp bảng HOP_DONG_DICH_VU vào đây
    services: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        fixedPrice: { type: Number } // don_gia_chot lúc ký
    }]
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
