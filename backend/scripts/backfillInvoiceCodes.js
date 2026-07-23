require('dotenv').config();

const { buildInvoiceCode } = require('../src/services/invoiceCode');

function buildMissingCodeFilter() {
    return {
        $or: [
            { invoiceCode: { $exists: false } },
            { invoiceCode: '' },
            { invoiceCode: null },
        ],
    };
}

async function planInvoiceCodeBackfill(dependencies) {
    const invoices = await dependencies.findMissing(buildMissingCodeFilter());
    const reservedCodes = new Set();
    const updates = [];
    const skipped = [];

    for (const invoice of invoices) {
        const id = String(invoice._id);
        try {
            const roomCode = invoice.contractId?.roomId?.roomCode || invoice.roomCode || invoice.room;
            const baseCode = buildInvoiceCode({ period: invoice.period, roomCode });
            let invoiceCode = baseCode;
            let sequence = 2;

            while (reservedCodes.has(invoiceCode) || await dependencies.codeExists(invoiceCode)) {
                invoiceCode = `${baseCode}-${String(sequence).padStart(2, '0')}`;
                sequence += 1;
            }

            reservedCodes.add(invoiceCode);
            updates.push({ id, invoiceCode });
        } catch (error) {
            skipped.push({ id, reason: error.message });
        }
    }

    return { updates, skipped };
}

async function applyInvoiceCodeBackfill(plan, dependencies) {
    if (dependencies.dryRun) {
        return { applied: 0, skipped: plan.skipped.length };
    }

    for (const item of plan.updates) {
        await dependencies.update(item.id, item.invoiceCode);
    }
    return { applied: plan.updates.length, skipped: plan.skipped.length };
}

async function runCli() {
    const mongoose = require('mongoose');
    const Invoice = require('../src/models/Invoice');
    require('../src/models/Contract');
    require('../src/models/Room');
    const dryRun = !process.argv.includes('--apply');

    if (!process.env.MONGODB_URI) {
        throw new Error('Thiếu MONGODB_URI; migration chưa thực hiện thay đổi dữ liệu.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const plan = await planInvoiceCodeBackfill({
            findMissing: (filter) => Invoice.find(filter)
                .populate({ path: 'contractId', populate: { path: 'roomId', select: 'roomCode' } })
                .sort({ createdAt: 1, _id: 1 })
                .lean(),
            codeExists: (invoiceCode) => Invoice.exists({ invoiceCode }),
        });

        const result = await applyInvoiceCodeBackfill(plan, {
            dryRun,
            update: (id, invoiceCode) => Invoice.updateOne(
                {
                    _id: id,
                    $or: [
                        { invoiceCode: { $exists: false } },
                        { invoiceCode: '' },
                        { invoiceCode: null },
                    ],
                },
                { $set: { invoiceCode } }
            ),
        });

        console.log(JSON.stringify({
            mode: dryRun ? 'dry-run' : 'apply',
            planned: plan.updates.length,
            applied: result.applied,
            skipped: plan.skipped,
            updates: plan.updates,
        }, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    runCli().catch((error) => {
        console.error(`[INVOICE_CODE_MIGRATION] ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    applyInvoiceCodeBackfill,
    buildMissingCodeFilter,
    planInvoiceCodeBackfill,
};
