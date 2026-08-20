const Account = require('../models/Account');
const bcrypt = require('bcryptjs');

// 1. Lấy thông tin chủ trọ (cài đặt)
exports.getSettings = async (req, res) => {
    try {
        const landlord = await Account.findOne({ _id: req.auth.id, role: 1 });
        if (!landlord) {
            return res.status(200).json({ success: true, data: { name: 'Chủ trọ', phone: '', email: '', propertyAddress: '' } });
        }
        res.status(200).json({
            success: true,
            data: {
                id: landlord._id,
                name: landlord.fullName,
                phone: landlord.phone,
                email: landlord.email || '',
                propertyAddress: landlord.propertyAddress || '',
                bankId: landlord.bankId || '',
                bankAccountNo: landlord.bankAccountNo || '',
                bankAccountName: landlord.bankAccountName || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// 2. Cập nhật thông tin chủ trọ
exports.updateSettings = async (req, res) => {
    try {
        const { name, phone, email, password, propertyAddress, bankId, bankAccountNo, bankAccountName } = req.body;
        const landlord = await Account.findOne({ _id: req.auth.id, role: 1 });
        if (!landlord) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản chủ trọ!' });
        }
        if (name) landlord.fullName = name;
        if (phone) landlord.phone = phone;
        if (email) landlord.email = email;
        if (propertyAddress !== undefined) landlord.propertyAddress = String(propertyAddress || '').trim();
        if (bankId !== undefined) landlord.bankId = bankId;
        if (bankAccountNo !== undefined) landlord.bankAccountNo = bankAccountNo;
        if (bankAccountName !== undefined) landlord.bankAccountName = bankAccountName;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            landlord.password = await bcrypt.hash(password, salt);
        }
        await landlord.save();
        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin thành công!',
            data: { 
                id: landlord._id, name: landlord.fullName, phone: landlord.phone, email: landlord.email || '',
                propertyAddress: landlord.propertyAddress || '',
                bankId: landlord.bankId || '', bankAccountNo: landlord.bankAccountNo || '', bankAccountName: landlord.bankAccountName || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

