const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const read = (relativePath) => readFileSync(join(__dirname, relativePath), "utf8");

test("all frontends expose the TRO HUB identity", () => {
  assert.match(read("components/TroHubLogo.tsx"), /TRO HUB/);
  assert.match(read("webadmin/src/components/trohub-logo.tsx"), /TRO HUB/);
});

test("all frontends implement light dark and reduced motion", () => {
  assert.match(read("constants/theme.ts"), /dark/);
  assert.match(read("webadmin/src/app/globals.css"), /prefers-reduced-motion/);
});

test("all frontends expose a branded loading experience", () => {
  assert.match(read("components/AppLoadingScreen.tsx"), /TroHubLogo/);
  assert.match(read("webadmin/src/components/app-loading.tsx"), /TroHubLogo/);
});

test("the three primary surfaces use redesigned compositions", () => {
  assert.match(read("screens/HomeScreen.tsx"), /TroHubLogo/);
  assert.match(read("screens/AdminDashboardScreen.tsx"), /dashboardHero/);
  assert.match(read("webadmin/src/app/page.tsx"), /login-identity-panel/);
});

test("Expo and Next.js expose login only with phone or username priority", () => {
  const expoLogin = read("screens/LoginScreen.tsx");
  const nextLogin = read("webadmin/src/app/page.tsx");

  assert.match(expoLogin, /Số điện thoại hoặc tên đăng nhập/);
  assert.match(nextLogin, /Số điện thoại hoặc tên đăng nhập/);
  assert.doesNotMatch(expoLogin, /authService\.register|Đăng ký người thuê|Đăng ký tài khoản/);
  assert.doesNotMatch(nextLogin, /\/auth\/register|handleRegister|Đăng ký tài khoản/);
});

test("Expo and Next.js define reliable application font stacks", () => {
  assert.match(read("constants/theme.ts"), /FONT_FAMILIES/);
  assert.match(read("screens/LoginScreen.tsx"), /FONT_FAMILIES/);
  assert.doesNotMatch(read("webadmin/src/app/layout.tsx"), /next\/font\/google/);
  assert.match(read("webadmin/src/app/globals.css"), /system-ui/);
  assert.match(read("webadmin/src/app/globals.css"), /"Noto Sans"/);
});
