const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Account = require('../models/Account');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const Transaction = require('../models/Transaction');

router.get('/', async (req, res) => {
  try {
    await Account.deleteMany({});
    await Room.deleteMany({});
    await Contract.deleteMany({});
    await Invoice.deleteMany({});
    await RepairRequest.deleteMany({});
    await Transaction.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    const admin = await Account.create({
      username: "admin@trohub.vn", password: hashedPassword, fullName: "Nguyễn Chủ Trọ", phone: "0901234567", email: "admin@trohub.vn", role: 1, status: 1
    });

    const tenantAccount = await Account.create({
      username: "tenant@trohub.vn", password: hashedPassword, fullName: "Nguyễn Văn A", phone: "0987654321", email: "tenant@trohub.vn", idCard: "079012345678", role: 2, status: 1
    });

    const roomA101 = await Room.create({
      roomCode: "A101", area: "25", defaultRentPrice: 2500000, defaultDeposit: 2500000, status: 1, landlordId: admin._id
    });

    const roomA102 = await Room.create({
      roomCode: "A102", area: "20", defaultRentPrice: 2000000, defaultDeposit: 2000000, status: 0, landlordId: admin._id
    });

    const contract = await Contract.create({
      roomId: roomA101._id, tenantId: tenantAccount._id, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), fixedRentPrice: 2500000, fixedDeposit: 2500000, status: 1
    });

    await Invoice.create({
      invoiceCode: "HD0526-A101", contractId: contract._id, period: "05/2026", oldElectricityIndex: 1270, newElectricityIndex: 1350, oldWaterIndex: 50, newWaterIndex: 57, totalAmount: 3235000, dueDate: new Date("2026-06-05"), status: 0
    });

    await RepairRequest.create({
      repairCode: "YC0501", contractId: contract._id, title: "Hư bóng đèn", content: "Bóng đèn nhà vệ sinh bị cháy từ hôm qua.", priority: 1, status: 0
    });

    res.send("<h1>🎉 MIGRATION HOÀN TẤT!</h1><p>Dữ liệu đã được nạp thành công vào MongoDB của bạn. Hãy quay lại trang Web và refresh!</p>");
  } catch (error) {
    res.send("<h1>❌ LỖI:</h1><p>" + error.message + "</p>");
  }
});

module.exports = router;
