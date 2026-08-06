const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },               // ten_dich_vu (Điện, Nước, Wifi...)
    code: { type: String, trim: true, uppercase: true },
    type: { type: Number, enum: [1, 2], required: true }, // 1: Tính theo chỉ số, 2: Tính khoán
    billingMode: { type: String, enum: ['FIXED', 'QUANTITY', 'METER'] },
    unit: { type: String, required: true },               // don_vi (kWh, Khối, Tháng)
    defaultPrice: { type: Number, required: true },       // don_gia_mac_dinh
    defaultQuantity: { type: Number, min: 0, default: 1 },
    // Giữ optional ở schema để bản ghi legacy vẫn đọc được; API Admin luôn gán trường này khi tạo mới.
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // ma_chu_tro
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

serviceSchema.index(
    { landlordId: 1, code: 1 },
    {
        unique: true,
        partialFilterExpression: { code: { $type: 'string' } }
    }
);

module.exports = mongoose.model('Service', serviceSchema);
