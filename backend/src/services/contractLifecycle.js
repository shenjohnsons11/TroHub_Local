const CONTRACT_STATUS = Object.freeze({
    DRAFT: 0,
    ACTIVE: 1,
    EXPIRED: 2,
    TERMINATED: 3,
    RESERVED: 4,
    PENDING: 5,
});

function parseDate(value, field) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        throw new Error(`${field} không hợp lệ.`);
    }
    return date;
}

function classifyContractCreation({ roomStatus, activeContract, reservedContract, startDate }) {
    if (reservedContract) {
        throw new Error('Phòng này đã có hợp đồng đặt cọc giữ chỗ.');
    }

    if (Number(roomStatus) === 1) {
        if (!activeContract) {
            throw new Error('Phòng đang thuê nhưng không tìm thấy hợp đồng hiệu lực.');
        }
        const newStart = parseDate(startDate, 'Ngày bắt đầu');
        const currentEnd = parseDate(activeContract.endDate, 'Ngày kết thúc hợp đồng cũ');
        if (newStart < currentEnd) {
            throw new Error('Ngày bắt đầu mới phải sau ngày kết thúc hợp đồng cũ; phòng đã có hợp đồng hiệu lực.');
        }
        return { status: CONTRACT_STATUS.RESERVED, isAdvanceBooking: true };
    }

    if (activeContract) {
        throw new Error('Phòng đã có hợp đồng hiệu lực.');
    }

    return { status: CONTRACT_STATUS.PENDING, isAdvanceBooking: false };
}

function parseMeter(value, field) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new Error(`${field} phải là số hữu hạn không âm.`);
    }
    return number;
}

function validateHandoverInput(input = {}, room = {}) {
    const initialElectricity = parseMeter(input.initialElectricity, 'Chỉ số điện đầu vào');
    const initialWater = parseMeter(input.initialWater, 'Chỉ số nước đầu vào');
    const handoverDate = input.handoverDate || new Date().toISOString();
    parseDate(handoverDate, 'Ngày bàn giao');

    if (Number.isFinite(Number(room.lastElectricityReading)) && initialElectricity < Number(room.lastElectricityReading)) {
        throw new Error('Chỉ số điện đầu vào không được thấp hơn chỉ số hiện tại của phòng.');
    }
    if (Number.isFinite(Number(room.lastWaterReading)) && initialWater < Number(room.lastWaterReading)) {
        throw new Error('Chỉ số nước đầu vào không được thấp hơn chỉ số hiện tại của phòng.');
    }

    return { initialElectricity, initialWater, handoverDate };
}

module.exports = {
    CONTRACT_STATUS,
    classifyContractCreation,
    parseDate,
    validateHandoverInput,
};
