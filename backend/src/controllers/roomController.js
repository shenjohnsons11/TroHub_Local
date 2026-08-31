const Room = require('../models/Room');

function normalizeFloor(value) {
    const floor = Number(value === undefined ? 1 : value);
    if (!Number.isInteger(floor) || floor < 1) {
        const error = new Error('Tầng phải là số nguyên từ 1 trở lên.');
        error.code = 'INVALID_ROOM_FLOOR';
        throw error;
    }
    return floor;
}

// 1. Lấy danh sách toàn bộ phòng (Có thể lọc theo mã chủ trọ)
exports.getAllRooms = async (req, res) => {
    try {
        let landlordId = req.query.landlordId;
        const authHeader = req.headers['authorization'];
        if (!landlordId && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }
        
        let query = {};
        if (landlordId) query.landlordId = landlordId;

        const rooms = await Room.find(query).lean().sort({ floor: 1, roomCode: 1 });
        
        // Populate tenant from active contracts
        const Contract = require('../models/Contract');
        const activeContracts = await Contract.find({ status: 1 }).populate('tenantId', 'fullName');
        
        for (let room of rooms) {
            room.floor = room.floor || 1;
            const contract = activeContracts.find(c => c.roomId && c.roomId.toString() === room._id.toString());
            if (contract && contract.tenantId) {
                room.tenant = contract.tenantId.fullName;
            }
        }

        res.status(200).json({
            success: true,
            message: "Lấy danh sách phòng thành công!",
            data: rooms
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 2. Thêm phòng trọ mới
exports.createRoom = async (req, res) => {
    try {
        let { roomCode, area, defaultRentPrice, defaultDeposit, landlordId, rent, deposit, floor } = req.body;
        
        if (!roomCode || typeof roomCode !== 'string' || !roomCode.trim()) {
            return res.status(400).json({ success: false, message: "Mã phòng không được để trống!" });
        }

        // Hỗ trợ map field từ frontend gửi lên (rent, deposit)
        if (rent !== undefined) defaultRentPrice = rent;
        if (deposit !== undefined) defaultDeposit = deposit;

        if (defaultRentPrice === undefined || defaultRentPrice === null) {
            return res.status(400).json({ success: false, message: "Giá thuê phòng không được để trống!" });
        }

        if (!landlordId && req.auth?.id) {
            landlordId = req.auth.id;
        }

        // Kiểm tra xem mã phòng đã tồn tại chưa
        const existingRoom = await Room.findOne({ roomCode });
        if (existingRoom) {
            return res.status(400).json({ success: false, message: "Mã phòng này đã tồn tại trên hệ thống!" });
        }

        const newRoom = new Room({
            roomCode,
            area,
            defaultRentPrice,
            defaultDeposit,
            floor: normalizeFloor(floor),
            landlordId,
            status: 0 // 0: Trống (Mặc định khi mới tạo)
        });

        await newRoom.save();
        res.status(201).json({
            success: true,
            message: "Tạo phòng mới thành công!",
            data: newRoom
        });
    } catch (error) {
        if (error.code === 'INVALID_ROOM_FLOOR') {
            return res.status(400).json({ success: false, code: error.code, message: error.message });
        }
        res.status(500).json({ success: false, message: "Lỗi khi tạo phòng: " + error.message });
    }
};

// 3. Xem chi tiết một phòng (Có lấy luôn thông tin chủ trọ)
exports.getRoomById = async (req, res) => {
    try {
        // Dùng populate để kéo thông tin fullName và phone của chủ trọ từ bảng Account sang
        const room = await Room.findById(req.params.id).populate('landlordId', 'fullName phone');
        
        if (!room) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông tin phòng!" });
        }
        res.status(200).json({ success: true, data: room });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Cập nhật thông tin phòng (Sửa giá, sửa diện tích...)
exports.updateRoom = async (req, res) => {
    try {
        let updateData = { ...req.body };
        if (updateData.rent !== undefined) updateData.defaultRentPrice = updateData.rent;
        if (updateData.deposit !== undefined) updateData.defaultDeposit = updateData.deposit;
        if (updateData.floor !== undefined) updateData.floor = normalizeFloor(updateData.floor);

        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );
        
        if (!updatedRoom) {
            return res.status(404).json({ success: false, message: "Không tìm thấy phòng cần cập nhật!" });
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin phòng thành công!",
            data: updatedRoom
        });
    } catch (error) {
        if (error.code === 'INVALID_ROOM_FLOOR') {
            return res.status(400).json({ success: false, code: error.code, message: error.message });
        }
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật phòng: " + error.message });
    }
};

// 5. Xóa phòng trọ
exports.deleteRoom = async (req, res) => {
    try {
        const roomId = req.params.id;
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng cần xóa!' });
        }
        if (room.status === 1) {
            return res.status(400).json({ success: false, message: 'Không thể xóa phòng đang có người thuê!' });
        }

        // --- NEW LOGIC: Kiểm tra lịch sử tài chính ---
        const Contract = require('../models/Contract');
        const pastContracts = await Contract.findOne({ roomId: roomId });
        if (pastContracts) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa vì phòng này đã có lịch sử hợp đồng và hóa đơn cũ. Vui lòng đổi tên hoặc chuyển sang "Bảo trì" để không mất dữ liệu doanh thu!' 
            });
        }
        // ---------------------------------------------

        await Room.findByIdAndDelete(roomId);
        res.status(200).json({ success: true, message: "Xóa phòng thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 6. Chủ trọ lưu chỉ số điện nước từ AI scanner
exports.reportUtility = async (req, res) => {
    try {
        const { draftElectricity, draftWater } = req.body;
        const updateData = {};
        for (const [field, value] of Object.entries({ draftElectricity, draftWater })) {
            if (value === undefined || value === null || value === '') continue;
            const number = Number(value);
            if (!Number.isFinite(number) || number < 0) {
                return res.status(400).json({ success: false, message: 'Chỉ số điện nước phải là số hữu hạn không âm.' });
            }
            updateData[field] = number;
        }
        if (!Object.keys(updateData).length) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập ít nhất một chỉ số điện hoặc nước.' });
        }

        const updatedRoom = await Room.findOneAndUpdate(
            { _id: req.params.id, landlordId: req.auth.id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedRoom) {
            return res.status(404).json({ success: false, message: "Không tìm thấy phòng!" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Đã gửi số liệu điện nước cho chủ trọ chờ duyệt!", 
            data: updatedRoom 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

exports.reportBulkUtilities = async (req, res) => {
    try {
        const { utilities } = req.body;
        if (!utilities || !Array.isArray(utilities)) {
            return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
        }

        const Room = require('../models/Room');
        const normalizedUtilities = [];
        for (const item of utilities) {
            if (!item.roomId) continue;
            const updateData = {};
            for (const [field, value] of Object.entries({
                draftElectricity: item.draftElectricity,
                draftWater: item.draftWater,
            })) {
                if (value === undefined || value === null || value === '') continue;
                const number = Number(value);
                if (!Number.isFinite(number) || number < 0) {
                    return res.status(400).json({ success: false, message: 'Chỉ số điện nước phải là số hữu hạn không âm.' });
                }
                updateData[field] = number;
            }
            if (Object.keys(updateData).length > 0) normalizedUtilities.push({ roomId: item.roomId, updateData });
        }

        const updatePromises = normalizedUtilities.map(async ({ roomId, updateData }) => {
            await Room.findOneAndUpdate(
                { _id: roomId, landlordId: req.auth.id },
                { $set: updateData },
                { runValidators: true },
            );
        });

        await Promise.all(updatePromises);

        res.status(200).json({ success: true, message: "Đã lưu sổ điện nước thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};
