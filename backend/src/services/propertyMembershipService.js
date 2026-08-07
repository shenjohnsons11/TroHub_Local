const Property = require('../models/Property');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const PropertyMembership = require('../models/PropertyMembership');

const OPEN_CONTRACT_STATUSES = [0, 1, 4, 5];

class PropertyMembershipError extends Error {
    constructor(message, status = 400, code = 'PROPERTY_MEMBERSHIP_INVALID') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

async function assertOwnedProperty({ propertyId, landlordId, PropertyModel = Property }) {
    if (!propertyId) {
        throw new PropertyMembershipError('Vui lòng chọn nhà trọ.', 400, 'PROPERTY_REQUIRED');
    }

    const exists = await PropertyModel.exists({ _id: propertyId, ownerId: landlordId, status: 'active' });
    if (!exists) {
        throw new PropertyMembershipError('Nhà trọ không tồn tại hoặc không thuộc quyền quản lý.', 404, 'PROPERTY_NOT_FOUND');
    }
    return exists;
}

async function assertContractEligibility({
    propertyId,
    landlordId,
    roomId,
    tenantId,
    PropertyModel = Property,
    RoomModel = Room,
    MembershipModel = PropertyMembership,
    ContractModel = Contract,
}) {
    await assertOwnedProperty({ propertyId, landlordId, PropertyModel });

    const room = await RoomModel.findOne({ _id: roomId, propertyId });
    if (!room) {
        throw new PropertyMembershipError('Phòng không thuộc nhà trọ đã chọn.', 404, 'ROOM_NOT_IN_PROPERTY');
    }
    if (room.status !== 0) {
        throw new PropertyMembershipError('Phòng đã có người thuê hoặc đang bảo trì.', 409, 'ROOM_UNAVAILABLE');
    }

    const membership = await MembershipModel.exists({ propertyId, tenantId, status: 'active' });
    if (!membership) {
        throw new PropertyMembershipError('Người thuê chưa là thành viên đang hoạt động của nhà trọ.', 409, 'MEMBERSHIP_NOT_ACTIVE');
    }

    const propertyRoomIds = await RoomModel.find({ propertyId }).distinct('_id');
    const conflict = await ContractModel.exists({
        status: { $in: OPEN_CONTRACT_STATUSES },
        $or: [
            { roomId },
            { tenantId, roomId: { $in: propertyRoomIds } },
        ],
    });
    if (conflict) {
        throw new PropertyMembershipError('Phòng hoặc người thuê đã có hợp đồng đang mở trong nhà trọ này.', 409, 'OPEN_CONTRACT_EXISTS');
    }

    return room;
}

module.exports = {
    OPEN_CONTRACT_STATUSES,
    PropertyMembershipError,
    assertOwnedProperty,
    assertContractEligibility,
};
