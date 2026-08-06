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

    const tenant1 = await Account.create({
      username: "tenant1@trohub.vn", password: hashedPassword, fullName: "Nguyễn Văn Một", phone: "0987654321", email: "tenant1@trohub.vn", idCard: "079012345671", role: 2, status: 1
    });
    
    const tenant2 = await Account.create({
      username: "tenant2@trohub.vn", password: hashedPassword, fullName: "Trần Thị Hai", phone: "0987654322", email: "tenant2@trohub.vn", idCard: "079012345672", role: 2, status: 1
    });

    const tenant3 = await Account.create({
      username: "tenant3@trohub.vn", password: hashedPassword, fullName: "Lê Văn Ba", phone: "0987654323", email: "tenant3@trohub.vn", idCard: "079012345673", role: 2, status: 1
    });

    const roomA101 = await Room.create({
      roomCode: "A101", area: "25", defaultRentPrice: 2500000, defaultDeposit: 2500000, status: 1, landlordId: admin._id
    });

    const roomA102 = await Room.create({
      roomCode: "A102", area: "20", defaultRentPrice: 2000000, defaultDeposit: 2000000, status: 1, landlordId: admin._id
    });
    
    const roomA103 = await Room.create({
      roomCode: "A103", area: "30", defaultRentPrice: 3000000, defaultDeposit: 3000000, status: 1, landlordId: admin._id
    });

    const contract1 = await Contract.create({
      roomId: roomA101._id, tenantId: tenant1._id, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), fixedRentPrice: 2500000, fixedDeposit: 2500000, status: 1
    });
    
    const contract2 = await Contract.create({
      roomId: roomA102._id, tenantId: tenant2._id, startDate: new Date("2026-02-01"), endDate: new Date("2027-01-31"), fixedRentPrice: 2000000, fixedDeposit: 2000000, status: 1
    });
    
    const contract3 = await Contract.create({
      roomId: roomA103._id, tenantId: tenant3._id, startDate: new Date("2026-03-01"), endDate: new Date("2027-02-28"), fixedRentPrice: 3000000, fixedDeposit: 3000000, status: 1
    });

    await Invoice.create({
      invoiceCode: "HD0526-A101", contractId: contract1._id, period: "05/2026", electricityNew: 1350, waterNew: 57, totalAmount: 3235000, dueDate: new Date("2026-06-05"), status: 2
    });
    await Invoice.create({
      invoiceCode: "HD0526-A102", contractId: contract2._id, period: "05/2026", electricityNew: 800, waterNew: 30, totalAmount: 2235000, dueDate: new Date("2026-06-05"), status: 1 // Đang nợ
    });
    await Invoice.create({
      invoiceCode: "HD0526-A103", contractId: contract3._id, period: "05/2026", electricityNew: 2100, waterNew: 85, totalAmount: 4235000, dueDate: new Date("2026-06-05"), status: 2
    });

    await RepairRequest.create({
      repairCode: "YC0501", tenantId: tenant1._id, contractId: contract1._id, title: "Hư bóng đèn", content: "Bóng đèn nhà vệ sinh bị cháy từ hôm qua.", priority: 1, status: 0
    });

    res.send("<h1>🎉 MIGRATION HOÀN TẤT!</h1><p>Dữ liệu đã được nạp thành công vào MongoDB của bạn. Hãy quay lại trang Web và refresh!</p>");
  } catch (error) {
    res.send("<h1>❌ LỖI:</h1><p>" + error.message + "</p>");
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const admin = await Account.findOne({ role: 1 });
    if (!admin) return res.send("<h1>❌ LỖI:</h1><p>Không tìm thấy Chủ trọ</p>");
    
    await Room.create([
      { roomCode: 'A104', area: '20', defaultRentPrice: 2000000, defaultDeposit: 2000000, status: 0, landlordId: admin._id },
      { roomCode: 'A105', area: '25', defaultRentPrice: 2500000, defaultDeposit: 2500000, status: 0, landlordId: admin._id },
      { roomCode: 'A106', area: '30', defaultRentPrice: 3000000, defaultDeposit: 3000000, status: 0, landlordId: admin._id },
      { roomCode: 'B101', area: '20', defaultRentPrice: 2000000, defaultDeposit: 2000000, status: 0, landlordId: admin._id },
      { roomCode: 'B102', area: '25', defaultRentPrice: 2500000, defaultDeposit: 2500000, status: 0, landlordId: admin._id }
    ]);
    res.send("<h1>🎉 THÊM 5 PHÒNG TRỐNG THÀNH CÔNG!</h1><p>Hãy quay lại trang Web và refresh!</p>");
  } catch (error) {
    res.send("<h1>❌ LỖI:</h1><p>" + error.message + "</p>");
  }
});

router.get('/fix-transactions', async (req, res) => {
  try {
    const paidInvoices = await Invoice.find({ status: 2 });
    let count = 0;
    for (const inv of paidInvoices) {
      const existing = await Transaction.findOne({ invoiceId: inv._id });
      if (!existing) {
        await Transaction.create({
          invoiceId: inv._id,
          amount: inv.totalAmount || 0,
          method: inv.paymentMethod || 'QR ngân hàng',
          status: 1,
          gatewayReference: inv.transactionCode || `TXN${Date.now().toString().slice(-6)}`
        });
        count++;
      }
    }
    res.send(`<h1>🎉 ĐÃ TẠO ${count} TRANSACTIONS BỊ THIẾU!</h1>`);
  } catch (error) {
    res.send(`<h1>❌ LỖI:</h1><p>${error.message}</p>`);
  }
});

router.get('/check', async (req, res) => {
  const invs = await Invoice.countDocuments();
  const txs = await Transaction.countDocuments();
  const accs = await Account.countDocuments();
  const paidInvs = await Invoice.countDocuments({ status: 2 });
  res.send(`Invoices: ${invs}, Paid Invoices: ${paidInvs}, Transactions: ${txs}, Accounts: ${accs}`);
});

router.get('/cleanup-linked-landlords', async (req, res) => {
  try {
    const accounts = await Account.find({ role: 2 });
    let updatedCount = 0;
    for (const acc of accounts) {
      if (acc.linkedLandlords && acc.linkedLandlords.length > 0) {
        // Lọc trùng lặp dựa trên string của ObjectId
        const uniqueIds = [];
        const seen = new Set();
        for (const id of acc.linkedLandlords) {
          const strId = id.toString();
          if (!seen.has(strId)) {
            seen.add(strId);
            uniqueIds.push(id);
          }
        }
        if (uniqueIds.length !== acc.linkedLandlords.length) {
          acc.linkedLandlords = uniqueIds;
          await acc.save();
          updatedCount++;
        }
      }
    }
    res.send(`<h1>🎉 ĐÃ DỌN DẸP ID TRÙNG LẶP CHO ${updatedCount} TÀI KHOẢN NGƯỜI THUÊ!</h1>`);
  } catch (error) {
    res.send(`<h1>❌ LỖI:</h1><p>${error.message}</p>`);
  }
});

router.get('/check-duplicates', async (req, res) => {
  const accs = await Account.find({ email: 'invite3@gmail.com' });
  res.json(accs);
});

module.exports = router;
