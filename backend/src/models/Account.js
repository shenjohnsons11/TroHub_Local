const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true }, // ho_ten
    phone: { type: String, required: true },    // sdt
    email: { type: String },
    idCard: { type: String },                   // cccd
    role: { type: Number, enum: [1, 2], required: true }, // 1: Chủ trọ, 2: Người thuê
    status: { type: Number, enum: [0, 1], default: 1 },    // 0: Inactive, 1: Active
    linkedLandlords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }] // Mảng ID các chủ trọ liên kết
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);