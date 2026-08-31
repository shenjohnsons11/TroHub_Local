const BillingPolicy = require('../models/BillingPolicy');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Room = require('../models/Room');
const { createAndDeliverNotification } = require('./notificationService');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function vietnamDateKey(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value);
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateKeyToDay(key) {
    return Date.parse(`${key}T00:00:00Z`) / 86_400_000;
}

function selectReminderType({ dueDate, now, policy }) {
    const enabled = policy?.autoRemindEnabled ?? policy?.automaticRemindersEnabled;
    if (!enabled || !dueDate) return null;
    const difference = dateKeyToDay(vietnamDateKey(dueDate)) - dateKeyToDay(vietnamDateKey(now));
    const beforeDays = policy.remindDaysBeforeDue !== undefined
        ? [Number(policy.remindDaysBeforeDue)]
        : policy.remindBeforeDueDays;
    if (difference > 0 && beforeDays?.includes(difference)) return 'INVOICE_DUE_SOON';
    if (difference === 0 && (policy.autoRemindEnabled !== undefined || policy.remindOnDueDate)) return 'INVOICE_DUE_TODAY';
    if (policy.autoRemindEnabled !== undefined) return null;
    if (difference < 0 && policy.remindAfterOverdueDays?.includes(Math.abs(difference))) return 'INVOICE_OVERDUE';
    return null;
}

const buildReminderKey = (invoiceId, type, scheduleDate) => (
    `invoice:${invoiceId}:${type}:${scheduleDate}`
);

const defaultDependencies = {
    findPolicies: () => BillingPolicy.find({
        $or: [
            { autoRemindEnabled: true },
            { autoRemindEnabled: { $exists: false }, automaticRemindersEnabled: true },
        ],
    }).lean(),
    findInvoices: async (landlordId) => {
        const rooms = await Room.find({ landlordId }).select('_id').lean();
        const contracts = await Contract.find({
            roomId: { $in: rooms.map((room) => room._id) },
        }).select('_id tenantId').lean();
        return Invoice.find({
            contractId: { $in: contracts.map((contract) => contract._id) },
            status: 1,
            dueDate: { $type: 'date' },
        }).populate('contractId', 'tenantId').lean();
    },
    deliver: createAndDeliverNotification,
};

async function runAutomaticInvoiceReminders(
    { now = new Date() } = {},
    dependencies = defaultDependencies,
) {
    const summary = { sent: 0, skipped: 0, failed: 0 };
    const policies = await dependencies.findPolicies();
    for (const policy of policies) {
        const invoices = await dependencies.findInvoices(policy.landlordId);
        for (const invoice of invoices) {
            const type = selectReminderType({ dueDate: invoice.dueDate, now, policy });
            if (!type) {
                summary.skipped += 1;
                continue;
            }
            try {
                if (!invoice.contractId?.tenantId) {
                    summary.skipped += 1;
                    continue;
                }
                await dependencies.deliver({
                    recipientId: String(invoice.contractId.tenantId),
                    type,
                    title: type === 'INVOICE_DUE_TODAY' ? 'Hôm nay đến hạn thanh toán' : 'Sắp đến hạn thanh toán',
                    message: `Hóa đơn kỳ ${invoice.period} đang chờ thanh toán.`,
                    entityType: 'INVOICE',
                    entityId: String(invoice._id),
                    deepLink: `/invoice?id=${invoice._id}&payment=true`,
                    deduplicationKey: buildReminderKey(invoice._id, type, vietnamDateKey(now)),
                });
                summary.sent += 1;
            } catch (error) {
                if (error?.code === 11000) summary.skipped += 1;
                else summary.failed += 1;
            }
        }
    }
    return summary;
}

module.exports = {
    buildReminderKey,
    runAutomaticInvoiceReminders,
    selectReminderType,
    vietnamDateKey,
};
