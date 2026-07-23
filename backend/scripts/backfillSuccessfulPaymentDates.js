function buildBackfillFilter() {
    return {
        status: 1,
        paidAt: null,
        updatedAt: { $type: 'date' },
    };
}

function buildBackfillUpdate() {
    return [
        { $set: { paidAt: '$updatedAt' } },
    ];
}

async function run() {
    require('dotenv').config();
    const mongoose = require('mongoose');
    const connectDB = require('../src/configs/db');
    const Transaction = require('../src/models/Transaction');
    const apply = process.argv.includes('--apply');

    await connectDB();
    const filter = buildBackfillFilter();
    const matched = await Transaction.countDocuments(filter);

    if (!apply) {
        console.log(`[PAYMENT_DATE_BACKFILL] Dry-run: ${matched} giao dịch cần cập nhật.`);
        await mongoose.disconnect();
        return;
    }

    const result = await Transaction.updateMany(
        filter,
        buildBackfillUpdate(),
        { updatePipeline: true },
    );
    console.log(
        `[PAYMENT_DATE_BACKFILL] Đã kiểm tra ${matched}, cập nhật ${result.modifiedCount}.`,
    );
    await mongoose.disconnect();
}

if (require.main === module) {
    run().catch((error) => {
        console.error('[PAYMENT_DATE_BACKFILL] Thất bại:', error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    buildBackfillFilter,
    buildBackfillUpdate,
};
