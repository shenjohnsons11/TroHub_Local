const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = (request, parent, isMain) => request === '@google/genai'
  ? { GoogleGenAI: class {} }
  : originalLoad.call(Module, request, parent, isMain);
const {
  normalizeRole,
  classifyAIIntent,
  authorizeAIAction,
  getRolePresentation,
} = require('./aiPolicy');
const { parseAIResponse } = require('./aiService');
Module._load = originalLoad;

test('normalizes supported roles and defaults safely', () => {
  assert.equal(normalizeRole(1), 'landlord');
  assert.equal(normalizeRole(2), 'tenant');
  assert.equal(normalizeRole(99), 'tenant');
});

test('classifies landlord-only tenant questions', () => {
  assert.equal(classifyAIIntent('Doanh thu tháng này'), 'landlord_financials');
  assert.equal(classifyAIIntent('Tạo hợp đồng cho phòng A101'), 'landlord_contract_action');
  assert.equal(classifyAIIntent('Hóa đơn của tôi tháng này'), 'tenant_personal_financials');
  assert.equal(classifyAIIntent('Báo hỏng vòi nước'), 'tenant_repair');
  assert.equal(classifyAIIntent('Chốt điện nước phòng A101'), 'landlord_contract_action');
  assert.equal(classifyAIIntent('Xem công nợ'), 'landlord_financials');
  assert.equal(classifyAIIntent('Xem công nợ của tôi'), 'tenant_personal_financials');
  assert.equal(classifyAIIntent('Soạn tin nhắn nhắc nợ'), 'landlord_contract_action');
  assert.equal(classifyAIIntent('Quản lý người thuê'), 'landlord_contract_action');
  for (const message of ['thống kê nợ', 'danh sách nợ', 'số phòng trống']) {
    assert.equal(classifyAIIntent(message), 'landlord_financials', message);
  }
  assert.equal(classifyAIIntent('phòng còn trống'), 'landlord_financials');
  for (const message of ['thêm người thuê', 'quản trị phòng', 'xem danh sách người thuê', 'gửi nhắc thanh toán']) {
    assert.equal(classifyAIIntent(message), 'landlord_contract_action', message);
  }
  for (const message of ['gửi tin nhắc thanh toán', 'soạn tin nhắc nợ', 'quản lý cư dân']) {
    assert.equal(classifyAIIntent(message), 'landlord_contract_action', message);
  }
});

test('tenant cannot receive landlord actions', () => {
  assert.equal(authorizeAIAction('tenant', { type: 'FILL_CONTRACT_FORM' }), null);
  assert.equal(authorizeAIAction('tenant', { type: 'FILL_UTILITY_READING' }), null);
});

test('numeric landlord roles authorize actions and presentation', () => {
  assert.deepEqual(
    authorizeAIAction(1, { type: 'FILL_UTILITY_READING', roomCode: 'A101' }),
    { type: 'FILL_UTILITY_READING', roomCode: 'A101', requiresConfirmation: false },
  );
  assert.equal(getRolePresentation(1).title, 'TroHub AI — Trợ lý Chủ trọ');
});

test('landlord can prepare existing form-fill actions', () => {
  assert.deepEqual(
    authorizeAIAction('landlord', { type: 'FILL_UTILITY_READING', roomCode: 'A101', newElec: 12, newWater: 3 }),
    { type: 'FILL_UTILITY_READING', roomCode: 'A101', newElec: 12, newWater: 3, requiresConfirmation: false },
  );
});

test('role presentations are explicit', () => {
  assert.equal(getRolePresentation('landlord').title, 'TroHub AI — Trợ lý Chủ trọ');
  assert.equal(getRolePresentation('tenant').title, 'TroHub AI — Trợ lý Cư dân');
  assert.equal(getRolePresentation('tenant').deniedMessage, '🔒 Bạn thuộc vai trò Cư dân nên không có quyền truy cập doanh thu quản trị.');
  assert.equal(getRolePresentation('tenant').adminDeniedMessage, '🔒 Bạn thuộc vai trò Cư dân nên không có quyền truy cập hoặc hướng dẫn các thao tác quản trị của Chủ trọ.');
});

test('rejects impossible contract dates', () => {
  assert.equal(parseAIResponse(JSON.stringify({ reply: 'ok', action: {
    type: 'FILL_CONTRACT_FORM', roomCode: 'A101', tenantName: 'A', rentPrice: 1, startDate: '2026-02-30',
  } })).action, null);
});

test('negated keywords stay general', () => {
  assert.equal(classifyAIIntent('Tôi không cần xem doanh thu'), 'general');
  assert.equal(classifyAIIntent('Tôi không báo hỏng đèn'), 'general');
  assert.equal(classifyAIIntent('Đèn phòng tôi không hỏng'), 'general');
  assert.equal(classifyAIIntent('Vòi nước không rò'), 'general');
  assert.equal(classifyAIIntent('Doanh thu tôi không cần xem'), 'general');
});

test('malfunction negation remains a repair request', () => {
  assert.equal(classifyAIIntent('Vòi nước không chảy'), 'tenant_repair');
  assert.equal(classifyAIIntent('Đèn không sáng'), 'tenant_repair');
  assert.equal(classifyAIIntent('Quạt không hoạt động'), 'tenant_repair');
});

test('repair requests are not treated as landlord actions', () => {
  assert.equal(classifyAIIntent('Sửa vòi nước'), 'tenant_repair');
  assert.equal(classifyAIIntent('Sửa đèn phòng tôi'), 'tenant_repair');
  assert.equal(classifyAIIntent('Báo sửa chữa phòng tôi'), 'tenant_repair');
});

test('negated admin and repair requests stay general', () => {
  for (const message of ['Không cần chốt điện nước', 'Tôi không cần tạo hợp đồng', 'Không hỏng đèn', 'Không bị hỏng đèn', 'Đừng sửa vòi nước', 'Đừng sửa chữa', 'Không muốn xóa phòng', 'Không muốn chốt số điện']) {
    assert.equal(classifyAIIntent(message), 'general', message);
  }
});
