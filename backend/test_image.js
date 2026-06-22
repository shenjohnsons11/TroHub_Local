const fetch = require('node-fetch'); // wait node 18 has fetch built in
async function run() {
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "a", password: "123" }) // wait, need a valid tenant
  });
}
run();
