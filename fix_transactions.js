const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const Invoice = require('./backend/src/models/Invoice');
const Transaction = require('./backend/src/models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixTransactions() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI phải được cấu hình trong backend/.env.');
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const paidInvoices = await Invoice.find({ status: 2 });
    console.log(`Found ${paidInvoices.length} paid invoices.`);

    let createdCount = 0;

    for (const inv of paidInvoices) {
      const existingTx = await Transaction.findOne({ invoiceId: inv._id });
      if (!existingTx) {
        await Transaction.create({
          invoiceId: inv._id,
          amount: inv.totalAmount || 0,
          method: inv.paymentMethod || 'QR ngân hàng',
          status: 1,
          gatewayReference: inv.transactionCode || `TXN${Date.now().toString().slice(-6)}`
        });
        createdCount++;
      }
    }

    console.log(`Successfully created ${createdCount} missing transactions.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

fixTransactions();
