const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 1. Import Models
const Room = require('./src/models/Room');
const Service = require('./src/models/Service');

dotenv.config();

// 2. Tạo một ID Chủ trọ giả định (Bắt buộc phải có vì landlordId là required: true)
const dummyLandlordId = new mongoose.Types.ObjectId();

// 3. Dữ liệu Dịch vụ chuẩn theo schema Service.js
const sampleServices = [
    // type 1: Tính theo chỉ số, type 2: Tính khoán
    { name: "Điện", type: 1, unit: "kWh", defaultPrice: 4000, landlordId: dummyLandlordId },
    { name: "Nước", type: 1, unit: "Khối", defaultPrice: 20000, landlordId: dummyLandlordId },
    { name: "Wifi", type: 2, unit: "Tháng", defaultPrice: 100000, landlordId: dummyLandlordId },
    { name: "Rác & Vệ sinh", type: 2, unit: "Tháng", defaultPrice: 30000, landlordId: dummyLandlordId }
];

// 4. Hàm sinh dữ liệu Phòng trọ chuẩn theo schema Room.js
const generateFakeRooms = (count) => {
    const rooms = [];
    for (let i = 1; i <= count; i++) {
        // Sinh giá tiền ngẫu nhiên từ 2tr - 5tr và làm tròn cho đẹp (ví dụ: 2,500,000)
        const randomPrice = Math.floor(Math.random() * (5000000 - 2000000 + 1)) + 2000000;
        const rentPrice = Math.round(randomPrice / 100000) * 100000;

        // Trộn ngẫu nhiên trạng thái: 0 (Trống), 1 (Đang thuê), 2 (Đang sửa)
        let roomStatus = 0;
        if (i % 3 === 0) roomStatus = 1;
        if (i % 7 === 0) roomStatus = 2;

        rooms.push({
            roomCode: `P.${100 + i}`, // Ví dụ: P.101, P.102
            area: `${Math.floor(Math.random() * (40 - 15 + 1)) + 15}m2`, // Kiểu String (ví dụ: "25m2")
            defaultRentPrice: rentPrice,
            defaultDeposit: rentPrice, // Thường mặc định cọc 1 tháng tiền nhà
            status: roomStatus,
            landlordId: dummyLandlordId // Gắn ID chủ trọ ảo vào
        });
    }
    return rooms;
};

// 5. Khởi chạy tiến trình
const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🟢 Đã kết nối MongoDB thành công...");

        // Xóa sạch dữ liệu cũ để tránh trùng lặp roomCode (vì unique: true)
        await Room.deleteMany();
        await Service.deleteMany();
        console.log("🗑️ Đã dọn dẹp sạch dữ liệu cũ trong bảng Room và Service!");

        // Đổ dữ liệu mới
        await Service.insertMany(sampleServices);
        console.log("✨ Đã nạp danh sách Dịch vụ mẫu!");

        const fakeRooms = generateFakeRooms(30); // Tạo ra 20 phòng mẫu
        await Room.insertMany(fakeRooms);
        console.log(`✨ Đã nạp thành công ${fakeRooms.length} phòng trọ mẫu!`);

        console.log("🎉 SEED DỮ LIỆU THÀNH CÔNG RỰC RỠ!");
        process.exit(0);
    } catch (error) {
        console.error(`🔴 Lỗi nạp dữ liệu: ${error.message}`);
        process.exit(1);
    }
};

importData();