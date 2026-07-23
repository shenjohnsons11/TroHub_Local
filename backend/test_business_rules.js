const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const skippedDirectories = new Set(['.git', 'node_modules', '.expo', '.next', 'reports', 'scratch_clone']);
const scannedExtensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.html',
  '.css',
  '.mjs',
  '.cjs',
]);
const bannedTerms = [
  ['Kh', '\u00e1ch thu', '\u00ea'].join(''),
  ['kh', '\u00e1ch thu', '\u00ea'].join(''),
  ['khach', '_', 'thue'].join(''),
  ['khach', 'Thue'].join(''),
  ['KHACH', '_', 'THUE'].join(''),
  ['Khach', 'Thue'].join(''),
  ['Khach', ' ', 'thue'].join(''),
];

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) return [];
      return listFiles(absolutePath);
    }
    if (!entry.isFile()) return [];
    if (!scannedExtensions.has(path.extname(entry.name))) return [];
    return [absolutePath];
  });
}

test('source uses the approved Nguoi Thue terminology everywhere', () => {
  const violations = [];

  for (const filePath of listFiles(projectRoot)) {
    const relativePath = path.relative(projectRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    for (const term of bannedTerms) {
      if (content.includes(term)) {
        violations.push(`${relativePath}: contains banned tenant term`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('repair requests are directly owned by a tenant account', () => {
  const RepairRequest = require('./src/models/RepairRequest');
  const tenantPath = RepairRequest.schema.path('tenantId');
  const roomPath = RepairRequest.schema.path('roomId');

  assert.ok(tenantPath, 'RepairRequest must include tenantId');
  assert.equal(tenantPath.options.ref, 'Account');
  assert.equal(tenantPath.options.required, true);
  assert.equal(roomPath, undefined, 'RepairRequest must not include roomId ownership');
});
