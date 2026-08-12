const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const Transaction = require('./backend/src/models/Transaction');
const Invoice = require('./backend/src/models/Invoice');
const Contract = require('./backend/src/models/Contract');
const Account = require('./backend/src/models/Account');

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI phải được cấu hình trong backend/.env.');
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');

    const accs = await Account.find({});
    console.log('Accounts:', accs.length);

    const cons = await Contract.find({});
    console.log('Contracts:', cons.length);

    const invs = await Invoice.find({});
    console.log('Invoices:', invs.length);

    const trans = await Transaction.find({});
    console.log('Transactions:', trans.length);

    process.exit(0);
  });
