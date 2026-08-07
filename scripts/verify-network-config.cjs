const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadMobileApi(constants, os) {
  const source = fs.readFileSync(path.join(root, "constants/api.ts"), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const run = vm.runInNewContext(`(function (require, module, exports, process) { ${javascript} })`);

  run((id) => {
    if (id === "react-native") return { Platform: { OS: os } };
    if (id === "expo-constants") return constants;
    throw new Error(`Unexpected import: ${id}`);
  }, module, module.exports, { env: {} });

  return module.exports;
}

test("mobile API uses the Expo Go host when expoConfig is unavailable", () => {
  const api = loadMobileApi({
    expoConfig: null,
    expoGoConfig: { debuggerHost: "192.168.1.56:8081" },
  }, "ios");

  assert.equal(api.API_BASE_URL, "http://192.168.1.56:5000/api");
});

test("backend CORS reflects origins when credentials are enabled", () => {
  const source = fs.readFileSync(path.join(root, "backend/server.js"), "utf8");

  assert.match(source, /cors\(\{\s*origin:\s*true,\s*credentials:\s*true\s*\}\)/);
});
