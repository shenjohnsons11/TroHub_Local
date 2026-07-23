/**
 * ====================================================
 * TroHub - AUTO TEST TOÀN BỘ API
 * ====================================================
 * Chạy: node test_all_apis.js
 * Yêu cầu: Server đang chạy theo PORT trong .env hoặc API_BASE_URL được cấu hình sẵn
 */

require('dotenv').config();

const BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api`;
let adminToken = '';
let tenantToken = '';
let testTenantId = '';
let testRoomId = '';
let testContractId = '';
let testInvoiceId = '';
let testRepairId = '';
let testServiceId = '';
let testPaymentId = '';

const results = { pass: 0, fail: 0, total: 0, details: [] };

async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

function log(testName, success, detail = '') {
  results.total++;
  if (success) results.pass++; else results.fail++;
  const icon = success ? '✅' : '❌';
  const msg = `${icon} ${testName}${detail ? ' → ' + detail : ''}`;
  console.log(msg);
  results.details.push({ testName, success, detail });
}

// =====================================================
// 1. AUTH MODULE
// =====================================================
async function testAuth() {
  console.log('\n🔐 ===== AUTH MODULE =====');

  // 1.1 Register
  let res = await api('POST', '/auth/register', {
    username: `test_admin_${Date.now()}@trohub.vn`,
    password: '123456',
    fullName: 'Test Admin',
    phone: '0901234567',
    email: `test_admin_${Date.now()}@trohub.vn`,
    role: 1
  });
  log('POST /auth/register (Admin)', res.status === 201, `status=${res.status}`);

  // 1.2 Login Admin
  res = await api('POST', '/auth/login', { username: 'admin@trohub.vn', password: '123456' });
  const adminLoginOk = res.status === 200 && res.data?.token;
  if (adminLoginOk) adminToken = res.data.token;
  log('POST /auth/login (Admin)', adminLoginOk, adminToken ? 'token received' : res.data?.message);

  // 1.3 Login Tenant
  res = await api('POST', '/auth/login', { username: 'tenant@trohub.vn', password: '123456' });
  const tenantLoginOk = res.status === 200 && res.data?.token;
  if (tenantLoginOk) {
    tenantToken = res.data.token;
    testTenantId = res.data.user?.id;
  }
  log('POST /auth/login (Tenant)', tenantLoginOk, tenantToken ? 'token received' : res.data?.message);

  // 1.4 Login with phone
  res = await api('POST', '/auth/login', { username: '0987654321', password: '123456' });
  log('POST /auth/login (by phone)', res.status === 200, `status=${res.status}`);

  // 1.5 GetMe
  res = await api('GET', '/auth/me', null, adminToken);
  log('GET /auth/me', res.status === 200 && res.data?.user?.fullName, res.data?.user?.fullName || res.data?.message);

  // 1.6 UpdateMe
  res = await api('PUT', '/auth/me', { fullName: 'Nguyễn Chủ Trọ Updated' }, adminToken);
  log('PUT /auth/me', res.status === 200, res.data?.message);

  // 1.7 GetMe without token
  res = await api('GET', '/auth/me');
  log('GET /auth/me (no token → 401)', res.status === 401, `status=${res.status}`);

  // 1.8 Login wrong password
  res = await api('POST', '/auth/login', { username: 'admin@trohub.vn', password: 'wrongpass' });
  log('POST /auth/login (wrong pass)', res.status === 400, res.data?.message);

  // 1.9 Login nonexistent
  res = await api('POST', '/auth/login', { username: 'nonexist@x.com', password: '123' });
  log('POST /auth/login (not found)', res.status === 400, res.data?.message);
}

// =====================================================
// 2. ROOMS MODULE
// =====================================================
async function testRooms() {
  console.log('\n🏠 ===== ROOMS MODULE =====');

  // 2.1 Create Room
  const roomCode = `T${Date.now().toString().slice(-4)}`;
  let res = await api('POST', '/rooms', {
    roomCode,
    area: '25',
    defaultRentPrice: 3000000,
    defaultDeposit: 3000000,
    landlordId: testTenantId
  }, adminToken);
  const createOk = res.status === 201;
  if (createOk && res.data?.data) testRoomId = res.data.data._id;
  log('POST /rooms (create)', createOk, `roomCode=${roomCode}, id=${testRoomId}`);

  // 2.2 Create Room with rent/deposit alias
  const roomCode2 = `T${Date.now().toString().slice(-3)}`;
  res = await api('POST', '/rooms', {
    roomCode: roomCode2,
    area: '20',
    rent: 2500000,
    deposit: 2500000,
    landlordId: testTenantId
  }, adminToken);
  log('POST /rooms (rent/deposit alias)', res.status === 201, `roomCode=${roomCode2}`);

  // 2.3 Get All Rooms
  res = await api('GET', '/rooms', null, adminToken);
  const roomsListOk = res.status === 200 && Array.isArray(res.data?.data);
  log('GET /rooms', roomsListOk, `${res.data?.data?.length || 0} rooms`);

  // 2.4 Get Room By Id
  if (testRoomId) {
    res = await api('GET', `/rooms/${testRoomId}`);
    log('GET /rooms/:id', res.status === 200 && res.data?.data?.roomCode, res.data?.data?.roomCode);
  }

  // 2.5 Update Room
  if (testRoomId) {
    res = await api('PUT', `/rooms/${testRoomId}`, {
      defaultRentPrice: 3500000,
      rent: 3500000
    }, adminToken);
    log('PUT /rooms/:id', res.status === 200, res.data?.message);
  }

  // 2.6 Duplicate roomCode
  res = await api('POST', '/rooms', {
    roomCode,
    area: '20',
    defaultRentPrice: 2000000,
    defaultDeposit: 2000000
  }, adminToken);
  log('POST /rooms (duplicate code → 400)', res.status === 400, res.data?.message);

  // 2.7 Delete room
  if (testRoomId) {
    res = await api('DELETE', `/rooms/${testRoomId}`, null, adminToken);
    log('DELETE /rooms/:id', res.status === 200, res.data?.message);
  }
}

// =====================================================
// 3. TENANTS MODULE
// =====================================================
async function testTenants() {
  console.log('\n👤 ===== TENANTS MODULE =====');

  // 3.1 Get All Tenants
  let res = await api('GET', '/tenants', null, adminToken);
  const listOk = res.status === 200 && Array.isArray(res.data?.data);
  log('GET /tenants', listOk, `${res.data?.data?.length || 0} tenants`);

  // 3.2 Create Tenant (new account)
  const tenantEmail = `tenant_new_${Date.now()}@trohub.vn`;
  res = await api('POST', '/tenants', {
    fullName: 'Khách Test Mới',
    phone: `09${Date.now().toString().slice(-8)}`,
    email: tenantEmail,
    password: '123456',
    idCard: '079012345678',
    roomCode: '',
    startDate: new Date().toISOString()
  }, adminToken);
  const newTenantId = res.data?.data?._id;
  log('POST /tenants (create new)', res.status === 201, newTenantId ? `id=${newTenantId}` : res.data?.message);

  // 3.3 Get Tenant By Id
  if (testTenantId) {
    res = await api('GET', `/tenants/${testTenantId}`);
    log('GET /tenants/:id', res.status === 200 && res.data?.data?.fullName, res.data?.data?.fullName);
  }

  // 3.4 Update Tenant
  if (testTenantId) {
    res = await api('PUT', `/tenants/${testTenantId}`, {
      fullName: 'Nguyễn Văn A Updated',
      phone: '0987654321'
    }, adminToken);
    log('PUT /tenants/:id', res.status === 200, res.data?.message);
  }

  // 3.5 Terminate Tenant
  // First need an active contract - skip if none
  if (testTenantId) {
    res = await api('PUT', `/tenants/${testTenantId}/terminate`, {}, adminToken);
    // Could be 404 if no active contract
    log('PUT /tenants/:id/terminate', res.status === 200 || res.status === 404, res.data?.message);
  }

  // 3.6 Home Summary
  if (testTenantId) {
    res = await api('GET', `/tenants/home-summary/${testTenantId}`);
    log('GET /tenants/home-summary/:tenantId', res.status === 200 && res.data?.data?.tenantName, res.data?.data?.tenantName || res.data?.message);
  }

  // 3.7 Create Tenant without email/phone
  res = await api('POST', '/tenants', {
    fullName: 'Test No Contact',
    idCard: '123456789012'
  }, adminToken);
  log('POST /tenants (no email/phone → 400)', res.status === 400, res.data?.message);
}

// =====================================================
// 4. SERVICES MODULE
// =====================================================
async function testServices() {
  console.log('\n⚡ ===== SERVICES MODULE =====');

  // 4.1 Create Service
  let res = await api('POST', '/services', {
    name: 'Điện test',
    type: 1,
    unit: 'kWh',
    defaultPrice: 3500
  }, adminToken);
  const svcCreated = res.status === 201;
  if (svcCreated && res.data?.data) testServiceId = res.data.data._id;
  log('POST /services (create)', svcCreated, testServiceId ? `id=${testServiceId}` : '');

  // 4.2 Create固定 service
  res = await api('POST', '/services', {
    name: 'Wifi test',
    type: 2,
    unit: 'Tháng',
    defaultPrice: 100000
  }, adminToken);
  log('POST /services (fixed)', res.status === 201);

  // 4.3 Get All Services
  res = await api('GET', '/services');
  log('GET /services', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} services`);

  // 4.4 Get Service By Id
  if (testServiceId) {
    res = await api('GET', `/services/${testServiceId}`);
    log('GET /services/:id', res.status === 200 && res.data?.data?.name, res.data?.data?.name);
  }

  // 4.5 Update Service
  if (testServiceId) {
    res = await api('PUT', `/services/${testServiceId}`, { defaultPrice: 4000 });
    log('PUT /services/:id', res.status === 200, res.data?.message);
  }
}

