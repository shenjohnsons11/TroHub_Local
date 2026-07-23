const Invoice = require('../models/Invoice');

class OverdueInvoiceValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'OverdueInvoiceValidationError';
        this.code = 'INVALID_INVOICE_ISSUED_AT';
        this.field = field;
    }
}

const HCM_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;

function parseIssuedAt(value) {
    const dateText = value instanceof Date
        ? value.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        : String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        throw new OverdueInvoiceValidationError(
            'Ngày phát hành không hợp lệ.',
            'issuedAt'
        );
    }
    const issuedAt = new Date(`${dateText}T00:00:00${HCM_OFFSET}`);
    if (Number.isNaN(issuedAt.getTime())) {
        throw new OverdueInvoiceValidationError(
            'Ngày phát hành không hợp lệ.',
            'issuedAt'
        );
    }
    return issuedAt;
}

function buildLateFeeSnapshot({
    issuedAt,
    graceDays,
    penaltyRate,
    penaltyBaseAmount,
    now = new Date(),
}) {
    const normalizedIssuedAt = parseIssuedAt(issuedAt);
    const todayText = now.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
    });
    const today = new Date(`${todayText}T00:00:00${HCM_OFFSET}`);
    if (normalizedIssuedAt > today) {
        throw new OverdueInvoiceValidationError(
            'Ngày phát hành không được nằm trong tương lai.',
            'issuedAt'
        );
    }

    const normalizedGraceDays = Number(graceDays);
    const normalizedPenaltyRate = Number(penaltyRate);
    const normalizedBaseAmount = Number(penaltyBaseAmount);
    if (!Number.isInteger(normalizedGraceDays) || normalizedGraceDays < 0) {
        throw new OverdueInvoiceValidationError('Số ngày ân hạn không hợp lệ.', 'graceDays');
    }
    if (!Number.isFinite(normalizedPenaltyRate) || normalizedPenaltyRate < 0) {
        throw new OverdueInvoiceValidationError('Tỷ lệ phạt không hợp lệ.', 'penaltyRate');
    }
    if (!Number.isFinite(normalizedBaseAmount) || normalizedBaseAmount < 0) {
        throw new OverdueInvoiceValidationError('Tổng hóa đơn không hợp lệ.', 'penaltyBaseAmount');
    }

    const overdueAt = new Date(
        normalizedIssuedAt.getTime() + (normalizedGraceDays + 1) * DAY_MS
    );
    return {
        issuedAt: normalizedIssuedAt,
        graceDaysSnapshot: normalizedGraceDays,
        penaltyRateSnapshot: normalizedPenaltyRate,
        penaltyBaseAmount: Math.round(normalizedBaseAmount),
        overdueAt,
        penalty: Math.round(normalizedBaseAmount * normalizedPenaltyRate / 100),
        isOverdue: now >= overdueAt,
    };
}

async function applyOverduePenalty(invoiceId, now = new Date()) {
    return Invoice.findOneAndUpdate(
        {
            _id: invoiceId,
            status: { $in: [1, 3] },
            penaltyAppliedAt: null,
            overdueAt: { $lte: now },
        },
        [
            {
                $set: {
                    status: 3,
                    penalty: {
                        $round: [{
                            $multiply: [
                                '$penaltyBaseAmount',
                                { $divide: ['$penaltyRateSnapshot', 100] },
                            ],
                        }, 0],
                    },
                    totalAmount: {
                        $add: [
                            '$penaltyBaseAmount',
                            {
                                $round: [{
                                    $multiply: [
                                        '$penaltyBaseAmount',
                                        { $divide: ['$penaltyRateSnapshot', 100] },
                                    ],
                                }, 0],
                            },
                        ],
                    },
                    penaltyAppliedAt: now,
                },
            },
        ],
        { new: true, updatePipeline: true }
    );
}

async function applyAllOverduePenalties(now = new Date()) {
    return Invoice.updateMany(
        {
            status: { $in: [1, 3] },
            penaltyAppliedAt: null,
            overdueAt: { $lte: now },
        },
        [
            {
                $set: {
                    status: 3,
                    penalty: {
                        $round: [{
                            $multiply: [
                                '$penaltyBaseAmount',
                                { $divide: ['$penaltyRateSnapshot', 100] },
                            ],
                        }, 0],
                    },
                    totalAmount: {
                        $add: [
                            '$penaltyBaseAmount',
                            {
                                $round: [{
                                    $multiply: [
                                        '$penaltyBaseAmount',
                                        { $divide: ['$penaltyRateSnapshot', 100] },
                                    ],
                                }, 0],
                            },
                        ],
                    },
                    penaltyAppliedAt: now,
                },
            },
        ],
        { updatePipeline: true }
    );
}

module.exports = {
    OverdueInvoiceValidationError,
    applyAllOverduePenalties,
    applyOverduePenalty,
    buildLateFeeSnapshot,
};
