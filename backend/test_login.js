async function testLogin() {
    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'khach1@trohub.vn',
                password: 'Trohub123456'
            })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(err) {
        console.log(err.message);
    }
}
testLogin();
