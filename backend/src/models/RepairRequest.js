const mongoose = require('mongoose');

const repairRequestSchema = new mongoose.Schema({
    // Đổi roomId và tenantId thành contractId theo chuẩn ERD
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true }, 
    title: { type: String, required: true },          // tieu_de
    content: { type: String, required: true },        // noi_dung
    priority: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // muc_do (0-Chưa phân loại, 1-Thấp, 2-Vừa, 3-Gấp)
    status: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0-Mới, 1-Đang xử lý, 2-Hoàn tất, 3-Hủy
    landlordNote: { type: String },                   // ghi_chu_xu_ly
    images: [{ type: String }]                        // danh_sach_anh_minh_chung
}, { timestamps: true });

module.exports = mongoose.model('RepairRequest', repairRequestSchema);