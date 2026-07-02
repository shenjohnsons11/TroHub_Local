require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await Account.updateMany({ role: 2 }, { mustChangePassword: true });
    console.log("Updated all existing tenants to mustChangePassword=true");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
