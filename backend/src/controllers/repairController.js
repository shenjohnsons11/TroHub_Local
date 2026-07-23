const RepairRequest = require('../models/RepairRequest');
const Contract = require('../models/Contract');
const Account = require('../models/Account');

// 1. Lấy danh sách yêu cầu sửa chữa (Dành cho Chủ trọ - Web)
exports.getAllRequests = async (req, res) => {
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

	        let query = {};
	        if (landlordId) {
	            const tenants = await Account.find({
	                role: 2,
	                linkedLandlords: landlordId
	            }).select('_id');
	            query.tenantId = { $in: tenants.map(t => t._id) };
	        }

	        const requests = await RepairRequest.find(query)
	            .populate('tenantId', 'fullName phone')
	            .populate({
	                path: 'contractId',
	                populate: { path: 'roomId', select: 'roomCode' }
	            })
	            .sort({ createdAt: -1 }); // Mới nhất lên đầu

        // Map để frontend dễ hiển thị
        const data = requests.map(r => ({
	            _id: r._id,
	            repairCode: r._id.toString().slice(-6).toUpperCase(),
	            room: r.contractId?.roomId?.roomCode || '-',
	            sender: r.tenantId?.fullName || '-',
	            tenantId: r.tenantId,
	            contractId: r.contractId,
	            title: r.title,
	            content: r.content,
            priority: r.priority || 1,
            status: r.status || 0,
            landlordNote: r.landlordNote || '',
            images: r.images || [],
            createdAt: r.createdAt
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

	// 2. Gửi yêu cầu sửa chữa mới (Dành cho Người thuê - Mobile App)
	exports.createRequest = async (req, res) => {
	    try {
	        const { tenantId, title, content, priority } = req.body;

	        // 1. Tự động dò tìm Hợp đồng đang hiệu lực (status = 1) của người này
	        const activeContract = await Contract.findOne({ tenantId: tenantId, status: 1 });
	        if (!activeContract) {
            return res.status(400).json({
                success: false,
                message: "Bạn hiện không có hợp đồng thuê phòng nào đang hiệu lực để báo cáo sự cố!"
            });
        }

        let imagesArray = [];
        console.log("REPAIR_CONTROLLER: Received images typeof:", typeof req.body.images, "isArray:", Array.isArray(req.body.images));
        if (Array.isArray(req.body.images)) {
            imagesArray = req.body.images.map(img => {
                if (typeof img === 'string') return img;
                return img.fileUrl || img.url || '';
            }).filter(Boolean);
        }

	        // 2. RepairRequest được sở hữu trực tiếp bởi Người thuê; contractId chỉ là snapshot tham chiếu.
	        const newRequest = new RepairRequest({
	            tenantId,
	            contractId: activeContract._id,
            title,
            content,
            priority: 0, // Mặc định là 0 (Chưa phân loại) để Admin là người quyết định
            status: 0, // 0: Chờ xác nhận
            images: imagesArray
        });

        await newRequest.save();
        res.status(201).json({
            success: true,
            message: "Gửi báo cáo sự cố thành công!",
            data: newRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi gửi yêu cầu: " + error.message });
    }
};

// 3. Cập nhật trạng thái và ghi chú (Dành cho Chủ trọ - Web)
exports.updateRequestStatus = async (req, res) => {
    try {
        // Chủ trọ truyền lên trạng thái mới và lời ghi chú nội bộ
        let { status, priority, note } = req.body;

        // Map string → number nếu frontend gửi string
        const statusMap = { 'Mới': 0, 'Đang xử lý': 1, 'Đã hoàn thành': 2, 'Hoàn thành': 2, 'Đã hủy': 3 };
        const priorityMap = { 'Chưa phân loại': 0, 'Thấp': 1, 'Trung bình': 2, 'Cao': 3 };

        const statusNum = typeof status === 'string' ? (statusMap[status] !== undefined ? statusMap[status] : parseInt(status)) : status;
        const priorityNum = typeof priority === 'string' ? (priorityMap[priority] !== undefined ? priorityMap[priority] : parseInt(priority)) : priority;

        const updateData = {};
        if (statusNum !== undefined && !isNaN(statusNum)) updateData.status = statusNum;
        if (priorityNum !== undefined && !isNaN(priorityNum)) updateData.priority = priorityNum;
        if (note !== undefined) updateData.landlordNote = note;

        // Tự động giải phóng dung lượng (xóa ảnh) khi Yêu cầu được đánh dấu Hoàn thành (2) hoặc Đã hủy (3)
        if (statusNum === 2 || statusNum === 3) {
            updateData.images = [];
        }

        const updatedRequest = await RepairRequest.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu sửa chữa này!" });
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật tiến độ xử lý thành công!",
            data: {
                _id: updatedRequest._id,
                repairCode: updatedRequest._id.toString().slice(-6).toUpperCase(),
                status: updatedRequest.status,
                priority: updatedRequest.priority,
                landlordNote: updatedRequest.landlordNote || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật: " + error.message });
    }
};

// 4. Xóa yêu cầu sửa chữa
exports.deleteRequest = async (req, res) => {
    try {
        const deletedRequest = await RepairRequest.findByIdAndDelete(req.params.id);
        if (!deletedRequest) {
            return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu sửa chữa này!" });
        }
        res.status(200).json({ success: true, message: "Đã xóa yêu cầu sửa chữa thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi xóa: " + error.message });
    }
};
