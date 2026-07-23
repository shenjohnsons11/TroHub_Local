const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("only the Next.js webadmin remains", () => {
  assert.equal(exists("webadmin-next"), false);
  assert.equal(exists("webadmin/package.json"), true);
  assert.match(read("webadmin/package.json"), /"next"/);
  assert.doesNotMatch(read("webadmin/package.json"), /http-server|5173/);
});

test("unified Admin routes exist", () => {
  for (const route of [
    "dashboard/payments/page.tsx",
    "dashboard/settings/page.tsx",
    "dashboard/settings/account/page.tsx",
    "dashboard/settings/banking/page.tsx",
    "dashboard/settings/billing/page.tsx",
    "dashboard/contracts/new/page.tsx",
  ]) {
    assert.equal(exists(`webadmin/src/app/${route}`), true, route);
  }
});

test("active Web Admin uses only approved Người thuê terminology", () => {
  const bannedTerms = new RegExp(
    [
      ["Khách", "thuê"].join(" "),
      ["khách", "thuê"].join(" "),
      ["khach", "Thue"].join(""),
      ["KHACH", "THUE"].join("_"),
    ].join("|"),
  );
  const activeFiles = [
    "webadmin/src/app/dashboard/layout.tsx",
    "webadmin/src/app/dashboard/contracts/new/page.tsx",
    "webadmin/src/app/dashboard/payments/page.tsx",
  ];
  for (const file of activeFiles) {
    assert.doesNotMatch(read(file), bannedTerms);
  }
});

test("Admin contract creation uses editable dd/mm/yyyy defaults on Web and Expo", () => {
  const webWizard = read("webadmin/src/app/dashboard/contracts/new/page.tsx");
  const expoWizard = read("screens/AdminContractsScreen.tsx");

  for (const source of [webWizard, expoWizard]) {
    assert.match(source, /defaultContractDates/);
    assert.match(source, /parseDisplayToIso/);
    assert.match(source, /dd\/mm\/yyyy/);
    assert.match(source, /endDateWasEdited/);
  }

  assert.match(webWizard, /startDateIso/);
  assert.match(webWizard, /endDateIso/);
  assert.match(expoWizard, /DateTimePicker/);
  assert.match(expoWizard, /startDateIso/);
  assert.match(expoWizard, /endDateIso/);
});
