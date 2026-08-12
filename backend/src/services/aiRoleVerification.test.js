const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyAIIntent, authorizeAIAction } = require('./aiPolicy');

test('tenant revenue request is denied before model call', () => {
  assert.equal(classifyAIIntent('Doanh thu tháng này'), 'landlord_financials');
  assert.equal(authorizeAIAction('tenant', { type: 'FILL_CONTRACT_FORM' }), null);
});

test('tenant cannot receive a landlord utility action', () => {
  assert.equal(authorizeAIAction(2, { type: 'FILL_UTILITY_READING' }), null);
});

test('landlord form actions remain allowlisted', () => {
  assert.deepEqual(
    authorizeAIAction(1, { type: 'FILL_UTILITY_READING', roomCode: 'A101' }),
    { type: 'FILL_UTILITY_READING', roomCode: 'A101', requiresConfirmation: false },
  );
});
