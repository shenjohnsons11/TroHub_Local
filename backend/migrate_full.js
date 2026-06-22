require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Account = require("./src/models/Account");
const Room = require("./src/models/Room");
const Contract = require("./src/models/Contract");
const Invoice = require("./src/models/Invoice");
const RepairRequest = require("./src/models/RepairRequest");
const Transaction = require("./src/models/Transaction");

async function migrate() {
  try {
    console.log("⏳ Đang kết nối tới MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trohub");
    console.log("✅ Kết nối MongoDB thành công!");

    console.log("🗑️ Đang dọn dẹp cấu trúc cũ...");
    await Account.deleteMany({});
    await Room.deleteMany({});
    await Contract.deleteMany({});
    await Invoice.deleteMany({});
    await RepairRequest.deleteMany({});
    await Transaction.deleteMany({});

    console.log("🔑 Đang tạo tài khoản Admin & Tenant...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    const admin = await Account.create({
      username: "admin@trohub.vn",
      password: hashedPassword,
      fullName: "Nguyễn Chủ Trọ",
      phone: "0901234567",
      email: "admin@trohub.vn",
      role: 1, // Chủ trọ
      status: 1
    });

    const tenantAccount = await Account.create({
      username: "tenant@trohub.vn",
      password: hashedPassword,
      fullName: "Nguyễn Văn A",
      phone: "0987654321",
      email: "tenant@trohub.vn",
      idCard: "079012345678",
      role: 2, // Khách thuê
      status: 1
    });

    console.log("🏠 Đang tạo Phòng trọ (Rooms)...");
    const roomA101 = await Room.create({
      roomCode: "A101",
      area: "25",
      defaultRentPrice: 2500000,
      defaultDeposit: 2500000,
      status: 1, // Đang thuê
      landlordId: admin._id
    });

    const roomA102 = await Room.create({
      roomCode: "A102",
      area: "20",
      defaultRentPrice: 2000000,
      defaultDeposit: 2000000,
      status: 0, // Trống
      landlordId: admin._id
    });

    console.log("📜 Đang tạo Hợp đồng (Contracts)...");
    const contract = await Contract.create({
      roomId: roomA101._id,
      tenantId: tenantAccount._id,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      fixedRentPrice: 2500000,
      fixedDeposit: 2500000,
      status: 1 // Hiệu lực
    });

    console.log("🧾 Đang tạo Hóa đơn (Invoices)...");
    await Invoice.create({
      invoiceCode: "HD0526-A101",
      contractId: contract._id,
      period: "05/2026",
      oldElectricityIndex: 1270,
      newElectricityIndex: 1350,
      oldWaterIndex: 50,
      newWaterIndex: 57,
      totalAmount: 3235000, // Tiền phòng + Điện nước
      dueDate: new Date("2026-06-05"),
      status: 0 // Chưa thanh toán
    });

    console.log("🔧 Đang tạo Yêu cầu sửa chữa (Repairs)...");
    await RepairRequest.create({
      repairCode: "YC0501",
      contractId: contract._id,
      title: "Hư bóng đèn",
      content: "Bóng đèn nhà vệ sinh bị cháy từ hôm qua.",
      priority: 1, // Vừa
      status: 0 // Mới
    });

    console.log("🎉 MIGRATION HOÀN TẤT! Dữ liệu đã khớp 100% với Backend mới!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi Migration:", error);
    process.exit(1);
  }
}

migrate();
