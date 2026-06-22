const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true }, // so_phong (Mã phòng)
    area: { type: String },                                   // dien_tich
    defaultRentPrice: { type: Number, required: true },       // gia_thue_mac_dinh
    defaultDeposit: { type: Number, required: true },         // gia_coc_mac_dinh
    status: { type: Number, enum: [0, 1, 2], default: 0 },    // 0: Trống, 1: Đang thuê, 2: Đang sửa
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true } // ma_chu_tro
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);