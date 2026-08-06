class MeterReadingError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.name = 'MeterReadingError';
        this.code = code;
        this.status = status;
    }
}

function toTime(value, fallback) {
    if (!value) return fallback;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : fallback;
}

function rangesOverlap(first, second) {
    const firstStart = toTime(first.start, Number.NEGATIVE_INFINITY);
    const firstEnd = toTime(first.end, Number.POSITIVE_INFINITY);
    const secondStart = toTime(second.start, Number.NEGATIVE_INFINITY);
    const secondEnd = toTime(second.end, Number.POSITIVE_INFINITY);
    return firstStart < secondEnd && secondStart < firstEnd;
}

async function assertNoRoomContractOverlap(input, dependencies) {
    const overlaps = await dependencies.findOverlappingContracts({
        roomId: input.roomId,
        contractId: input.contractId,
        startDate: input.billingRange.start,
        endDate: input.billingRange.end,
    });
    if (overlaps.length > 0) {
        throw new MeterReadingError(
            'ROOM_CONTRACT_OVERLAP',
            'Phòng có nhiều hợp đồng hiệu lực trùng thời gian; không thể xác định chỉ số điện nước.'
        );
    }
}

function selectReading({ initialValue, previousInvoice, roomInvoice, field }) {
    const previousValue = previousInvoice?.[field];
    if (Number.isFinite(previousValue)) {
        return {
            value: previousValue,
            type: 'PREVIOUS_INVOICE',
            invoiceId: String(previousInvoice._id),
            period: previousInvoice.period,
        };
    }
    if (Number.isFinite(initialValue)) {
        return { value: initialValue, type: 'CONTRACT_INITIAL' };
    }
    const roomValue = roomInvoice?.[field];
    if (Number.isFinite(roomValue)) {
        return {
            value: roomValue,
            type: 'ROOM_HISTORY',
            invoiceId: String(roomInvoice._id),
            period: roomInvoice.period,
        };
    }
    return {
        value: 0,
        type: 'NO_HISTORY',
        warning: 'Phòng chưa có lịch sử chỉ số; giá trị khởi tạo là 0 và cần được Chủ trọ kiểm tra.',
    };
}

async function resolveMeterReadings({ contractId, cutoffDate }, dependencies) {
    const contract = await dependencies.getContract(contractId);
    if (!contract) {
        throw new MeterReadingError('CONTRACT_NOT_FOUND', 'Không tìm thấy hợp đồng.', 404);
    }

    await assertNoRoomContractOverlap({
        roomId: contract.roomId,
        contractId,
        billingRange: {
            start: contract.startDate,
            end: cutoffDate || contract.endDate,
        },
    }, dependencies);

    const previousInvoice = await dependencies.findPreviousContractInvoice({
        contractId,
        cutoffDate,
        statuses: [1, 2, 3],
    });
    const roomInvoice = previousInvoice
        ? null
        : await dependencies.findPreviousRoomInvoice({
            roomId: contract.roomId,
            before: contract.startDate,
            statuses: [1, 2, 3],
        });

    return {
        electricity: selectReading({
            initialValue: contract.initialElectricity,
            previousInvoice,
            roomInvoice,
            field: 'electricityNew',
        }),
        water: selectReading({
            initialValue: contract.initialWater,
            previousInvoice,
            roomInvoice,
            field: 'waterNew',
        }),
    };
}

module.exports = {
    MeterReadingError,
    assertNoRoomContractOverlap,
    rangesOverlap,
    resolveMeterReadings,
};
