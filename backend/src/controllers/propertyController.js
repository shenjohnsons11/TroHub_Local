const Property = require('../models/Property');

function readPropertyInput(body) {
    return {
        name: String(body.name || '').trim(),
        address: String(body.address || '').trim(),
        status: body.status,
    };
}

exports.list = async (req, res) => {
    try {
        const data = await Property.find({ ownerId: req.auth.id }).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: `Không thể tải danh sách nhà trọ: ${error.message}` });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, address } = readPropertyInput(req.body);
        if (!name || !address) {
            return res.status(400).json({ success: false, code: 'PROPERTY_FIELDS_REQUIRED', message: 'Tên và địa chỉ nhà trọ là bắt buộc.' });
        }
        const data = await Property.create({ name, address, ownerId: req.auth.id });
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: `Không thể tạo nhà trọ: ${error.message}` });
    }
};

exports.update = async (req, res) => {
    try {
        const { name, address, status } = readPropertyInput(req.body);
        const update = {};
        if (name) update.name = name;
        if (address) update.address = address;
        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({ success: false, code: 'PROPERTY_STATUS_INVALID', message: 'Trạng thái nhà trọ không hợp lệ.' });
            }
            update.status = status;
        }
        const data = await Property.findOneAndUpdate({ _id: req.params.propertyId, ownerId: req.auth.id }, update, { new: true });
        if (!data) return res.status(404).json({ success: false, code: 'PROPERTY_NOT_FOUND', message: 'Không tìm thấy nhà trọ.' });
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: `Không thể cập nhật nhà trọ: ${error.message}` });
    }
};
