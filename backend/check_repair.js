const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/trohub_db');
const RepairRequest = require('./src/models/RepairRequest');
async function run() {
  const reqs = await RepairRequest.find().sort({ createdAt: -1 }).limit(1);
  if (reqs.length > 0) {
    console.log("Latest repair request ID:", reqs[0]._id);
    console.log("Status:", reqs[0].status);
    console.log("Priority:", reqs[0].priority);
    console.log("Images count:", reqs[0].images ? reqs[0].images.length : 0);
    if (reqs[0].images && reqs[0].images.length > 0) {
      console.log("First image start:", reqs[0].images[0].substring(0, 50));
    }
  } else {
    console.log("No repair requests found.");
  }
  process.exit(0);
}
run();
