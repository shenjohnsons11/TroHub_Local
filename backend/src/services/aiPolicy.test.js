const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRole,
  classifyAIIntent,
  authorizeAIAction,
  getRolePresentation,
} = require('./aiPolicy');

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
});

test('tenant cannot receive landlord actions', () => {
  assert.equal(authorizeAIAction('tenant', { type: 'FILL_CONTRACT_FORM' }), null);
  assert.equal(authorizeAIAction('tenant', { type: 'FILL_UTILITY_READING' }), null);
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
});
