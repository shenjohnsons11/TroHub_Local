const Notification = require('../models/Notification');
const PushDevice = require('../models/PushDevice');
const { getIO } = require('./socketService');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

function buildExpoMessages(notification, devices) {
    return devices
        .filter((device) => EXPO_TOKEN_PATTERN.test(device.expoPushToken))
        .map((device) => ({
            to: device.expoPushToken,
            sound: 'default',
            title: notification.title,
            body: notification.message,
            data: {
                notificationId: String(notification._id),
                entityType: notification.entityType,
                entityId: String(notification.entityId),
                deepLink: notification.deepLink,
            },
        }));
}

async function sendExpoPush(messages) {
    if (messages.length === 0) return [];
    const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
    });
    if (!response.ok) throw new Error(`Expo Push HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.data) ? payload.data : [];
}

function summarizeExpoTickets(tickets, expectedCount) {
    const sent = tickets.filter((ticket) => ticket?.status === 'ok').length;
    return { sent, failed: Math.max(0, expectedCount - sent) };
}

const defaultDependencies = {
    createNotification: (input) => Notification.create(input),
    findDevices: (nguoiThueId) => PushDevice.find({ nguoiThueId, isActive: true }).lean(),
    sendPush: sendExpoPush,
    updateDelivery: (id, delivery) => Notification.findByIdAndUpdate(id, { delivery }),
    deactivateDevices: (ids) => PushDevice.updateMany(
        { _id: { $in: ids } },
        { isActive: false },
    ),
};

async function createAndDeliverNotification(input, dependencies = defaultDependencies) {
    const notification = await dependencies.createNotification(input);
    const devices = await dependencies.findDevices(input.recipientId);
    const validDevices = devices.filter((device) => EXPO_TOKEN_PATTERN.test(device.expoPushToken));
    const invalidIds = devices
        .filter((device) => !EXPO_TOKEN_PATTERN.test(device.expoPushToken))
        .map((device) => device._id);
    if (invalidIds.length > 0) await dependencies.deactivateDevices(invalidIds);

    let delivery = { sent: 0, failed: 0 };
    try {
        const messages = buildExpoMessages(notification, validDevices);
        const tickets = await dependencies.sendPush(messages);
        delivery = summarizeExpoTickets(tickets, messages.length);
        const inactiveIds = validDevices
            .filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered')
            .map((device) => device._id);
        if (inactiveIds.length > 0) await dependencies.deactivateDevices(inactiveIds);
    } catch {
        delivery = { sent: 0, failed: validDevices.length };
    }

    await dependencies.updateDelivery(notification._id, delivery);
    return { notification, delivery };
}

async function sendNotification(
    { userId, title, content, category = 'system', deepLink = '', metadata = {}, eventKey },
    dependencies = {},
) {
    if (!userId) return null;

    const NotificationModel = dependencies.NotificationModel || Notification;
    const PushDeviceModel = dependencies.PushDeviceModel || PushDevice;
    const getIOFn = dependencies.getIO || getIO;
    const fetchImpl = dependencies.fetchImpl || global.fetch;
    const notificationData = {
        recipientId: userId,
        userId,
        title,
        message: content,
        content,
        type: String(category || 'system').toUpperCase(),
        category,
        deepLink,
        metadata,
        eventKey,
        deduplicationKey: eventKey,
    };

    let notification;
    try {
        notification = await NotificationModel.create(notificationData);
    } catch (error) {
        if (eventKey && error?.code === 11000) {
            return NotificationModel.findOne({ userId, eventKey });
        }
        throw error;
    }

    const socketPayload = {
        id: String(notification._id),
        type: category,
        title: notification.title,
        content: notification.content || notification.message,
        category,
        deepLink,
        isRead: false,
        createdAt: notification.createdAt,
    };
    const io = getIOFn();
    if (io?.to) {
        io.to(`user_${userId}`).emit('new_notification', {
            userId: String(userId),
            notification: socketPayload,
        });
    }

    const devices = await PushDeviceModel.find({
        $or: [{ userId }, { nguoiThueId: userId }],
        $and: [{ $or: [{ active: true }, { isActive: true }] }],
    });
    const activeDevices = devices.filter((device) => EXPO_TOKEN_PATTERN.test(device.expoPushToken));
    if (!activeDevices.length || typeof fetchImpl !== 'function') return notification;

    try {
        const response = await fetchImpl(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activeDevices.map((device) => ({
                to: device.expoPushToken,
                title,
                body: content,
                sound: 'default',
                data: { category, deepLink, notificationId: notification._id, metadata },
            }))),
        });
        const result = response?.ok === false ? null : await response?.json?.();
        await Promise.all((result?.data || []).map((ticket, index) => (
            ticket?.details?.error === 'DeviceNotRegistered'
                ? PushDeviceModel.updateOne(
                    { expoPushToken: activeDevices[index].expoPushToken },
                    { active: false, isActive: false },
                )
                : null
        )));
    } catch (_error) {
        // Inbox persistence is authoritative; push delivery is best effort.
    }

    return notification;
}

module.exports = {
    buildExpoMessages,
    createAndDeliverNotification,
    sendNotification,
    summarizeExpoTickets,
};
