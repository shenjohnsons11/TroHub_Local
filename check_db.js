const mongoose = require('mongoose');
const Transaction = require('./backend/src/models/Transaction');
const Invoice = require('./backend/src/models/Invoice');
const Contract = require('./backend/src/models/Contract');
const Account = require('./backend/src/models/Account');

mongoose.connect("mongodb+srv://trohub:Trohub123456@trohub.c8y8cdl.mongodb.net/trohub?retryWrites=true&w=majority&appName=TroHub")
  .then(async () => {
    console.log("Connected to MongoDB.");
    
    const accs = await Account.find({});
    console.log("Accounts:", accs.length);
    
    const cons = await Contract.find({});
    console.log("Contracts:", cons.length);
    
    const invs = await Invoice.find({});
    console.log("Invoices:", invs.length);
    
    const trans = await Transaction.find({});
    console.log("Transactions:", trans.length);
    
    process.exit(0);
  });
