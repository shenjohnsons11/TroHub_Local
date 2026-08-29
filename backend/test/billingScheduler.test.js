const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAutomationKey,
    dueDateForPeriod,
    effectiveInvoiceDay,
    runAutomaticInvoiceIssuance,
    vietnamDateKey,
} = require('../src/services/billingScheduler');
const { selectReminderType } = require('../src/services/invoiceReminderScheduler');

test('invoice days beyond the month clamp to its final day', () => {
    assert.equal(effectiveInvoiceDay(2026, 2, 31), 28);
    assert.equal(effectiveInvoiceDay(2028, 2, 31), 29);
    assert.equal(effectiveInvoiceDay(2026, 4, 31), 30);
    assert.equal(effectiveInvoiceDay(2026, 8, 25), 25);
});

test('due date uses the configured day in the following month and clamps safely', () => {
    assert.equal(vietnamDateKey(dueDateForPeriod('08/2026', 5)), '2026-09-05');
    assert.equal(vietnamDateKey(dueDateForPeriod('01/2026', 31)), '2026-02-28');
    assert.equal(vietnamDateKey(dueDateForPeriod('01/2028', 31)), '2028-02-29');
});

test('new reminder policy sends before and on due date, but not after it', () => {
    const policy = { autoRemindEnabled: true, remindDaysBeforeDue: 2, remindAfterOverdueDays: [1] };
    const dueDate = new Date('2026-09-05T23:59:59+07:00');
    assert.equal(selectReminderType({ dueDate, now: new Date('2026-09-03T07:00:00+07:00'), policy }), 'INVOICE_DUE_SOON');
    assert.equal(selectReminderType({ dueDate, now: new Date('2026-09-05T07:00:00+07:00'), policy }), 'INVOICE_DUE_TODAY');
    assert.equal(selectReminderType({ dueDate, now: new Date('2026-09-06T07:00:00+07:00'), policy }), null);
});

test('missing readings are skipped with one aggregate warning and repeated runs stay idempotent', async () => {
    const invoices = new Map();
    const landlordNotifications = new Map();
    const syncedRooms = [];
    const tenantNotifications = new Set();
    const completeContract = {
        _id: 'contract-a',
        fixedRentPrice: 3_000_000,
        electricityPrice: 3_500,
        waterPrice: 15_000,
        services: [],
        tenantId: { _id: 'tenant-a', fullName: 'An' },
        roomId: {
            _id: 'room-a',
            roomCode: 'A-101',
            status: 1,
            lastElectricityReading: 100,
            lastWaterReading: 20,
            draftElectricity: 125,
            draftWater: 23,
        },
    };
    const missingContract = {
        ...completeContract,
        _id: 'contract-b',
        tenantId: { _id: 'tenant-b', fullName: 'Bình' },
        roomId: {
            _id: 'room-b',
            roomCode: 'B-202',
            status: 1,
            lastElectricityReading: 40,
            lastWaterReading: 10,
            draftWater: 12,
        },
    };
    const dependencies = {
        findPolicies: async () => [{
            landlordId: 'landlord-1',
            autoInvoiceEnabled: true,
            invoiceDay: 25,
            dueDay: 5,
            lateFeeGraceDays: 3,
            lateFeeRate: 5,
        }],
        findContracts: async () => [completeContract, missingContract],
        findUtilityServices: async () => [],
        findPreviousInvoice: async () => null,
        findInvoiceByAutomationKey: async (key) => invoices.get(key) || null,
        upsertInvoice: async (key, document) => {
            const existing = invoices.get(key);
            if (existing) return { created: false, invoice: existing };
            const invoice = { _id: `invoice-${invoices.size + 1}`, ...document };
            invoices.set(key, invoice);
            return { created: true, invoice };
        },
        syncRoomReadings: async (roomId) => syncedRooms.push(String(roomId)),
        notifyTenant: async ({ eventKey }) => tenantNotifications.add(eventKey),
        notifyLandlord: async (notification) => landlordNotifications.set(notification.eventKey, notification),
    };

    const now = new Date('2026-08-25T07:00:00+07:00');
    const first = await runAutomaticInvoiceIssuance({ now }, dependencies);
    const second = await runAutomaticInvoiceIssuance({ now }, dependencies);
    const key = buildAutomationKey('landlord-1', 'room-a', '08/2026');

    assert.equal(first.created, 1);
    assert.equal(first.missing, 1);
    assert.equal(second.created, 0);
    assert.equal(second.duplicates, 1);
    assert.equal(invoices.size, 1);
    assert.ok(invoices.has(key));
    assert.equal(vietnamDateKey(invoices.get(key).dueDate), '2026-09-05');
    assert.deepEqual([...new Set(syncedRooms)], ['room-a']);
    assert.equal(tenantNotifications.size, 2, 'invoice and meter notifications are deduplicated');
    assert.equal(landlordNotifications.size, 1);
    const [warning] = landlordNotifications.values();
    assert.match(warning.content, /B-202/);
    assert.doesNotMatch(warning.content, /A-101/);
});
