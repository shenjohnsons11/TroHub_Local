const Contract = require('../models/Contract');
const Room = require('../models/Room');

// 1. Lấy danh sách toàn bộ hợp đồng (Chủ trọ xem trên Web)
exports.getAllContracts = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }
        
        let query = {};
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            query.roomId = { $in: rooms.map(r => r._id) };
        }

        const contracts = await Contract.find(query)
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name unit type defaultPrice')
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, data: contracts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 2. Chủ trọ tạo dự thảo hợp đồng (Giao diện Tạo hợp đồng trên Figma)
exports.createContract = async (req, res) => {
    try {
        // Dữ liệu truyền lên bao gồm thông tin cơ bản và mảng các dịch vụ đã chốt giá
        // Mảng services có dạng: [{ serviceId: "...", fixedPrice: 4000 }]
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, services } = req.body;

        // 1. Ràng buộc Phòng: Kiểm tra phòng có đang trống không
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Không tìm thấy phòng!" });
        if (room.status === 1) {
            return res.status(400).json({ success: false, message: "Phòng này đang có người thuê, không thể tạo hợp đồng mới!" });
        }

        const newContract = new Contract({
            roomId,
            tenantId,
            startDate,
            endDate,
            fixedRentPrice,
            fixedDeposit,
            services: services || [], // Nhúng thẳng mảng dịch vụ vào đây
            status: 0 // Trạng thái mặc định: 0 - Chờ khách xác nhận
        });

        await newContract.save();
        res.status(201).json({ 
            success: true, 
            message: "Tạo dự thảo hợp đồng thành công! Chờ khách thuê ký xác nhận.", 
            data: newContract 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi tạo hợp đồng: " + error.message });
    }
};

// 3. Xem chi tiết hợp đồng (Cả Web và Mobile App đều dùng)
exports.getContractById = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id)
            .populate('roomId')
            .populate('tenantId', 'fullName phone idCard email')
            .populate('services.serviceId', 'name unit type defaultPrice'); // Kéo chi tiết dịch vụ ra

        if (!contract) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }
        res.status(200).json({ success: true, data: contract });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Khách thuê thực hiện Ký hợp đồng (Trên Mobile App)
exports.signContract = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        if (contract.status !== 0) {
            return res.status(400).json({ success: false, message: "Hợp đồng này không ở trạng thái chờ ký!" });
        }

        // 1. Chuyển trạng thái hợp đồng thành Chờ duyệt (4) và lưu vết thời gian ký
        contract.status = 4;
        contract.tenantConfirmedAt = new Date();
        await contract.save();

        res.status(200).json({ 
            success: true, 
            message: "Ký tên điện tử thành công! Chờ chủ trọ xác nhận duyệt hợp đồng." 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi ký hợp đồng: " + error.message });
    }
};

// 4.1. Chủ trọ (Admin) duyệt xác nhận hợp đồng (Trên Web/App)
exports.confirmContract = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id);
        
        if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        if (contract.status !== 4) {
            return res.status(400).json({ success: false, message: "Hợp đồng này không ở trạng thái chờ duyệt!" });
        }

        // 1. Chuyển trạng thái hợp đồng thành Đang hiệu lực (1)
        contract.status = 1;
        await contract.save();

        // 2. Chuyển trạng thái Phòng thành Đang thuê (1)
        await Room.findByIdAndUpdate(contract.roomId, { status: 1 });

        res.status(200).json({ 
            success: true, 
            message: "Xác nhận duyệt hợp đồng thành công! Hợp đồng chính thức có hiệu lực.",
            data: contract
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi xác nhận hợp đồng: " + error.message });
    }
};

// 5. Cập nhật thông tin hợp đồng (Chủ trọ sửa trên Web)
exports.updateContract = async (req, res) => {
    try {
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, status } = req.body;
        
        const existing = await Contract.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });

        // Admin tạo hợp đồng phải thông qua người thuê ký (status = 4), nếu không thì không tự xác nhận thành Đang hiệu lực (1) được.
        if (status !== undefined && Number(status) === 1 && existing.status !== 1 && existing.status !== 4) {
            return res.status(400).json({ success: false, message: "Khách thuê chưa ký hợp đồng này, Admin không thể xác nhận!" });
        }

        const updateData = {};
        if (roomId !== undefined) {
            if (roomId.toString() !== existing.roomId.toString()) {
                const newRoom = await Room.findById(roomId);
                if (newRoom && newRoom.status === 1) {
                    return res.status(400).json({ success: false, message: "Phòng mới bạn chọn đang có người thuê!" });
                }
            }
            updateData.roomId = roomId;
        }
        if (tenantId !== undefined) updateData.tenantId = tenantId;
        if (startDate !== undefined) updateData.startDate = startDate;
        if (endDate !== undefined) updateData.endDate = endDate;
        if (fixedRentPrice !== undefined) updateData.fixedRentPrice = fixedRentPrice;
        if (fixedDeposit !== undefined) updateData.fixedDeposit = fixedDeposit;
        if (status !== undefined) updateData.status = status;

        const updated = await Contract.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone');

        // Nếu admin đổi trạng thái thành hiệu lực (1) → đổi phòng thành Đang thuê
        if (status === 1 && updated.roomId) {
            await Room.findByIdAndUpdate(updated.roomId._id || updated.roomId, { status: 1 });
        }

        res.status(200).json({ success: true, message: "Cập nhật hợp đồng thành công!", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật hợp đồng: " + error.message });
    }
};