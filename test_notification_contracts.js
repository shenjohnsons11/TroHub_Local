const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const read = (relativePath) => readFileSync(join(__dirname, relativePath), "utf8");

test("Expo mounts a stable global Notification Provider", () => {
  const provider = read("providers/NotificationProvider.tsx");
  const layout = read("app/_layout.tsx");

  assert.match(layout, /NotificationProvider/);
  assert.match(provider, /useCallback/);
  assert.match(provider, /useMemo/);
  assert.match(provider, /useRef/);
  assert.match(provider, /success/);
  assert.match(provider, /error/);
  assert.match(provider, /warning/);
  assert.match(provider, /info/);
  assert.match(provider, /confirm/);
  assert.match(provider, /react-native-toast-message/);
});

test("Next.js mounts a stable global Notification Provider", () => {
  const provider = read("webadmin/src/providers/notification-provider.tsx");
  const layout = read("webadmin/src/app/layout.tsx");

  assert.match(layout, /NotificationProvider/);
  assert.match(provider, /useCallback/);
  assert.match(provider, /useMemo/);
  assert.match(provider, /useRef/);
  assert.match(provider, /toast\.success/);
  assert.match(provider, /toast\.error/);
  assert.match(provider, /toast\.warning/);
  assert.match(provider, /toast\.info/);
  assert.match(provider, /confirm/);
});

test("business flows use useNotification instead of direct toast engines", () => {
  const expoTargets = [
    "screens/LoginScreen.tsx",
    "screens/BulkInvoiceScreen.tsx",
    "screens/UtilityScreen.tsx",
    "screens/RepairScreen.tsx",
  ];
  const nextTargets = [
    "webadmin/src/app/page.tsx",
    "webadmin/src/app/dashboard/invoices/page.tsx",
    "webadmin/src/app/dashboard/utilities/page.tsx",
    "webadmin/src/app/dashboard/services/page.tsx",
  ];

  for (const path of [...expoTargets, ...nextTargets]) {
    const source = read(path);
    assert.match(source, /useNotification/);
    assert.doesNotMatch(source, /Toast\.show|toast\.(success|error|warning|info)|Alert\.alert|window\.alert/);
  }
});

test("Service Management is available in the Next.js Admin navigation", () => {
  const layout = read("webadmin/src/app/dashboard/layout.tsx");
  const servicePage = read("webadmin/src/app/dashboard/services/page.tsx");

  assert.match(layout, /\/dashboard\/services/);
  assert.match(layout, /Quản lý dịch vụ/);
  assert.match(servicePage, /fetchAPI\("\/services/);
  assert.match(servicePage, /useNotification/);
});

test("notification integrations preserve Repair Request ownership invariants", () => {
  const repairScreen = read("screens/RepairScreen.tsx");
  const repairModel = read("backend/src/models/RepairRequest.js");

  assert.match(repairScreen, /Người thuê/);
  assert.match(repairModel, /tenantId/);
  assert.doesNotMatch(repairModel, /roomId/);
});

test("notification error mapping includes meter index regression", () => {
  const expoMessages = read("utils/notificationMessages.ts");
  const nextMessages = read("webadmin/src/lib/notification-messages.ts");

  assert.match(expoMessages, /METER_INDEX_REGRESSION/);
  assert.match(nextMessages, /METER_INDEX_REGRESSION/);
});
