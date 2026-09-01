const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true }, // ho_ten
    phone: { type: String, required: true, trim: true, unique: true, sparse: true },    // sdt
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    idCard: { type: String },                   // cccd
    role: { type: Number, enum: [1, 2], required: true }, // 1: Chủ trọ, 2: Người thuê
    status: { type: Number, enum: [0, 1], default: 1 },    // 0: Inactive, 1: Active
    linkedLandlords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }], // Mảng ID các chủ trọ liên kết
    pendingLandlords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }], // Mảng ID các chủ trọ gửi lời mời chưa được chấp nhận
    mustChangePassword: { type: Boolean, default: false }, // Yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetOtpSentAt: { type: Date, select: false },
    passwordResetNonce: { type: String, select: false },
    passwordChangedAt: { type: Date, default: null },
    bankId: { type: String, default: "" }, // Tên rút gọn ngân hàng (VD: VCB, MB, TCB)
    bankAccountNo: { type: String, default: "" }, // Số tài khoản
    bankAccountName: { type: String, default: "" }, // Tên chủ tài khoản
    propertyAddress: { type: String, trim: true, default: "" },
    propertyLatitude: { type: Number },
    propertyLongitude: { type: Number },
    landlordSignature: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
