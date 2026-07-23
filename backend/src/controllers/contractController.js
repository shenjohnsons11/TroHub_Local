const Contract = require('../models/Contract');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const Service = require('../models/Service');
const { buildContractServiceSnapshot } = require('../services/serviceBilling');
const {
    buildDepositPayment,
    signContractAndEnsureDeposit,
} = require('../services/contractSigningService');
const { sendContractToNguoiThue } = require('../services/contractNotificationService');

exports.sendContract = async (req, res) => {
    try {
        const result = await sendContractToNguoiThue({
            contractId: req.params.id,
            adminId: req.auth.id,
        });
        return res.json({
            success: true,
            message: 'Đã gửi hợp đồng cho Người thuê.',
            data: result,
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            code: error.code || 'CONTRACT_SEND_FAILED',
            message: error.message || 'Không thể gửi hợp đồng.',
        });
    }
};

// 1. Lấy danh sách toàn bộ hợp đồng (Chủ trọ xem trên Web)
exports.getAllContracts = async (req, res) => {
    try {
        let landlordId = null;
        let nguoiThueId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || '***REMOVED***');
                if (decoded.role === 1) landlordId = decoded.id;
                if (decoded.role === 2) nguoiThueId = decoded.id;
            } catch(e) {}
        }

        let query = {};
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            query.roomId = { $in: rooms.map(r => r._id) };
        } else if (nguoiThueId) {
            query = { tenantId: nguoiThueId };
        }

        const contracts = await Contract.find(query)
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name code unit type billingMode defaultPrice defaultQuantity')
            .sort({ createdAt: -1 });

        const responseContracts = nguoiThueId
            ? await Promise.all(contracts.map(async (contract) => ({
                ...contract.toObject(),
                depositPayment: await buildDepositPayment(contract),
            })))
            : contracts;

        res.status(200).json({ success: true, data: responseContracts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

exports.getContractHistory = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || '***REMOVED***');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }

        let query = { status: 3 }; // Ví dụ: 3 là Đã thanh lý
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            query.roomId = { $in: rooms.map(r => r._id) };
        }

        const contracts = await Contract.find(query)
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name code unit type billingMode defaultPrice defaultQuantity')
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
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, services, initialElectricity, initialWater } = req.body;

        // 1. Ràng buộc Phòng: Kiểm tra phòng có đang trống không
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Không tìm thấy phòng!" });
        // Đã gỡ bỏ check (room.status === 1) để cho phép Đặt cọc giữ chỗ đối với phòng Đang thuê

        // Chống spam: Kiểm tra xem Phòng hoặc Người thuê đã có hợp đồng chờ xử lý chưa
        const existingPending = await Contract.findOne({
            $or: [
                { roomId, status: { $in: [0, 4] } },
                { tenantId, status: { $in: [0, 4] } }
            ]
        });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: "Người thuê hoặc Phòng này đã có một hợp đồng nháp đang chờ xử lý. Vui lòng kiểm tra lại danh sách hợp đồng!"
            });
        }

        // Cập nhật chỉ số đầu cho phòng (nếu có truyền)
        if (initialElectricity !== undefined) room.draftElectricity = Number(initialElectricity);
        if (initialWater !== undefined) room.draftWater = Number(initialWater);
        await room.save();

        const requestedServices = Array.isArray(services) ? services : [];
        const serviceDocuments = await Service.find({
            _id: { $in: requestedServices.map((item) => item.serviceId) },
            landlordId: room.landlordId,
            isActive: true,
        });
        if (serviceDocuments.length !== requestedServices.length) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_CONTRACT_SERVICE',
                message: 'Danh sách dịch vụ có mục không thuộc phạm vi quản lý.',
            });
        }
        const serviceById = new Map(serviceDocuments.map((item) => [String(item._id), item]));
        const serviceSnapshots = requestedServices.map((item) =>
            buildContractServiceSnapshot(serviceById.get(String(item.serviceId)), {
                fixedPrice: item.fixedPrice,
                defaultQuantity: item.defaultQuantity,
            })
        );

        const newContract = new Contract({
            roomId,
            tenantId,
            startDate,
            endDate,
            fixedRentPrice,
            fixedDeposit,
            initialElectricity: initialElectricity === undefined ? undefined : Number(initialElectricity),
            initialWater: initialWater === undefined ? undefined : Number(initialWater),
            services: serviceSnapshots,
            status: 0 // Trạng thái mặc định: 0 - Chờ Người thuê xác nhận
        });

        await newContract.save();
        res.status(201).json({
            success: true,
            message: "Tạo dự thảo hợp đồng thành công! Chờ người thuê ký xác nhận.",
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
            .populate('services.serviceId', 'name code unit type billingMode defaultPrice defaultQuantity'); // Kéo chi tiết dịch vụ ra

        if (!contract) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }
        res.status(200).json({ success: true, data: contract });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Người thuê thực hiện Ký hợp đồng (Trên Mobile App)
exports.signContract = async (req, res) => {
    try {
        const result = await signContractAndEnsureDeposit({
            contractId: req.params.id,
            nguoiThueId: req.auth.id,
        });

        res.status(200).json({
            success: true,
            message: "Ký hợp đồng thành công! Vui lòng thanh toán tiền cọc ngay để hoàn tất.",
            data: result.contract,
            invoiceId: result.invoiceId,
            depositRequired: result.depositRequired,
            depositAmount: result.depositAmount,
            idempotent: result.idempotent,
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || "CONTRACT_SIGNING_FAILED",
            message: error.message || "Không thể ký hợp đồng.",
        });
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

        // Kiểm tra xem phòng có đang có hợp đồng nào Đang hiệu lực không (để chặn kích hoạt đè)
        const activeContract = await Contract.findOne({ roomId: contract.roomId, status: 1 });
        if (activeContract) {
            return res.status(400).json({
                success: false,
                message: "Phòng này vẫn đang có một hợp đồng khác Đang hiệu lực. Vui lòng thanh lý hợp đồng cũ của Người thuê hiện tại trước khi duyệt kích hoạt hợp đồng giữ chỗ này!"
            });
        }

        // 1. Kiểm tra hóa đơn cọc đã thanh toán chưa
        const depositInvoice = await Invoice.findOne({ contractId: contract._id, period: "Tiền cọc" });
        if (Number(contract.fixedDeposit) > 0 && (!depositInvoice || depositInvoice.status !== 2)) {
            return res.status(400).json({ success: false, message: "Người thuê chưa thanh toán tiền cọc! Không thể duyệt." });
        }

        // 2. Chuyển trạng thái hợp đồng thành Đang hiệu lực (1)
        contract.status = 1;
        await contract.save();

        // 2. Chuyển trạng thái Phòng thành Đang thuê (1)
        const room = await Room.findByIdAndUpdate(contract.roomId, { status: 1 });

        // (Hóa đơn tiền cọc đã được tạo lúc người thuê ký, không tạo lại ở đây)
        res.status(200).json({
            success: true,
            message: "Xác nhận duyệt hợp đồng thành công! Đã tạo hóa đơn tiền cọc.",
            data: contract
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi xác nhận hợp đồng: " + error.message });
    }
};

// 5. Cập nhật thông tin hợp đồng (Chủ trọ sửa trên Web)
exports.updateContract = async (req, res) => {
    try {
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, status, services, initialElectricity, initialWater } = req.body;

        const existing = await Contract.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });

        // Admin tạo hợp đồng phải thông qua người thuê ký (status = 4), nếu không thì không tự xác nhận thành Đang hiệu lực (1) được.
        if (status !== undefined && Number(status) === 1 && existing.status !== 1 && existing.status !== 4) {
            return res.status(400).json({ success: false, message: "Người thuê chưa ký hợp đồng này, Admin không thể xác nhận!" });
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
        if (services !== undefined) updateData.services = services;

        const updated = await Contract.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone');

        // Nếu admin đổi trạng thái thành hiệu lực (1) → đổi phòng thành Đang thuê
        const targetRoomId = updated.roomId._id || updated.roomId;
        if (status === 1 && targetRoomId) {
            await Room.findByIdAndUpdate(targetRoomId, { status: 1 });
        }

        // Nếu admin cập nhật số điện/nước đầu
        if (targetRoomId && (initialElectricity !== undefined || initialWater !== undefined)) {
            const roomUpdates = {};
            if (initialElectricity !== undefined) roomUpdates.draftElectricity = Number(initialElectricity);
            if (initialWater !== undefined) roomUpdates.draftWater = Number(initialWater);
            await Room.findByIdAndUpdate(targetRoomId, roomUpdates);
        }

        res.status(200).json({ success: true, message: "Cập nhật hợp đồng thành công!", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật hợp đồng: " + error.message });
    }
};
