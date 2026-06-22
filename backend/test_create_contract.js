async function test() {
  try {
    const res = await fetch("http://localhost:5000/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "6a2482314c797c46352fcb79", // existing A101 room
        tenantId: "6a2482314c797c46352fcb78", // existing tenant
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        fixedRentPrice: 2500000,
        fixedDeposit: 2500000,
        services: []
      })
    });
    console.log("Create Contract Status:", res.status);
    console.log("Create Contract Body:", await res.text());
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}
test();
