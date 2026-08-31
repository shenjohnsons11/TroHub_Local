const assert = require('node:assert/strict');
const test = require('node:test');

const {
    CONTRACT_STATUS,
    classifyContractCreation,
    validateHandoverInput,
} = require('../src/services/contractLifecycle');

test('allows the same tenant to hold contracts for different rooms', () => {
    const result = classifyContractCreation({
        tenantId: 'tenant-1',
        roomId: 'room-202',
        roomStatus: 0,
        activeContract: null,
        reservedContract: null,
        startDate: '2026-09-01',
    });

    assert.equal(result.status, CONTRACT_STATUS.PENDING);
    assert.equal(result.isAdvanceBooking, false);
});

test('creates a reserved contract after the active room contract ends', () => {
    const result = classifyContractCreation({
        tenantId: 'tenant-1',
        roomId: 'room-101',
        roomStatus: 1,
        activeContract: { endDate: '2026-12-31T23:59:59.999Z' },
        reservedContract: null,
        startDate: '2027-01-01T00:00:00.000Z',
    });

    assert.equal(result.status, CONTRACT_STATUS.RESERVED);
    assert.equal(result.isAdvanceBooking, true);
});

test('rejects an occupied-room booking that overlaps the active contract', () => {
    assert.throws(
        () => classifyContractCreation({
            tenantId: 'tenant-1',
            roomId: 'room-101',
            roomStatus: 1,
            activeContract: { endDate: '2026-12-31T23:59:59.999Z' },
            reservedContract: null,
            startDate: '2026-12-31T00:00:00.000Z',
        }),
        /đã có hợp đồng hiệu lực/
    );
});

test('rejects a second reserved contract for the same room', () => {
    assert.throws(
        () => classifyContractCreation({
            tenantId: 'tenant-2',
            roomId: 'room-101',
            roomStatus: 1,
            activeContract: { endDate: '2026-12-31T23:59:59.999Z' },
            reservedContract: { _id: 'reserved-1' },
            startDate: '2027-01-01',
        }),
        /đã có hợp đồng đặt cọc/
    );
});

test('validates handover meters without allowing a reading rollback', () => {
    assert.deepEqual(
        validateHandoverInput(
            { initialElectricity: '120', initialWater: '30', handoverDate: '2027-01-01' },
            { lastElectricityReading: 100, lastWaterReading: 20 },
        ),
        { initialElectricity: 120, initialWater: 30, handoverDate: '2027-01-01' },
    );

    assert.throws(
        () => validateHandoverInput(
            { initialElectricity: 90, initialWater: 30, handoverDate: '2027-01-01' },
            { lastElectricityReading: 100, lastWaterReading: 20 },
        ),
        /không được thấp hơn/
    );
});
