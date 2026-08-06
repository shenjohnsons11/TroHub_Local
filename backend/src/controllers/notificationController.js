const Notification = require('../models/Notification');
const PushDevice = require('../models/PushDevice');

const EXPO_PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

const buildRecipientFilter = (userId) => ({ recipientId: userId });
const buildOwnedNotificationFilter = (id, userId) => ({
    _id: id,
    recipientId: userId,
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
    const id = req.params.id;
    const userId = req.auth.id;
    let data = await Notification.findOneAndUpdate({ _id: id, userId },
        { isRead: true, readAt: new Date() },
        { new: true },
    );
    if (!data) {
        data = await Notification.findOneAndUpdate(
            buildOwnedNotificationFilter(id, userId),
            { isRead: true, readAt: new Date() },
            { new: true },
        );
    }
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
    if (!EXPO_PUSH_TOKEN_PATTERN.test(expoPushToken || '') || !['android', 'ios'].includes(platform)) {
        return res.status(400).json({ success: false, code: 'PUSH_DEVICE_INVALID', message: 'Thông tin thiết bị không hợp lệ.' });
    }
    const resolvedDeviceId = deviceId || expoPushToken;
    const update = {
        $set: {
            userId: req.auth.id,
            nguoiThueId: req.auth.id,
            expoPushToken,
            platform,
            deviceId: resolvedDeviceId,
            lastActiveAt: new Date(),
            active: true,
            isActive: true,
        },
    };
    const result = await PushDevice.updateOne({ userId: req.auth.id, expoPushToken: expoPushToken }, update);
    if (!result.matchedCount) {
        await PushDevice.updateOne({ expoPushToken }, update, { upsert: true });
    }
    return res.status(201).json({ success: true });
};

exports.deactivateDevice = async (req, res) => {
    const { expoPushToken } = req.body;
    if (!EXPO_PUSH_TOKEN_PATTERN.test(expoPushToken || '')) {
        return res.status(400).json({ success: false, code: 'PUSH_DEVICE_INVALID', message: 'Push token không hợp lệ.' });
    }
    await PushDevice.updateOne(
        { expoPushToken, $or: [{ userId: req.auth.id }, { nguoiThueId: req.auth.id }] },
        { $set: { active: false, isActive: false, lastActiveAt: new Date() } },
    );
    return res.json({ success: true });
};

exports.unregisterDevice = async (req, res) => {
    await PushDevice.findOneAndUpdate(
        { deviceId: req.params.deviceId, $or: [{ userId: req.auth.id }, { nguoiThueId: req.auth.id }] },
        { active: false, isActive: false, lastActiveAt: new Date() },
    );
    return res.json({ success: true, message: 'Đã ngừng nhận push notification trên thiết bị này.' });
};

exports.buildRecipientFilter = buildRecipientFilter;
exports.buildOwnedNotificationFilter = buildOwnedNotificationFilter;
