const { MongoClient } = require("mongodb");
require('dotenv').config();
async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("trohub");
  const accounts = await db.collection("accounts").find().toArray();
  console.log(JSON.stringify(accounts, null, 2));
  await client.close();
}
run();
