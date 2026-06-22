async function test() {
  try {
    const res = await fetch("http://localhost:5000/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: "A999",
        area: 25,
        defaultRentPrice: 2500000,
        defaultDeposit: 2500000,
        landlordId: "6a2482314c797c46352fcb77",
        status: 0
      })
    });
    console.log("Create Room Status:", res.status);
    console.log("Create Room Body:", await res.text());
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}
test();
