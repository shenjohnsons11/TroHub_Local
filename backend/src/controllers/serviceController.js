const Service = require('../models/Service');

// 1. Lấy danh sách dịch vụ
exports.getAllServices = async (req, res) => {
    try {
        const { landlordId } = req.query;

        let query = {};
        if (landlordId) query.landlordId = landlordId;

        const services = await Service.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Lấy danh sách dịch vụ thành công!",
            data: services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi Server: " + error.message
        });
    }
};

// 2. Tạo dịch vụ mới
exports.createService = async (req, res) => {
    try {
        const { name, type, unit, defaultPrice, landlordId } = req.body;

        const newService = new Service({
            name,
            type,
            unit,
            defaultPrice,
            landlordId
        });

        await newService.save();

        res.status(201).json({
            success: true,
            message: "Tạo dịch vụ mới thành công!",
            data: newService
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo dịch vụ: " + error.message
        });
    }
};

// 3. Xem chi tiết dịch vụ
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dịch vụ!"
            });
        }

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi Server: " + error.message
        });
    }
};

// 4. Cập nhật dịch vụ
exports.updateService = async (req, res) => {
    try {
        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedService) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dịch vụ cần cập nhật!"
            });
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật dịch vụ thành công!",
            data: updatedService
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật dịch vụ: " + error.message
        });
    }
};