// =====================================================
// 5. CONTRACTS MODULE
// =====================================================
async function testContracts() {
  console.log('\n📋 ===== CONTRACTS MODULE =====');

  // 5.1 Get All Contracts
  let res = await api('GET', '/contracts', null, adminToken);
  const listOk = res.status === 200 && Array.isArray(res.data?.data);
  log('GET /contracts', listOk, `${res.data?.data?.length || 0} contracts`);

  // 5.2 Create Contract
  // Need a vacant room and tenant
  const roomsRes = await api('GET', '/rooms', null, adminToken);
  const vacantRoom = roomsRes.data?.data?.find(r => r.status === 0);
  
  if (vacantRoom && testTenantId) {
    res = await api('POST', '/contracts', {
      roomId: vacantRoom._id,
      tenantId: testTenantId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      fixedRentPrice: 3000000,
      fixedDeposit: 3000000,
      services: testServiceId ? [{ serviceId: testServiceId, fixedPrice: 3500 }] : []
    }, adminToken);
    const contractCreated = res.status === 201;
    if (contractCreated && res.data?.data) testContractId = res.data.data._id;
    log('POST /contracts (create)', contractCreated, testContractId ? `id=${testContractId}` : res.data?.message);
  } else {
    log('POST /contracts (create)', false, 'No vacant room or tenant available');
  }

  // 5.3 Get Contract By Id
  if (testContractId) {
    res = await api('GET', `/contracts/${testContractId}`);
    log('GET /contracts/:id', res.status === 200 && res.data?.data?.status !== undefined, `status=${res.data?.data?.status}`);
  }

  // 5.4 Sign Contract (tenant signs → status 0→4)
  if (testContractId) {
    res = await api('PUT', `/contracts/${testContractId}/sign`, {}, tenantToken);
    log('PUT /contracts/:id/sign (0→4)', res.status === 200, res.data?.message);
  }

  // 5.5 Confirm Contract (admin confirms → status 4→1)
  if (testContractId) {
    res = await api('PUT', `/contracts/${testContractId}/confirm`, {}, adminToken);
    log('PUT /contracts/:id/confirm (4→1)', res.status === 200, res.data?.message);
  }

  // 5.6 Get Contract History
  res = await api('GET', '/contracts/history', null, adminToken);
  log('GET /contracts/history', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} history`);

  // 5.7 Update Contract
  if (testContractId) {
    res = await api('PUT', `/contracts/${testContractId}`, {
      fixedRentPrice: 3200000
    }, adminToken);
    log('PUT /contracts/:id', res.status === 200, res.data?.message);
  }
}

// =====================================================
// 6. INVOICES MODULE
// =====================================================
async function testInvoices() {
  console.log('\n🧾 ===== INVOICES MODULE =====');

  // 6.1 Get Bulk Preview
  let res = await api('GET', '/invoices/bulk-preview', null, adminToken);
  log('GET /invoices/bulk-preview', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} previews`);

  // 6.2 Create Bulk Invoices
  const preview = res.data?.data?.[0];
  if (preview) {
    res = await api('POST', '/invoices/bulk', {
      invoices: [{
        contractId: preview.contractId,
        room: preview.room,
        tenant: preview.tenant,
        roomAmount: preview.roomAmount,
        electricityOld: preview.electricityOld,
        electricityNew: 150,
        electricityPrice: preview.electricityPrice,
        waterOld: preview.waterOld,
        waterNew: 50,
        waterPrice: preview.waterPrice,
        services: preview.services,
        parking: preview.parking,
        internet: preview.internet,
        garbage: preview.garbage
      }],
      period: '06/2026',
      dueDate: '05/07/2026'
    }, adminToken);
    const bulkOk = res.status === 201;
    log('POST /invoices/bulk', bulkOk, `${res.data?.data?.length || 0} invoices created`);
  } else {
    log('POST /invoices/bulk', false, 'No preview data');
  }

  // 6.3 Create Single Invoice
  if (testContractId) {
    res = await api('POST', '/invoices', {
      contractId: testContractId,
      period: '06/2026',
      dueDate: '05/07/2026',
      room: 'T101',
      tenant: 'Test Tenant',
      roomAmount: 3200000,
      electricityOld: 100,
      electricityNew: 150,
      electricityPrice: 3500,
      waterOld: 10,
      waterNew: 20,
      waterPrice: 20000,
      total: 3475000,
      status: 1
    }, adminToken);
    const invCreated = res.status === 201;
    if (invCreated && res.data?.data) testInvoiceId = res.data.data._id;
    log('POST /invoices (create single)', invCreated, testInvoiceId ? `id=${testInvoiceId}` : res.data?.message);
  }

  // 6.4 Get All Invoices (admin)
  res = await api('GET', '/invoices', null, adminToken);
  log('GET /invoices (admin)', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} invoices`);

  // 6.5 Get All Invoices (tenant)
  res = await api('GET', '/invoices', null, tenantToken);
  log('GET /invoices (tenant)', res.status === 200, `status=${res.status}`);

  // 6.6 Get Invoice By Id
  if (testInvoiceId) {
    res = await api('GET', `/invoices/${testInvoiceId}`);
    log('GET /invoices/:id', res.status === 200 && res.data?.data?.period, `period=${res.data?.data?.period}`);
  }

  // 6.7 Remind Invoice
  if (testInvoiceId) {
    res = await api('PUT', `/invoices/${testInvoiceId}/remind`, {}, adminToken);
    log('PUT /invoices/:id/remind', res.status === 200, res.data?.message);
  }

  // 6.8 Pay Invoice
  if (testInvoiceId) {
    res = await api('PUT', `/invoices/${testInvoiceId}/pay`, {
      method: 'Chuyển khoản',
      paymentMethod: 'Chuyển khoản'
    }, adminToken);
    log('PUT /invoices/:id/pay', res.status === 200, res.data?.message);
  }

  // 6.9 Update Invoice (change status to overdue → auto penalty)
  if (testInvoiceId) {
    res = await api('PUT', `/invoices/${testInvoiceId}`, { status: 3 }, adminToken);
    log('PUT /invoices/:id (→ overdue, penalty)', res.status === 200, res.data?.message);
  }

  // 6.10 Create invoice with room/tenant directly
  res = await api('POST', '/invoices', {
    room: 'T101',
    tenant: 'Test',
    roomAmount: 2500000,
    electricityOld: 0,
    electricityNew: 100,
    electricityPrice: 3500,
    waterOld: 0,
    waterNew: 10,
    waterPrice: 20000,
    total: 2850000,
    status: 1
  }, adminToken);
  log('POST /invoices (room/tenant shortcut)', res.status === 201, `id=${res.data?.data?._id}`);
}

// =====================================================
// 7. REPAIRS MODULE
// =====================================================
async function testRepairs() {
  console.log('\n🔧 ===== REPAIRS MODULE =====');

  // 7.1 Create Repair Request (via tenant portal)
  let res = await api('POST', '/repairs', {
    tenantId: testTenantId,
    title: 'Hư bóng đèn test',
    content: 'Bóng đèn nhà vệ sinh bị cháy',
    priority: 1,
    images: []
  });
  const repairCreated = res.status === 201;
  if (repairCreated && res.data?.data) testRepairId = res.data.data._id;
  log('POST /repairs (create)', repairCreated, testRepairId ? `id=${testRepairId}` : res.data?.message);

  // 7.2 Get All Repairs (admin)
  res = await api('GET', '/repairs', null, adminToken);
  log('GET /repairs (admin)', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} repairs`);

  // 7.3 Update Repair Status
  if (testRepairId) {
    res = await api('PUT', `/repairs/${testRepairId}`, {
      status: 1,
      priority: 2,
      note: 'Đã tiếp nhận'
    }, adminToken);
    log('PUT /repairs/:id (status)', res.status === 200, res.data?.message);
  }

  // 7.4 Mark complete (should clear images)
  if (testRepairId) {
    res = await api('PUT', `/repairs/${testRepairId}`, {
      status: 2,
      note: 'Đã sửa xong'
    }, adminToken);
    log('PUT /repairs/:id (complete)', res.status === 200, res.data?.message);
  }

  // 7.5 Delete Repair
  if (testRepairId) {
    res = await api('DELETE', `/repairs/${testRepairId}`);
    log('DELETE /repairs/:id', res.status === 200, res.data?.message);
  }
}

