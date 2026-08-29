const BillingPolicy = require('../models/BillingPolicy');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Room = require('../models/Room');
const Service = require('../models/Service');
const { calculateInvoiceAmounts } = require('./invoiceCalculator');
const {
    resolveContractMeterSnapshot,
    resolveUtilityPriceDefaults,
} = require('./contractTerms');
const { sendNotification } = require('./notificationService');
const { runAutomaticInvoiceReminders } = require('./invoiceReminderScheduler');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;

function vietnamDateParts(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value);
    const read = (type) => Number(parts.find((part) => part.type === type)?.value);
    return { year: read('year'), month: read('month'), day: read('day') };
}

function vietnamDateKey(value = new Date()) {
    const { year, month, day } = vietnamDateParts(value);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function effectiveInvoiceDay(year, month, invoiceDay) {
    return Math.min(Number(invoiceDay), daysInMonth(year, month));
}

function periodForDate(value = new Date()) {
    const { year, month } = vietnamDateParts(value);
    return `${String(month).padStart(2, '0')}/${year}`;
}

function dueDateForPeriod(period, dueDay) {
    const [monthText, yearText] = String(period).split('/');
    const month = Number(monthText);
    const year = Number(yearText);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const day = Math.min(Number(dueDay), daysInMonth(nextYear, nextMonth));
    return new Date(
        `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+07:00`,
    );
}

function buildAutomationKey(landlordId, roomId, period) {
    return `${String(landlordId)}:${String(roomId)}:${period}`;
}

function fixedServiceTotals(contract) {
    const totals = { services: 0, parking: 0, internet: 0, garbage: 0, details: [] };
    for (const item of contract.services || []) {
        const service = item.serviceId;
        if (!service || Number(service.type) === 1 || service.billingMode === 'METER') continue;
        const amount = Math.max(0, Number(item.fixedPrice) || 0);
        const name = String(service.name || '').toLowerCase();
        if (name.includes('xe') || name.includes('parking')) totals.parking += amount;
        else if (name.includes('wifi') || name.includes('internet') || name.includes('mạng') || name.includes('mang')) totals.internet += amount;
        else if (name.includes('rác') || name.includes('rac') || name.includes('vệ sinh')) totals.garbage += amount;
        else totals.services += amount;
        totals.details.push({
            serviceId: service._id,
            serviceName: service.name,
            serviceCode: service.code,
            billingMode: service.billingMode || 'FIXED',
            unit: service.unit,
            quantity: 1,
            appliedPrice: amount,
            amount,
        });
    }
    return totals;
}

async function finalizeInvoice(invoice, contract, dependencies) {
    await dependencies.syncRoomReadings(contract.roomId._id, invoice);
    const tenantId = contract.tenantId?._id || contract.tenantId;
    if (!tenantId) return;
    await dependencies.notifyTenant({
        userId: tenantId,
        title: `Hóa đơn mới kỳ ${invoice.period}`,
        content: `Hóa đơn phòng ${invoice.room} kỳ ${invoice.period} với tổng tiền ${Number(invoice.totalAmount || 0).toLocaleString('vi-VN')}đ đã phát hành.`,
        category: 'invoice',
        deepLink: 'invoice',
        metadata: { invoiceId: invoice._id, period: invoice.period, action: 'view' },
        eventKey: `invoice:${invoice._id}:issued`,
    });
    await dependencies.notifyTenant({
        userId: tenantId,
        title: `Đã chốt chỉ số điện nước kỳ ${invoice.period}`,
        content: `Điện ${invoice.electricityOld} → ${invoice.electricityNew} kWh, nước ${invoice.waterOld} → ${invoice.waterNew} m³.`,
        category: 'utility',
        deepLink: 'utility',
        metadata: { roomId: contract.roomId._id, period: invoice.period },
        eventKey: `utility:${invoice._id}:confirmed`,
    });
}

const defaultDependencies = {
    findPolicies: () => BillingPolicy.find({ autoInvoiceEnabled: true }).lean(),
    findContracts: async (landlordId) => {
        const rooms = await Room.find({ landlordId, status: 1 }).select('_id').lean();
        return Contract.find({
            roomId: { $in: rooms.map((room) => room._id) },
            status: 1,
        })
            .populate('roomId', 'roomCode status draftElectricity draftWater lastElectricityReading lastWaterReading')
            .populate('tenantId', '_id fullName')
            .populate('services.serviceId', 'name code type billingMode unit defaultPrice defaultQuantity')
            .lean();
    },
    findUtilityServices: (landlordId) => Service.find({
        landlordId,
        isActive: true,
        $or: [{ type: 1 }, { billingMode: 'METER' }],
    }).lean(),
    findPreviousInvoice: (contractId) => Invoice.findOne({
        contractId,
        status: { $in: [1, 2, 3] },
    }).sort({ createdAt: -1 }).lean(),
    findInvoiceByAutomationKey: (automationKey) => Invoice.findOne({ automationKey }),
    upsertInvoice: async (automationKey, document) => {
        let result;
        try {
            result = await Invoice.updateOne(
                { automationKey },
                { $setOnInsert: document },
                { upsert: true },
            );
        } catch (error) {
            if (error?.code !== 11000) throw error;
            result = { upsertedCount: 0 };
        }
        return {
            created: result.upsertedCount === 1,
            invoice: await Invoice.findOne({ automationKey }),
        };
    },
    syncRoomReadings: (roomId, invoice) => Room.findByIdAndUpdate(roomId, {
        $set: {
            lastElectricityReading: invoice.electricityNew,
            lastWaterReading: invoice.waterNew,
        },
        $unset: { draftElectricity: '', draftWater: '' },
    }),
    notifyTenant: sendNotification,
    notifyLandlord: sendNotification,
};

async function runAutomaticInvoiceIssuance(
    { now = new Date() } = {},
    dependencies = defaultDependencies,
) {
    const summary = { created: 0, duplicates: 0, missing: 0, failed: 0 };
    const { year, month, day } = vietnamDateParts(now);
    const period = periodForDate(now);
    const policies = await dependencies.findPolicies();

    for (const policy of policies) {
        if (policy.autoInvoiceEnabled === false) continue;
        if (day !== effectiveInvoiceDay(year, month, policy.invoiceDay ?? 25)) continue;

        const landlordId = policy.landlordId?._id || policy.landlordId;
        const [contracts, utilityServices] = await Promise.all([
            dependencies.findContracts(landlordId),
            dependencies.findUtilityServices(landlordId),
        ]);
        const utilityDefaults = resolveUtilityPriceDefaults(utilityServices);
        const incompleteRooms = [];

        for (const contract of contracts) {
            const room = contract.roomId;
            if (!room || Number(room.status) !== 1) continue;
            const automationKey = buildAutomationKey(landlordId, room._id, period);
            try {
                const existing = await dependencies.findInvoiceByAutomationKey(automationKey);
                if (existing) {
                    summary.duplicates += 1;
                    await finalizeInvoice(existing, contract, dependencies);
                    continue;
                }

                const previousInvoice = await dependencies.findPreviousInvoice(contract._id);
                const meter = resolveContractMeterSnapshot(contract, previousInvoice, room, utilityDefaults);
                const electricityNew = room.draftElectricity;
                const waterNew = room.draftWater;
                const hasBothReadings = electricityNew !== undefined
                    && electricityNew !== null
                    && electricityNew !== ''
                    && waterNew !== undefined
                    && waterNew !== null
                    && waterNew !== '';
                const validReadings = hasBothReadings
                    && Number.isFinite(Number(electricityNew))
                    && Number.isFinite(Number(waterNew))
                    && Number(electricityNew) >= meter.electricityOld
                    && Number(waterNew) >= meter.waterOld;
                if (!validReadings) {
                    incompleteRooms.push(room.roomCode || String(room._id));
                    summary.missing += 1;
                    continue;
                }

                const serviceTotals = fixedServiceTotals(contract);
                const amounts = calculateInvoiceAmounts({
                    roomAmount: contract.fixedRentPrice || 0,
                    electricityOld: meter.electricityOld,
                    electricityNew,
                    electricityPrice: meter.electricityPrice,
                    waterOld: meter.waterOld,
                    waterNew,
                    waterPrice: meter.waterPrice,
                    services: serviceTotals.services,
                    parking: serviceTotals.parking,
                    internet: serviceTotals.internet,
                    garbage: serviceTotals.garbage,
                    discount: 0,
                    penalty: 0,
                });
                const dueDate = dueDateForPeriod(period, policy.dueDay ?? 5);
                const invoiceDocument = {
                    automationKey,
                    contractId: contract._id,
                    period,
                    issuedAt: now,
                    dueDate,
                    graceDaysSnapshot: policy.lateFeeGraceDays ?? 3,
                    penaltyRateSnapshot: policy.lateFeeRate ?? 5,
                    overdueAt: new Date(dueDate.getTime() + (policy.lateFeeGraceDays ?? 3) * DAY_MS),
                    penaltyBaseAmount: amounts.totalAmount,
                    penaltyAppliedAt: null,
                    penalty: 0,
                    totalAmount: amounts.totalAmount,
                    status: 1,
                    room: room.roomCode || '',
                    tenant: contract.tenantId?.fullName || '',
                    roomAmount: amounts.roomAmount,
                    electricityOld: amounts.electricityOld,
                    electricityNew: amounts.electricityNew,
                    electricity: amounts.electricity,
                    waterOld: amounts.waterOld,
                    waterNew: amounts.waterNew,
                    water: amounts.water,
                    services: amounts.services,
                    parking: amounts.parking,
                    internet: amounts.internet,
                    garbage: amounts.garbage,
                    discount: amounts.discount,
                    details: serviceTotals.details,
                };
                const result = await dependencies.upsertInvoice(automationKey, invoiceDocument);
                if (result.created) summary.created += 1;
                else summary.duplicates += 1;
                if (result.invoice) await finalizeInvoice(result.invoice, contract, dependencies);
            } catch (_error) {
                summary.failed += 1;
            }
        }

        if (incompleteRooms.length) {
            await dependencies.notifyLandlord({
                userId: landlordId,
                title: `Thiếu chỉ số điện nước kỳ ${period}`,
                content: `Đã bỏ qua ${incompleteRooms.length} phòng chưa đủ chỉ số: ${incompleteRooms.join(', ')}. Vui lòng cập nhật để phát hành bổ sung.`,
                category: 'utility',
                deepLink: 'utility',
                metadata: { period, rooms: incompleteRooms },
                eventKey: `billing:${landlordId}:${period}:missing-readings`,
            });
        }
    }
    return summary;
}

async function runMeterReadingReminders(
    { now = new Date() } = {},
    dependencies = defaultDependencies,
) {
    const tomorrow = new Date(now.getTime() + DAY_MS);
    const parts = vietnamDateParts(tomorrow);
    const period = periodForDate(tomorrow);
    let sent = 0;
    const policies = await dependencies.findPolicies();
    for (const policy of policies) {
        if (policy.autoInvoiceEnabled === false) continue;
        if (parts.day !== effectiveInvoiceDay(parts.year, parts.month, policy.invoiceDay ?? 25)) continue;
        const landlordId = policy.landlordId?._id || policy.landlordId;
        await dependencies.notifyLandlord({
            userId: landlordId,
            title: `Ngày mai chốt hóa đơn kỳ ${period}`,
            content: `Hãy cập nhật chỉ số điện nước cho toàn bộ phòng đang thuê trước khi hệ thống phát hành hóa đơn tự động.`,
            category: 'utility',
            deepLink: 'utility',
            metadata: { period },
            eventKey: `billing:${landlordId}:${period}:meter-reminder`,
        });
        sent += 1;
    }
    return { sent };
}

async function runDailyBillingAutomation({ now = new Date() } = {}) {
    const [meterReminders, issuance] = await Promise.all([
        runMeterReadingReminders({ now }),
        runAutomaticInvoiceIssuance({ now }),
    ]);
    const debtReminders = await runAutomaticInvoiceReminders({ now });
    return { meterReminders, issuance, debtReminders };
}

function startBillingScheduler({ cronModule, logger = console } = {}) {
    const cron = cronModule || require('node-cron');
    return cron.schedule('0 7 * * *', async () => {
        try {
            const result = await runDailyBillingAutomation();
            logger.info('[BILLING_SCHEDULER]', result);
        } catch (error) {
            logger.error('[BILLING_SCHEDULER] Automation failed:', error.message);
        }
    }, { timezone: TIME_ZONE });
}

module.exports = {
    TIME_ZONE,
    buildAutomationKey,
    dueDateForPeriod,
    effectiveInvoiceDay,
    periodForDate,
    runAutomaticInvoiceIssuance,
    runDailyBillingAutomation,
    runMeterReadingReminders,
    startBillingScheduler,
    vietnamDateKey,
    vietnamDateParts,
};
