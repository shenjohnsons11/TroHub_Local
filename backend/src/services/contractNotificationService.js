const Contract = require('../models/Contract');
const { createAndDeliverNotification } = require('./notificationService');

class ContractNotificationError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const toId = (value) => String(value?._id || value || '');

const defaultDependencies = {
    findContract: (id) => Contract.findById(id).populate('roomId', 'landlordId'),
    deliver: createAndDeliverNotification,
    saveSentAt: (id, lastSentAt) => Contract.findByIdAndUpdate(id, { lastSentAt }),
};

async function sendContractToNguoiThue(
    { contractId, adminId, now = new Date() },
    dependencies = defaultDependencies,
) {
    const contract = await dependencies.findContract(contractId);
    if (!contract) throw new ContractNotificationError('CONTRACT_NOT_FOUND', 'Không tìm thấy hợp đồng.', 404);
    if (toId(contract.roomId?.landlordId) !== toId(adminId)) {
        throw new ContractNotificationError('CONTRACT_FORBIDDEN', 'Bạn không có quyền gửi hợp đồng này.', 403);
    }
    if (contract.lastSentAt && now.getTime() - new Date(contract.lastSentAt).getTime() < 60_000) {
        throw new ContractNotificationError('CONTRACT_SEND_RATE_LIMITED', 'Vui lòng chờ một phút trước khi gửi lại.', 429);
    }

    const result = await dependencies.deliver({
        recipientId: toId(contract.tenantId),
        type: 'CONTRACT_SENT',
        title: 'Bạn có hợp đồng mới',
        message: 'Chủ trọ đã gửi hợp đồng để bạn xem xét và xác nhận.',
        entityType: 'CONTRACT',
        entityId: toId(contract._id),
        deepLink: `/contract?id=${toId(contract._id)}`,
    });
    await dependencies.saveSentAt(contract._id, now);
    return { ...result, lastSentAt: now };
}

module.exports = {
    ContractNotificationError,
    sendContractToNguoiThue,
};
