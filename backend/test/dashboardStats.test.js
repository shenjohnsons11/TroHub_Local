const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildDashboardStats,
    buildPeriodRange,
    roomHasCurrentReadings,
} = require('../src/services/dashboardStats');

function fakeDependencies(overrides = {}) {
    const calls = [];
    const wrap = (name, value) => async (landlordId) => {
        calls.push([name, landlordId]);
        return value;
    };
    return {
        calls,
        listRooms: wrap('rooms', overrides.rooms || []),
        listContracts: wrap('contracts', overrides.contracts || []),
        listInvoices: wrap('invoices', overrides.invoices || []),
        countTenants: wrap('tenants', overrides.totalTenants || 0),
        countPendingRepairs: wrap('repairs', overrides.pendingRepairs || 0),
        getBillingPolicy: wrap('policy', overrides.policy || null),
    };
}

test('period range is chronological and includes the Vietnam current month', () => {
    assert.deepEqual(
        buildPeriodRange(new Date('2026-01-15T01:00:00.000Z'), 6).map((item) => item.period),
        ['08/2025', '09/2025', '10/2025', '11/2025', '12/2025', '01/2026']
    );
});

test('dashboard totals use paid invoices only and scope every query to the landlord', async () => {
    const dependencies = fakeDependencies({
        rooms: [
            { _id: 'room-a', roomCode: 'A-101', floor: 1, status: 1, lastElectricityReading: 10, lastWaterReading: 5, draftElectricity: 12, draftWater: 6 },
            { _id: 'room-b', roomCode: 'B-201', floor: 2, status: 0 },
        ],
        contracts: [
            { _id: 'contract-a', status: 1, roomId: 'room-a', tenantId: { _id: 'tenant-a', fullName: 'An' }, services: [] },
            { _id: 'contract-waiting', status: 4, roomId: 'room-b', tenantId: 'tenant-b', services: [] },
        ],
        invoices: [
            {
                _id: 'paid-current',
                contractId: 'contract-a',
                period: 'Tháng 8/2026',
                status: 2,
                totalAmount: 3_500_000,
                roomAmount: 3_000_000,
                electricity: 300_000,
                water: 100_000,
                services: 100_000,
                electricityOld: 10,
                electricityNew: 12,
                waterOld: 5,
                waterNew: 6,
                dueDate: '2026-09-05T16:59:59.000Z',
                updatedAt: '2026-09-04T03:00:00.000Z',
            },
            { _id: 'unpaid-current', contractId: 'contract-a', period: '08/2026', status: 1, totalAmount: 9_000_000 },
            { _id: 'overdue-old', contractId: 'contract-a', period: '07/2026', status: 3, totalAmount: 700_000 },
        ],
        totalTenants: 1,
        pendingRepairs: 2,
        policy: { autoInvoiceEnabled: true, invoiceDay: 25, dueDay: 5, autoRemindEnabled: true, remindDaysBeforeDue: 2 },
    });

    const result = await buildDashboardStats(
        { landlordId: 'owner-a', months: 6, now: new Date('2026-08-31T12:00:00.000Z') },
        dependencies
    );

    assert.equal(result.totalRevenue, 3_500_000);
    assert.equal(result.outstandingDebt, 9_700_000);
    assert.equal(result.overdueDebt, 700_000);
    assert.equal(result.revenueSeries.at(-1).value, 3_500_000);
    assert.deepEqual(result.revenueComposition, { rent: 3_000_000, utilities: 400_000, services: 100_000 });
    assert.deepEqual(result.paymentPerformance, { paid: 1, unpaid: 1, overdue: 1, onTimeRate: 100 });
    assert.deepEqual(result.utilitySeries.at(-1), { period: '08/2026', label: 'T08', electricity: 2, water: 1 });
    assert.equal(result.pendingContracts, 1);
    assert.equal(result.pendingRepairs, 2);
    assert.equal(result.utilityReading.readyRooms, 1);
    assert.equal(result.utilityReading.missingRooms, 0);
    assert.deepEqual(result.floorGroups.map((group) => group.floor), [1, 2]);
    assert.equal(result.floorGroups[0].rooms[0].tenantName, 'An');
    assert.ok(dependencies.calls.length >= 6);
    assert.ok(dependencies.calls.every(([, landlordId]) => landlordId === 'owner-a'));
});

test('empty landlord returns API zeros without fabricated room or chart data', async () => {
    const result = await buildDashboardStats(
        { landlordId: 'new-owner', months: 6, now: new Date('2026-08-31T12:00:00.000Z') },
        fakeDependencies()
    );

    assert.equal(result.totalRevenue, 0);
    assert.equal(result.totalRooms, 0);
    assert.equal(result.occupiedRooms, 0);
    assert.equal(result.outstandingDebt, 0);
    assert.deepEqual(result.floorGroups, []);
    assert.equal(result.utilityReading.readyRooms, 0);
    assert.equal(result.utilityReading.totalOccupiedRooms, 0);
    assert.ok(result.revenueSeries.every((item) => item.value === 0));
});

test('fixed utility services do not require a newer meter draft', () => {
    const room = { lastElectricityReading: 20, lastWaterReading: 10 };
    const fixedContract = {
        services: [
            { serviceId: { name: 'Điện', billingMode: 'FIXED', type: 2 } },
            { serviceId: { name: 'Nước', billingMode: 'FIXED', type: 2 } },
        ],
    };
    assert.deepEqual(roomHasCurrentReadings(room, fixedContract), {
        ready: true,
        electricityReady: true,
        waterReady: true,
    });
});
