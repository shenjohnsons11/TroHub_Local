const mongoose = require('mongoose');
const Room = require('./backend/src/models/Room');
const Account = require('./backend/src/models/Account');

mongoose.connect('mongodb://127.0.0.1:27017/trohub_db', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const rooms = await Room.find({});
    console.log("ROOMS:", rooms.map(r => r.roomCode));
    const accounts = await Account.find({});
    console.log("ACCOUNTS:", accounts.map(a => a.username));
    mongoose.connection.close();
  });
