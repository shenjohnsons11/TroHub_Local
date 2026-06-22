const fetch = require('node-fetch'); // wait, use http or https or node 18 fetch
// Node 18 has fetch globally.

async function test() {
  try {
    // 1. Get a valid tenant token
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nguyenvana@gmail.com", password: "123" }) // assuming some user exists, wait, let me just login as any tenant
    });
    
    // I don't know tenant credentials. 
    // Let's just create a mock document directly to see if the DB / API has an issue.
  } catch (e) {
    console.log("Error:", e);
  }
}
test();
