import mongoose from 'mongoose';
import { Room } from './src/models/Room.js';
import { User } from './src/models/User.js';
import { Contract } from './src/models/Contract.js';
import connectMongo from './src/config/dbMongo.js';

const seedData = async () => {
  await connectMongo();

  // Xóa dữ liệu cũ
  await Room.deleteMany({});
  await User.deleteMany({});
  await Contract.deleteMany({});

  // 1. Tạo Admin (Chủ trọ)
  const admin = new User({
    id: "U001",
    fullName: "Chủ Trọ Nguyễn",
    email: "admin@trohub.vn",
    password: "123",
    phone: "0901234567",
    role: "ADMIN"
  });
  await admin.save();

  // 2. Tạo 2 Khách Thuê (Tenants)
  const tenant1 = new User({
    id: "U002",
    fullName: "Trần Văn Khách",
    email: "khach1@gmail.com",
    password: "123",
    phone: "0987654321",
    role: "TENANT"
  });
  await tenant1.save();

  const tenant2 = new User({
    id: "U003",
    fullName: "Lê Thị Thuê",
    email: "khach2@gmail.com",
    password: "123",
    phone: "0912345678",
    role: "TENANT"
  });
  await tenant2.save();

  // 3. Tạo 3 Phòng (2 Đã Thuê, 1 Trống)
  const room1 = new Room({
    id: "R001",
    code: "P101",
    name: "Phòng 101 (Tầng 1)",
    areaM2: 25,
    rentPrice: 3000000,
    depositAmount: 3000000,
    maxOccupants: 3,
    status: "OCCUPIED"
  });
  await room1.save();

  const room2 = new Room({
    id: "R002",
    code: "P102",
    name: "Phòng 102 (Tầng 1)",
    areaM2: 30,
    rentPrice: 3500000,
    depositAmount: 3500000,
    maxOccupants: 4,
    status: "OCCUPIED"
  });
  await room2.save();

  const room3 = new Room({
    id: "R003",
    code: "P201",
    name: "Phòng 201 (Tầng 2)",
    areaM2: 20,
    rentPrice: 2500000,
    depositAmount: 2500000,
    maxOccupants: 2,
    status: "AVAILABLE"
  });
  await room3.save();

  // 4. Tạo Hợp Đồng cho Phòng 101 và 102
  const contract1 = new Contract({
    id: "C001",
    code: "HD-101",
    roomId: room1.id,
    landlordUserId: admin.id,
    tenantUserId: tenant1.id,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    rentPrice: 3000000,
    depositAmount: 3000000,
    status: "ACTIVE"
  });
  await contract1.save();

  const contract2 = new Contract({
    id: "C002",
    code: "HD-102",
    roomId: room2.id,
    landlordUserId: admin.id,
    tenantUserId: tenant2.id,
    startDate: "2026-03-01",
    endDate: "2027-03-01",
    rentPrice: 3500000,
    depositAmount: 3500000,
    status: "ACTIVE"
  });
  await contract2.save();

  console.log("✅ Seed dữ liệu thành công!");
  console.log("Tài khoản Chủ trọ: admin@trohub.vn / 123");
  console.log("Tài khoản Khách 1 (Phòng 101): khach1@gmail.com / 123");
  console.log("Tài khoản Khách 2 (Phòng 102): khach2@gmail.com / 123");
  process.exit(0);
};

seedData().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
