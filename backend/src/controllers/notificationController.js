const Notification = require('../models/Notification');
const PushDevice = require('../models/PushDevice');

const buildRecipientFilter = (nguoiThueId) => ({ recipientId: nguoiThueId });
const buildOwnedNotificationFilter = (id, nguoiThueId) => ({
    _id: id,
    recipientId: nguoiThueId,
});

exports.listNotifications = async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const data = await Notification.find(buildRecipientFilter(req.auth.id))
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: `Không thể tải thông báo: ${error.message}` });
    }
};

exports.getUnreadCount = async (req, res) => {
    const count = await Notification.countDocuments({
        ...buildRecipientFilter(req.auth.id),
        isRead: false,
    });
    return res.json({ success: true, data: { count } });
};

exports.markRead = async (req, res) => {
    const data = await Notification.findOneAndUpdate(
        buildOwnedNotificationFilter(req.params.id, req.auth.id),
        { isRead: true, readAt: new Date() },
        { new: true },
    );
    if (!data) return res.status(404).json({ success: false, code: 'NOTIFICATION_NOT_FOUND', message: 'Không tìm thấy thông báo.' });
    return res.json({ success: true, data });
};

exports.markAllRead = async (req, res) => {
    const result = await Notification.updateMany(
        { ...buildRecipientFilter(req.auth.id), isRead: false },
        { isRead: true, readAt: new Date() },
    );
    return res.json({ success: true, data: { updated: result.modifiedCount } });
};

exports.registerDevice = async (req, res) => {
    const { expoPushToken, platform, deviceId } = req.body;
    if (!expoPushToken || !deviceId || !['android', 'ios'].includes(platform)) {
        return res.status(400).json({ success: false, code: 'PUSH_DEVICE_INVALID', message: 'Thông tin thiết bị không hợp lệ.' });
    }
    const data = await PushDevice.findOneAndUpdate(
        { nguoiThueId: req.auth.id, deviceId },
        {
            nguoiThueId: req.auth.id,
            expoPushToken,
            platform,
            deviceId,
            lastActiveAt: new Date(),
            isActive: true,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.status(201).json({ success: true, data });
};

exports.unregisterDevice = async (req, res) => {
    await PushDevice.findOneAndUpdate(
        { nguoiThueId: req.auth.id, deviceId: req.params.deviceId },
        { isActive: false, lastActiveAt: new Date() },
    );
    return res.json({ success: true, message: 'Đã ngừng nhận push notification trên thiết bị này.' });
};

exports.buildRecipientFilter = buildRecipientFilter;
exports.buildOwnedNotificationFilter = buildOwnedNotificationFilter;
