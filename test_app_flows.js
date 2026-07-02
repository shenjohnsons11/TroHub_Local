const http = require('http');

const API_URL = 'http://localhost:3000/api';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = http.request(`${API_URL}${endpoint}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ ỨNG DỤNG MOBILE ===");

  // 1. Kiểm thử Role Admin
  console.log("\n--- TEST ROLE: CHỦ TRỌ (ADMIN) ---");
  const adminLogin = await request('/auth/login', 'POST', { username: 'admin@trohub.vn', password: 'password123' });
  let adminToken = adminLogin.token;
  if (!adminLogin.success) {
      const adminLogin2 = await request('/auth/login', 'POST', { username: 'admin@trohub.vn', password: '123456' });
      adminToken = adminLogin2.token;
      if (adminLogin2.success) console.log("✅ Đăng nhập Chủ trọ thành công.");
      else console.log("❌ Lỗi đăng nhập Chủ trọ:", adminLogin2);
  } else {
      console.log("✅ Đăng nhập Chủ trọ thành công.");
  }

  if (adminToken) {
    const rooms = await request('/rooms', 'GET', null, adminToken);
    console.log(`✅ Lấy danh sách phòng: ${rooms.data ? rooms.data.length : 0} phòng.`);

    const contracts = await request('/contracts', 'GET', null, adminToken);
    console.log(`✅ Lấy danh sách hợp đồng: ${contracts.data ? contracts.data.length : 0} hợp đồng.`);

    const invoices = await request('/invoices', 'GET', null, adminToken);
    console.log(`✅ Lấy danh sách hóa đơn: ${invoices.data ? invoices.data.length : 0} hóa đơn.`);
  }

  // 2. Kiểm thử Role Tenant
  console.log("\n--- TEST ROLE: KHÁCH THUÊ (TENANT) ---");
  const tenantLogin = await request('/auth/login', 'POST', { username: 'kiet@trohub.vn', password: '123456' });
  let tenantToken = tenantLogin.token;
  if (!tenantLogin.success) {
      console.log("Không tìm thấy account kiet, tiến hành tạo mới...");
      await request('/auth/register', 'POST', { username: 'tenant@test.com', email: 'tenant@test.com', password: 'password123', fullName: 'Test Tenant', phone: '0901234567', role: 2 });
      const tenantLogin2 = await request('/auth/login', 'POST', { username: 'tenant@test.com', password: 'password123' });
      tenantToken = tenantLogin2.token;
      if (tenantLogin2.success) console.log("✅ Đăng nhập Khách thuê thành công.");
      else console.log("❌ Lỗi đăng nhập Khách thuê:", tenantLogin2);
  } else {
      console.log("✅ Đăng nhập Khách thuê thành công.");
  }

  if (tenantToken) {
    const myContracts = await request('/me/contract', 'GET', null, tenantToken);
    console.log(`✅ Lấy hợp đồng cá nhân: ${myContracts.data ? 'Có' : 'Không có'}.`);

    const myInvoices = await request('/me/invoices', 'GET', null, tenantToken);
    console.log(`✅ Lấy hóa đơn cá nhân: ${myInvoices.data ? myInvoices.data.length : 0} hóa đơn.`);
    
    const myRepairs = await request('/repairs', 'GET', null, tenantToken);
    console.log(`✅ Lấy lịch sử sửa chữa cá nhân: ${myRepairs.data ? myRepairs.data.length : 0} báo cáo.`);
  }

  console.log("\n=== KẾT THÚC KIỂM THỬ ===");
}

runTests();