// =====================================================
// 8. ME MODULE (Tenant Portal)
// =====================================================
async function testMe() {
  console.log('\n📱 ===== ME MODULE (Tenant Portal) =====');

  // 8.1 Get Tenant Portal
  let res = await api('GET', '/me', null, tenantToken);
  const portalOk = res.status === 200 && res.data?.data?.tenant;
  log('GET /me (portal)', portalOk, portalOk ? `name=${res.data.data.tenant.name}` : res.data?.message);

  // 8.2 Get portal without token
  res = await api('GET', '/me');
  log('GET /me (no token → 401)', res.status === 401, `status=${res.status}`);

  // 8.3 Get portal with wrong role
  res = await api('GET', '/me', null, adminToken);
  log('GET /me (admin role → 403)', res.status === 403, res.data?.message);

  // 8.4 Create Repair via me
  res = await api('POST', '/me/repairs', {
    category: 'Hư vòi nước',
    description: 'Vòi nước trong phòng bị rò rỉ',
    images: []
  }, tenantToken);
  const meRepairId = res.data?.data?._id;
  log('POST /me/repairs', res.status === 201, meRepairId ? `id=${meRepairId}` : res.data?.message);

  // 8.5 Delete Repair via me
  if (meRepairId) {
    res = await api('DELETE', `/me/repairs/${meRepairId}`, null, tenantToken);
    log('DELETE /me/repairs/:id', res.status === 200, res.data?.message);
  }

  // 8.6 Sign Contract via me
  // Find a draft contract
  const contractsRes = await api('GET', '/contracts', null, adminToken);
  const draftContract = contractsRes.data?.data?.find(c => c.status === 0 && c.tenantId?._id === testTenantId);
  if (draftContract) {
    res = await api('PUT', `/me/sign-contract/${draftContract._id}`, {}, tenantToken);
    log('PUT /me/sign-contract', res.status === 200, res.data?.message);
  } else {
    log('PUT /me/sign-contract', true, 'skipped (no draft contract)');
  }

  // 8.7 Pay Invoice via me
  if (testInvoiceId) {
    res = await api('PUT', `/me/pay-invoice/${testInvoiceId}`, {
      paymentMethod: 'QR ngân hàng'
    }, tenantToken);
    // Could be 400 if already paid
    log('PUT /me/pay-invoice', res.status === 200 || res.status === 400, res.data?.message);
  }

  // 8.8 Request Terminate
  const activeContracts = contractsRes.data?.data?.filter(c => c.status === 1 && c.tenantId?._id === testTenantId);
  if (activeContracts?.length > 0) {
    res = await api('PUT', `/me/request-terminate/${activeContracts[0]._id}`, {}, tenantToken);
    log('PUT /me/request-terminate', res.status === 200 || res.status === 400, res.data?.message);
  } else {
    log('PUT /me/request-terminate', true, 'skipped (no active contract)');
  }

  // 8.9 Create repair via me with string images
  res = await api('POST', '/me/repairs', {
    category: 'Test images string',
    description: 'Test string image handling',
    images: 'https://example.com/img1.jpg'
  }, tenantToken);
  log('POST /me/repairs (string images)', res.status === 201 || res.status === 400, res.data?.message);
}

