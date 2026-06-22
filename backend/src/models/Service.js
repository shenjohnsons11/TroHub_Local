const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },               // ten_dich_vu (Điện, Nước, Wifi...)
    type: { type: Number, enum: [1, 2], required: true }, // 1: Tính theo chỉ số, 2: Tính khoán
    unit: { type: String, required: true },               // don_vi (kWh, Khối, Tháng)
    defaultPrice: { type: Number, required: true },       // don_gia_mac_dinh
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' } // ma_chu_tro
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);