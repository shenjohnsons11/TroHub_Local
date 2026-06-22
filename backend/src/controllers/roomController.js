const Room = require('../models/Room');

// 1. Lấy danh sách toàn bộ phòng (Có thể lọc theo mã chủ trọ)
exports.getAllRooms = async (req, res) => {
    try {
        let landlordId = req.query.landlordId;
        const authHeader = req.headers['authorization'];
        if (!landlordId && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }
        
        let query = {};
        if (landlordId) query.landlordId = landlordId;

        const rooms = await Room.find(query).lean().sort({ createdAt: -1 });
        
        // Populate tenant from active contracts
        const Contract = require('../models/Contract');
        const activeContracts = await Contract.find({ status: 1 }).populate('tenantId', 'fullName');
        
        for (let room of rooms) {
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
        const { roomCode, area, defaultRentPrice, defaultDeposit, landlordId } = req.body;

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
        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id, 
            req.body, 
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
        res.status(200).json({ success: true, message: 'Đã xóa phòng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa phòng: ' + error.message });
    }
};