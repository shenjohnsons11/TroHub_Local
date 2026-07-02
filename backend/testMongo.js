const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
if (uri) {
  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log("Connecting to:", maskedUri);
}
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("✅ Success!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  });