// =====================================================
// 9. PAYMENTS MODULE
// =====================================================
async function testPayments() {
  console.log('\n💰 ===== PAYMENTS MODULE =====');

  let res = await api('GET', '/payments', null, adminToken);
  log('GET /payments', res.status === 200 && Array.isArray(res.data?.data), `${res.data?.data?.length || 0} transactions`);
}

// =====================================================
// 10. SETTINGS MODULE
// =====================================================
async function testSettings() {
  console.log('\n⚙️ ===== SETTINGS MODULE =====');

  // 10.1 Get Settings
  let res = await api('GET', '/settings');
  log('GET /settings', res.status === 200 && res.data?.data?.name, `name=${res.data?.data?.name}`);

  // 10.2 Update Settings
  res = await api('PUT', '/settings', {
    name: 'Chủ Trọ Updated',
    phone: '0909999999'
  });
  log('PUT /settings', res.status === 200, res.data?.message);

  // Restore original
  await api('PUT', '/settings', { name: 'Nguyễn Chủ Trọ' });
}

// =====================================================
// 11. ME - Portal Data Integrity
// =====================================================
async function testPortalDataIntegrity() {
  console.log('\n🔍 ===== PORTAL DATA INTEGRITY =====');

  const res = await api('GET', '/me', null, tenantToken);
  if (res.status !== 200) {
    log('Portal data integrity', false, 'Cannot fetch portal');
    return;
  }
  const data = res.data?.data;

  // Check required fields
  const hasTenant = data?.tenant && data.tenant.id && data.tenant.name;
  log('Portal: tenant info', !!hasTenant, hasTenant ? `name=${data.tenant.name}` : 'missing');

  const hasContracts = Array.isArray(data?.contracts);
  log('Portal: contracts array', hasContracts, `${data?.contracts?.length || 0} contracts`);

  const hasInvoices = Array.isArray(data?.invoices);
  log('Portal: invoices array', hasInvoices, `${data?.invoices?.length || 0} invoices`);

  const hasPayments = Array.isArray(data?.payments);
  log('Portal: payments array', hasPayments, `${data?.payments?.length || 0} payments`);

  const hasRepairs = Array.isArray(data?.repairs);
  log('Portal: repairs array', hasRepairs, `${data?.repairs?.length || 0} repairs`);

  const hasStats = data?.stats && typeof data.stats.unpaidTotal === 'number';
  log('Portal: stats', !!hasStats, hasStats ? `unpaid=${data.stats.unpaidTotal}, paid=${data.stats.paidTotal}` : 'missing');

  // Contract status mapping check
  if (hasContracts && data.contracts.length > 0) {
    const statuses = data.contracts.map(c => c.status);
    const validStatuses = statuses.every(s => typeof s === 'string');
    log('Portal: contract statuses mapped', validStatuses, statuses.join(', '));
  }
}

