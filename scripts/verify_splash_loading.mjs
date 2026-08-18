import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => {
  try {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};

test("native splash matches the TroHub startup surface", () => {
  const config = JSON.parse(read("app.json"));
  const [, splash] = config.expo.plugins.find(([name] = []) => name === "expo-splash-screen");

  assert.equal(splash.backgroundColor, "#04100e");
  assert.equal(splash.dark.backgroundColor, "#04100e");
  assert.equal(splash.image, "./assets/images/logo_3d_glass.png");
});

test("WebAdmin owns a global branded loading boundary", () => {
  const loading = read("webadmin/src/app/loading.tsx");
  const component = read("webadmin/src/components/app-loading.tsx");
  const layout = read("webadmin/src/app/layout.tsx");

  assert.match(loading, /<AppLoading/);
  assert.match(component, /logo_3d_glass\.png/);
  assert.match(component, /Hệ Sinh Thái Quản Lý Nhà Trọ Thông Minh/);
  assert.match(component, /role="status"/);
  assert.match(layout, /backgroundColor:\s*"#04100e"/);
});

test("Mobile app splash remains mounted through auth and fades when ready", () => {
  const splash = read("components/AppSplashScreen.tsx");
  const index = read("app/index.tsx");

  assert.match(splash, /visible\?:\s*boolean/);
  assert.match(splash, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(splash, /Animated\.timing/);
  assert.match(splash, /logo_3d_glass\.png/);
  assert.match(splash, /if \(!logoReady\) return/);
  assert.match(splash, /Hệ Sinh Thái Quản Lý Nhà Trọ Thông Minh/);
  assert.match(index, /<AppSplashScreen\s+visible=\{isChecking\}/);
  assert.doesNotMatch(index, /AppLoadingScreen/);
});
