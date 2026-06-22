const { MongoClient } = require("mongodb");
async function run() {
  const uri = "mongodb://127.0.0.1:27017";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("trohub");
  const accounts = await db.collection("accounts").find().toArray();
  console.log(JSON.stringify(accounts, null, 2));
  await client.close();
}
run();