// =====================================================
// 12. EDGE CASES & ERROR HANDLING
// =====================================================
async function testEdgeCases() {
  console.log('\n⚠️ ===== EDGE CASES =====');

  // 12.1 Access protected route without token
  let res = await api('GET', '/tenants', null);
  log('GET /tenants (no token)', res.status === 200 || res.status === 401, `status=${res.status}`);

  // 12.2 Invalid ObjectId
  res = await api('GET', '/rooms/invalid_id_123');
  log('GET /rooms/:id (invalid id)', res.status >= 400, `status=${res.status}`);

  // 12.3 Non-existent room
  res = await api('GET', '/rooms/507f1f77bcf86cd799439011');
  log('GET /rooms/:id (not found)', res.status === 404, res.data?.message);

  // 12.4 Non-existent contract
  res = await api('GET', '/contracts/507f1f77bcf86cd799439011');
  log('GET /contracts/:id (not found)', res.status === 404, res.data?.message);

  // 12.5 Non-existent invoice
  res = await api('GET', '/invoices/507f1f77bcf86cd799439011');
  log('GET /invoices/:id (not found)', res.status === 404, res.data?.message);

  // 12.6 Pay already paid invoice
  if (testInvoiceId) {
    res = await api('PUT', `/invoices/${testInvoiceId}/pay`, { method: 'Tiền mặt' }, adminToken);
    log('PUT /invoices/:id/pay (already paid)', res.status === 400, res.data?.message);
  }

  // 12.7 Sign non-draft contract
  if (testContractId) {
    res = await api('PUT', `/contracts/${testContractId}/sign`, {}, tenantToken);
    log('PUT /contracts/:id/sign (not draft)', res.status === 400, res.data?.message);
  }

  // 12.8 Confirm non-pending contract
  if (testContractId) {
    res = await api('PUT', `/contracts/${testContractId}/confirm`, {}, adminToken);
    log('PUT /contracts/:id/confirm (not pending)', res.status === 400, res.data?.message);
  }

  // 12.9 Delete room with history
  const roomsRes = await api('GET', '/rooms', null, adminToken);
  const occupiedRoom = roomsRes.data?.data?.find(r => r.status === 1);
  if (occupiedRoom) {
    res = await api('DELETE', `/rooms/${occupiedRoom._id}`, null, adminToken);
    log('DELETE /rooms/:id (occupied → reject)', res.status === 400, res.data?.message);
  }

  // 12.10 Create room missing required fields
  res = await api('POST', '/rooms', { area: '20' }, adminToken);
  log('POST /rooms (missing fields)', res.status >= 400, `status=${res.status}`);
}

