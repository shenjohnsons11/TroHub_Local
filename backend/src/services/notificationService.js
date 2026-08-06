const Notification = require('../models/Notification');
const PushDevice = require('../models/PushDevice');

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

module.exports = {
    buildExpoMessages,
    createAndDeliverNotification,
    summarizeExpoTickets,
};
