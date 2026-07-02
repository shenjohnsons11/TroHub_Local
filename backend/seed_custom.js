require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Account = require('./src/models/Account');
const Room = require('./src/models/Room');

async function seedData() {
    try {
        console.log('Connecting to MongoDB:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB successfully!');

        // 1. Tạo 1 tài khoản Admin
        const adminEmail = "admin2@trohub.vn";
        const passwordHash = await bcrypt.hash("Trohub123456", 10);
        
        let admin = await Account.findOne({ username: adminEmail });
        if (!admin) {
            admin = await Account.create({
                username: adminEmail,
                email: adminEmail,
                password: passwordHash,
                fullName: "Chủ Trọ Nguyễn",
                phone: "0909999999",
                idCard: "079012345678",
                role: 1, // Chủ trọ
                status: 1
            });
            console.log(`Đã tạo tài khoản Admin: ${adminEmail}`);
        } else {
            console.log(`Admin ${adminEmail} đã tồn tại.`);
        }

        // 2. Tạo một số phòng thuộc về Admin
        const roomsToCreate = [
            { roomCode: 'C101', area: '25', defaultRentPrice: 2500000, defaultDeposit: 2500000, status: 0, landlordId: admin._id },
            { roomCode: 'C102', area: '20', defaultRentPrice: 2000000, defaultDeposit: 2000000, status: 0, landlordId: admin._id },
            { roomCode: 'C103', area: '30', defaultRentPrice: 3500000, defaultDeposit: 3500000, status: 0, landlordId: admin._id }
        ];

        for (const roomData of roomsToCreate) {
            const existingRoom = await Room.findOne({ roomCode: roomData.roomCode, landlordId: admin._id });
            if (!existingRoom) {
                await Room.create(roomData);
                console.log(`Đã tạo phòng: ${roomData.roomCode}`);
            }
        }

        // 3. Tạo 3 tài khoản khách thuê
        const tenants = [
            { email: "khach1@trohub.vn", name: "Khách Thuê Một", phone: "0911111111" },
            { email: "khach2@trohub.vn", name: "Khách Thuê Hai", phone: "0922222222" },
            { email: "khach3@trohub.vn", name: "Khách Thuê Ba", phone: "0933333333" }
        ];

        for (const tenantData of tenants) {
            const existingTenant = await Account.findOne({ username: tenantData.email });
            if (!existingTenant) {
                await Account.create({
                    username: tenantData.email,
                    email: tenantData.email,
                    password: passwordHash,
                    fullName: tenantData.name,
                    phone: tenantData.phone,
                    idCard: "079000" + tenantData.phone,
                    role: 2, // Người thuê
                    status: 1
                });
                console.log(`Đã tạo tài khoản khách thuê: ${tenantData.email}`);
            } else {
                console.log(`Khách thuê ${tenantData.email} đã tồn tại.`);
            }
        }

        console.log('Seed hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi seed data:', error);
        process.exit(1);
    }
}

seedData();