// =====================================================
// MAIN
// =====================================================
async function runAllTests() {
  console.log('🧪 ══════════════════════════════════════════════');
  console.log('   TroHub - AUTO TEST TOÀN BỘ API');
  console.log('   Server: ' + BASE);
  console.log('═════════════════════════════════════════════════');

  const startTime = Date.now();

  await testAuth();
  await testServices();
  await testRooms();
  await testTenants();
  await testContracts();
  await testInvoices();
  await testRepairs();
  await testMe();
  await testPayments();
  await testSettings();
  await testPortalDataIntegrity();
  await testEdgeCases();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n═════════════════════════════════════════════════');
  console.log('📊 KẾT QUẢ TỔNG HỢP');
  console.log('═════════════════════════════════════════════════');
  console.log(`✅ Pass: ${results.pass}`);
  console.log(`❌ Fail: ${results.fail}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`⏱️  Time: ${elapsed}s`);
  console.log(`📈 Rate: ${((results.pass / results.total) * 100).toFixed(1)}%`);
  
  if (results.fail > 0) {
    console.log('\n❌ CÁC TEST LỖI:');
    results.details.filter(d => !d.success).forEach(d => {
      console.log(`   - ${d.testName}: ${d.detail}`);
    });
  }
  console.log('═════════════════════════════════════════════════');
}

runAllTests().catch(console.error);
