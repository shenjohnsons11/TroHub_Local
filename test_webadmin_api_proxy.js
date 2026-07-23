const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("Web Admin proxies same-origin API requests to Backend port 5000", () => {
  const backendEnv = read("backend/.env");
  const nextEnv = read("webadmin/.env.local");
  const nextConfig = read("webadmin/next.config.ts");
  const apiClient = read("webadmin/src/lib/api.ts");

  assert.match(backendEnv, /^PORT=5000$/m);
  assert.match(nextEnv, /^BACKEND_API_URL=http:\/\/localhost:5000$/m);
  assert.doesNotMatch(nextEnv, /^NEXT_PUBLIC_API_URL=http:\/\/localhost:3000\/api$/m);
  assert.match(nextConfig, /async\s+rewrites\s*\(\)/);
  assert.match(nextConfig, /source:\s*["']\/api\/:path\*["']/);
  assert.match(apiClient, /API_BASE_URL\s*=\s*["']\/api["']/);
});

test("fetchAPI rejects non-JSON responses before parsing the body", () => {
  const apiClient = read("webadmin/src/lib/api.ts");

  assert.match(apiClient, /headers\.get\(["']content-type["']\)/);
  assert.match(apiClient, /includes\(["']application\/json["']\)/);
  assert.match(apiClient, /Không thể kết nối đến máy chủ xác thực/);

  const contentTypeCheckIndex = apiClient.indexOf('headers.get("content-type")');
  const jsonParseIndex = apiClient.indexOf("response.json()");
  assert.ok(contentTypeCheckIndex >= 0);
  assert.ok(jsonParseIndex > contentTypeCheckIndex);
});
