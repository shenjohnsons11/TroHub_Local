const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizes formatted Vietnamese phone identifiers', () => {
  const { normalizeLoginIdentifier } = require('./src/services/authIdentifier');

  assert.equal(normalizeLoginIdentifier(' 090.123.4567 '), '0901234567');
  assert.equal(normalizeLoginIdentifier('090 123 4567'), '0901234567');
  assert.equal(normalizeLoginIdentifier('090-123-4567'), '0901234567');
});

test('preserves username and legacy email identifiers', () => {
  const { normalizeLoginIdentifier } = require('./src/services/authIdentifier');

  assert.equal(normalizeLoginIdentifier(' chu-tro-01 '), 'chu-tro-01');
  assert.equal(normalizeLoginIdentifier(' admin@trohub.vn '), 'admin@trohub.vn');
});

test('builds a lookup compatible with phone username and legacy email', () => {
  const { buildLoginLookup } = require('./src/services/authIdentifier');

  assert.deepEqual(buildLoginLookup('090.123.4567'), {
    $or: [
      { phone: '0901234567' },
      { username: '090.123.4567' },
      { email: '090.123.4567' },
    ],
  });

  assert.deepEqual(buildLoginLookup('admin@trohub.vn'), {
    $or: [
      { phone: 'admin@trohub.vn' },
      { username: 'admin@trohub.vn' },
      { email: 'admin@trohub.vn' },
    ],
  });
});

test('rejects a missing login identifier before querying accounts', async () => {
  const authController = require('./src/controllers/authController');
  const response = createResponseRecorder();

  await authController.login({ body: { username: '   ', password: '123456' } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.code, 'LOGIN_IDENTIFIER_REQUIRED');
});

test('disables public registration and directs provisioning to Admin', async () => {
  const authController = require('./src/controllers/authController');
  const response = createResponseRecorder();

  await authController.register(
    {
      body: {
        username: 'nguoi-thue-moi',
        password: '123456',
        fullName: 'Nguyễn Văn An',
        phone: '0901234567',
        role: 2,
      },
    },
    response,
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.payload, {
    success: false,
    code: 'PUBLIC_REGISTRATION_DISABLED',
    message: 'Tài khoản mới chỉ được tạo bởi Admin.',
  });
});

function createResponseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}
