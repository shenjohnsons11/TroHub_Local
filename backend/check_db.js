require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./src/models/Account');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const acc = await Account.findOne({ username: 'khach1@trohub.vn' });
    console.log("Acc:", acc);
    console.log("mustChangePassword:", acc.mustChangePassword);
    process.exit(0);
});
