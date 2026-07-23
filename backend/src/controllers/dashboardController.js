const Room = require('../models/Room');
const Account = require('../models/Account');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const Transaction = require('../models/Transaction');

exports.getStats = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch (e) { }
        }

        let roomQuery = {};
        if (landlordId) {
            roomQuery.landlordId = landlordId;
        }

        const totalRooms = await Room.countDocuments(roomQuery);
        const occupiedRooms = await Room.countDocuments({ ...roomQuery, status: 1 });

        let tenantQuery = { role: 2 };
        if (landlordId) {
            tenantQuery.landlordId = landlordId;
        }
        const totalTenants = await Account.countDocuments(tenantQuery);

        let repairQuery = {};
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            const contracts = await Contract.find({
                roomId: { $in: rooms.map((room) => room._id) },
            }).select('tenantId');
            repairQuery.tenantId = {
                $in: contracts.map((contract) => contract.tenantId),
            };
        }
        const pendingRepairs = await RepairRequest.countDocuments({ ...repairQuery, status: { $in: [0, 1] } }); // 0: Mới, 1: Đang xử lý

        // Tính doanh thu tháng hiện tại
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentPeriod = `${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

        let invoiceQuery = { status: 2, period: currentPeriod }; // 2: Đã thanh toán
        if (landlordId) {
            // Lọc hóa đơn theo phòng của chủ trọ
            const rooms = await Room.find({ landlordId }).select('roomCode');
            invoiceQuery.room = { $in: rooms.map(r => r.roomCode) };
        }

        const invoices = await Invoice.find(invoiceQuery);
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                totalRooms,
                occupiedRooms,
                totalTenants,
                pendingRepairs,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};
