const Contract = require('../models/Contract');
const Room = require('../models/Room');
const { sendNotification } = require('./notificationService');

const EVENT_DEFINITIONS = {
    checkout_requested: {
        category: 'checkout',
        deepLink: '/contracts',
        title: 'Yêu cầu trả phòng mới',
        content: (roomCode) => `Người thuê phòng ${roomCode} vừa gửi yêu cầu trả phòng.`,
        eventKey: ({ contractId }) => `contract:${contractId}:checkout-request`,
        metadata: ({ contractId }) => ({ contractId, action: 'checkout' }),
    },
    repair_created: {
        category: 'repair',
        deepLink: '/repairs',
        title: 'Yêu cầu sửa chữa mới',
        content: (roomCode) => `Phòng ${roomCode} vừa gửi báo cáo sự cố mới.`,
        eventKey: ({ entityId }) => `repair:${entityId}:created`,
        metadata: ({ contractId, entityId }) => ({ contractId, repairId: entityId }),
    },
    contract_signed: {
        category: 'contract',
        deepLink: '/contracts',
        title: 'Hợp đồng vừa được ký',
        content: (roomCode) => `Người thuê phòng ${roomCode} vừa ký hợp đồng, đang chờ Chủ trọ duyệt.`,
        eventKey: ({ contractId }) => `contract:${contractId}:tenant-signed`,
        metadata: ({ contractId }) => ({ contractId, action: 'review' }),
    },
    invoice_paid: {
        category: 'invoice',
        deepLink: '/invoices',
        title: 'Thanh toán thành công',
        content: (roomCode) => `Hóa đơn của phòng ${roomCode} vừa được thanh toán.`,
        eventKey: ({ entityId }) => `invoice:${entityId}:paid`,
        metadata: ({ contractId, entityId }) => ({ contractId, invoiceId: entityId }),
    },
};

const toId = (value) => String(value?._id || value || '');

async function notifyLandlord(
    { event, contractId, entityId, metadata = {} },
    {
        ContractModel = Contract,
        RoomModel = Room,
        sendNotificationFn = sendNotification,
    } = {},
) {
    const definition = EVENT_DEFINITIONS[event];
    if (!definition) throw new Error(`Unsupported landlord notification event: ${event}`);

    const resolvedContractId = toId(contractId);
    const contract = await ContractModel.findById(resolvedContractId);
    if (!contract?.roomId) return null;

    const room = await RoomModel.findById(toId(contract.roomId));
    if (!room?.landlordId) return null;

    const context = {
        contractId: resolvedContractId,
        entityId: toId(entityId || contractId),
    };
    return sendNotificationFn({
        userId: room.landlordId,
        title: definition.title,
        content: definition.content(room.roomCode || ''),
        category: definition.category,
        deepLink: definition.deepLink,
        metadata: {
            ...definition.metadata(context),
            ...metadata,
            roomId: room._id,
        },
        eventKey: definition.eventKey(context),
    });
}

module.exports = { EVENT_DEFINITIONS, notifyLandlord };
