const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAutomationKey,
    dueDateForPeriod,
    effectiveInvoiceDay,
    runAutomaticInvoiceIssuance,
    runMeterReadingReminders,
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

test('N-1 reminder lists only occupied rooms missing a new reading and opens the scanner', async () => {
    const notifications = [];
    const dependencies = {
        findPolicies: async () => [{ landlordId: 'landlord-1', autoInvoiceEnabled: true, invoiceDay: 25 }],
        findContracts: async () => [
            {
                roomId: { _id: 'room-a', roomCode: 'A-101', status: 1, lastElectricityReading: 10, lastWaterReading: 5, draftElectricity: 12, draftWater: 6 },
            },
            {
                roomId: { _id: 'room-b', roomCode: 'B-202', status: 1, lastElectricityReading: 10, lastWaterReading: 5, draftElectricity: 12 },
            },
            {
                roomId: { _id: 'room-c', roomCode: 'C-303', status: 0, lastElectricityReading: 10, lastWaterReading: 5 },
            },
        ],
        notifyLandlord: async (notification) => notifications.push(notification),
    };

    const result = await runMeterReadingReminders({ now: new Date('2026-08-24T07:00:00+07:00') }, dependencies);

    assert.equal(result.sent, 1);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].title, '⏰ Nhắc nhở chốt điện nước kỳ 08/2026');
    assert.match(notifications[0].content, /Còn 1 phòng \(B-202\) chưa có số mới/);
    assert.equal(notifications[0].deepLink, 'scan_meter');
    assert.deepEqual(notifications[0].metadata.rooms, ['B-202']);
});

test('fixed utility contracts may issue with last readings while metered rooms need new drafts', async () => {
    const invoices = [];
    const notifications = [];
    const dependencies = {
        findPolicies: async () => [{ landlordId: 'landlord-1', autoInvoiceEnabled: true, invoiceDay: 25, dueDay: 5 }],
        findContracts: async () => [
            {
                _id: 'contract-fixed',
                fixedRentPrice: 3_000_000,
                electricityPrice: 3_500,
                waterPrice: 15_000,
                services: [
                    { serviceId: { _id: 'electric-fixed', name: 'Điện', type: 2, billingMode: 'FIXED' }, fixedPrice: 100_000 },
                    { serviceId: { _id: 'water-fixed', name: 'Nước', type: 2, billingMode: 'FIXED' }, fixedPrice: 80_000 },
                ],
                tenantId: { _id: 'tenant-fixed', fullName: 'Cố định' },
                roomId: { _id: 'room-fixed', roomCode: 'F-101', status: 1, lastElectricityReading: 10, lastWaterReading: 5 },
            },
            {
                _id: 'contract-metered',
                fixedRentPrice: 3_000_000,
                electricityPrice: 3_500,
                waterPrice: 15_000,
                services: [],
                tenantId: { _id: 'tenant-metered', fullName: 'Đo đếm' },
                roomId: { _id: 'room-metered', roomCode: 'M-202', status: 1, lastElectricityReading: 10, lastWaterReading: 5 },
            },
        ],
        findUtilityServices: async () => [],
        findPreviousInvoice: async () => null,
        findInvoiceByAutomationKey: async () => null,
        upsertInvoice: async (_key, document) => {
            const invoice = { _id: `invoice-${invoices.length + 1}`, ...document };
            invoices.push(invoice);
            return { created: true, invoice };
        },
        syncRoomReadings: async () => undefined,
        notifyTenant: async () => undefined,
        notifyLandlord: async (notification) => notifications.push(notification),
    };

    const summary = await runAutomaticInvoiceIssuance({ now: new Date('2026-08-25T07:00:00+07:00') }, dependencies);

    assert.equal(summary.created, 1);
    assert.equal(summary.missing, 1);
    assert.equal(invoices[0].room, 'F-101');
    assert.equal(invoices[0].electricityNew, 10);
    assert.equal(invoices[0].waterNew, 5);
    assert.equal(invoices[0].services, 180_000);
    assert.equal(notifications[0].title, '✅ Đã tự động phát hành 1 hóa đơn');
    assert.match(notifications[0].content, /Còn 1 phòng thiếu số/);
});

test('missing readings are skipped with one aggregate summary and repeated runs stay idempotent', async () => {
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
    assert.equal(warning.title, '✅ Đã tự động phát hành 1 hóa đơn');
    assert.match(warning.content, /B-202/);
    assert.doesNotMatch(warning.content, /A-101/);
});
