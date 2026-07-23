# Unified Web Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the useful Admin-only legacy features into Next.js, add the approved billing policy and contract wizard, then leave one `webadmin` directory running at port 3000.

**Architecture:** Implement feature parity inside `webadmin-next` while the legacy directory remains recoverable. Backend remains authoritative for identity, invoice totals, late fees, and ownership; after all tests pass, delete legacy `webadmin`, rename `webadmin-next` to `webadmin`, and update active tooling references.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Next.js 16, React 19, TypeScript, Tailwind CSS, Base UI, Sonner, Node test runner, Cypress.

---

### Task 1: Lock the final filesystem and feature contract

**Files:**
- Create: `test_unified_webadmin_contracts.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing contract test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test test_unified_webadmin_contracts.js`  
Expected: FAIL because both directories still exist and parity routes are missing.

- [ ] **Step 3: Add the contract suite to the root test command**

```json
"test:ui": "node --test test_ui_contracts.js test_notification_contracts.js test_webadmin_api_proxy.js test_unified_webadmin_contracts.js"
```

- [ ] **Step 4: Commit the RED contract**

```bash
git add test_unified_webadmin_contracts.js package.json
git commit -m "test: define unified webadmin contract"
```

### Task 2: Add per-Admin billing policy backend

**Files:**
- Create: `backend/src/models/BillingPolicy.js`
- Create: `backend/src/services/billingPolicy.js`
- Create: `backend/src/controllers/billingPolicyController.js`
- Create: `backend/src/routes/billingPolicyRoutes.js`
- Create: `backend/test_billing_policy.js`
- Modify: `backend/server.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write RED tests for defaults, validation, and JWT ownership**

```js
test("normalizes a billing policy", () => {
  const { normalizeBillingPolicy } = require("./src/services/billingPolicy");
  assert.deepEqual(normalizeBillingPolicy({
    lateFeeGraceDays: 5,
    lateFeeRate: 4.5,
    landlordId: "client-value",
  }), {
    lateFeeGraceDays: 5,
    lateFeeRate: 4.5,
  });
});

test("rejects policy values outside supported ranges", () => {
  const { normalizeBillingPolicy } = require("./src/services/billingPolicy");
  assert.throws(() => normalizeBillingPolicy({ lateFeeGraceDays: 91, lateFeeRate: 5 }));
  assert.throws(() => normalizeBillingPolicy({ lateFeeGraceDays: 3, lateFeeRate: 101 }));
});
```

- [ ] **Step 2: Verify RED**

Run: `cd backend && node --test test_billing_policy.js`  
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the focused policy service**

```js
class BillingPolicyValidationError extends Error {}

function normalizeBillingPolicy(input) {
  const lateFeeGraceDays = Number(input.lateFeeGraceDays);
  const lateFeeRate = Number(input.lateFeeRate);
  if (!Number.isInteger(lateFeeGraceDays) || lateFeeGraceDays < 0 || lateFeeGraceDays > 90) {
    throw new BillingPolicyValidationError("Số ngày ân hạn phải từ 0 đến 90.");
  }
  if (!Number.isFinite(lateFeeRate) || lateFeeRate < 0 || lateFeeRate > 100) {
    throw new BillingPolicyValidationError("Tỷ lệ phạt phải từ 0 đến 100.");
  }
  return { lateFeeGraceDays, lateFeeRate: Math.round(lateFeeRate * 100) / 100 };
}

module.exports = { BillingPolicyValidationError, normalizeBillingPolicy };
```

- [ ] **Step 4: Implement GET/PUT scoped by `req.auth.id`**

The controller must use:

```js
BillingPolicy.findOneAndUpdate(
  { landlordId: req.auth.id },
  { ...payload, landlordId: req.auth.id },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
```

The router must apply `requireAdmin` to every route.

- [ ] **Step 5: Register and verify**

Run: `cd backend && npm test`  
Expected: all existing tests plus billing policy tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat: add per-admin billing policy"
```

### Task 3: Implement authoritative overdue evaluation

**Files:**
- Create: `backend/src/services/overdueInvoice.js`
- Create: `backend/test_overdue_invoice.js`
- Modify: `backend/src/models/Invoice.js`
- Modify: `backend/src/controllers/invoiceController.js`
- Modify: `backend/src/controllers/paymentController.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write RED boundary tests**

```js
test("computes overdue date in Asia Ho Chi Minh time", () => {
  const { buildLateFeeSnapshot } = require("./src/services/overdueInvoice");
  const result = buildLateFeeSnapshot({
    issuedAt: "2026-07-01",
    graceDays: 5,
    penaltyRate: 5,
    penaltyBaseAmount: 3000000,
    now: new Date("2026-07-07T00:00:00+07:00"),
  });
  assert.equal(result.overdueAt.toISOString(), "2026-07-06T17:00:00.000Z");
  assert.equal(result.penalty, 150000);
  assert.equal(result.isOverdue, true);
});

test("rejects an issued date in the future", () => {
  const { buildLateFeeSnapshot } = require("./src/services/overdueInvoice");
  assert.throws(() => buildLateFeeSnapshot({
    issuedAt: "2026-07-24",
    graceDays: 5,
    penaltyRate: 5,
    penaltyBaseAmount: 1000000,
    now: new Date("2026-07-23T12:00:00+07:00"),
  }));
});
```

- [ ] **Step 2: Verify RED**

Run: `cd backend && node --test test_overdue_invoice.js`  
Expected: FAIL because the evaluator does not exist.

- [ ] **Step 3: Add snapshot fields**

```js
issuedAt: { type: Date },
graceDaysSnapshot: { type: Number, min: 0 },
penaltyRateSnapshot: { type: Number, min: 0 },
overdueAt: { type: Date },
penaltyBaseAmount: { type: Number, min: 0 },
penaltyAppliedAt: { type: Date, default: null },
```

- [ ] **Step 4: Implement idempotent overdue update**

Use a conditional update:

```js
Invoice.findOneAndUpdate(
  {
    _id: invoiceId,
    status: { $in: [1, 3] },
    penaltyAppliedAt: null,
    overdueAt: { $lte: now },
  },
  [
    {
      $set: {
        status: 3,
        penalty: { $round: [{ $multiply: ["$penaltyBaseAmount", { $divide: ["$penaltyRateSnapshot", 100] }] }, 0] },
        totalAmount: {
          $add: [
            "$penaltyBaseAmount",
            { $round: [{ $multiply: ["$penaltyBaseAmount", { $divide: ["$penaltyRateSnapshot", 100] }] }, 0] },
          ],
        },
        penaltyAppliedAt: now,
      },
    },
  ],
  { new: true }
);
```

- [ ] **Step 5: Call the evaluator on list/detail/payment creation**

Invoice reads and payment creation must invoke the same evaluator before returning or creating a transaction.

- [ ] **Step 6: Verify and commit**

Run: `cd backend && npm test`  
Expected: all tests PASS.

```bash
git add backend
git commit -m "feat: apply idempotent overdue invoice penalties"
```

### Task 4: Add billing settings UI

**Files:**
- Create: `webadmin-next/src/app/dashboard/settings/page.tsx`
- Create: `webadmin-next/src/app/dashboard/settings/account/page.tsx`
- Create: `webadmin-next/src/app/dashboard/settings/banking/page.tsx`
- Create: `webadmin-next/src/app/dashboard/settings/billing/page.tsx`
- Modify: `webadmin-next/src/app/dashboard/layout.tsx`
- Test: `test_unified_webadmin_contracts.js`

- [ ] **Step 1: Extend RED tests for billing semantic API**

Assert the billing page calls `fetchAPI("/settings/billing-policy")`, uses `useNotification`, and contains `Số ngày ân hạn` and `Tỷ lệ phạt một lần`.

- [ ] **Step 2: Verify RED**

Run: `node --test test_unified_webadmin_contracts.js`  
Expected: FAIL because settings pages do not exist.

- [ ] **Step 3: Build settings navigation and forms**

The billing submit payload must be:

```ts
await fetchAPI("/settings/billing-policy", {
  method: "PUT",
  body: JSON.stringify({
    lateFeeGraceDays: Number(lateFeeGraceDays),
    lateFeeRate: Number(lateFeeRate),
  }),
});
notification.success("Đã lưu chính sách hóa đơn.");
```

- [ ] **Step 4: Verify**

Run: `cd webadmin-next && npm run lint && npm run build`  
Expected: PASS with no new warnings.

- [ ] **Step 5: Commit**

```bash
git add webadmin-next test_unified_webadmin_contracts.js
git commit -m "feat: add Admin settings center"
```

### Task 5: Port payments and dashboard strengths

**Files:**
- Create: `webadmin-next/src/app/dashboard/payments/page.tsx`
- Modify: `webadmin-next/src/app/dashboard/page.tsx`
- Modify: `webadmin-next/src/app/dashboard/layout.tsx`
- Modify: `backend/src/controllers/dashboardController.js`
- Test: `test_unified_webadmin_contracts.js`

- [ ] **Step 1: Write RED route and terminology contracts**

Assert the payment page uses `/payments`, `useNotification`, and `nguoiThue`; assert no forbidden terminology is present.

- [ ] **Step 2: Verify RED**

Run: `node --test test_unified_webadmin_contracts.js`  
Expected: FAIL because the payment route is absent.

- [ ] **Step 3: Implement payment history and dashboard cards**

Use typed response rows:

```ts
type PaymentRow = {
  _id: string;
  invoiceId: string;
  room: string;
  nguoiThue: string;
  amount: number;
  method: string;
  status: number;
  createdAt: string;
};
```

- [ ] **Step 4: Verify and commit**

Run: `cd webadmin-next && npm run lint && npm run build`  
Expected: PASS.

```bash
git add backend webadmin-next test_unified_webadmin_contracts.js
git commit -m "feat: port Admin dashboard and payments"
```

### Task 6: Build the four-step contract wizard

**Files:**
- Create: `webadmin-next/src/app/dashboard/contracts/new/page.tsx`
- Create: `webadmin-next/src/app/dashboard/contracts/new/contract-wizard.tsx`
- Create: `webadmin-next/src/app/dashboard/contracts/new/contract-wizard-state.ts`
- Create: `webadmin-next/src/app/dashboard/contracts/new/contract-wizard.test.js`
- Modify: `webadmin-next/src/app/dashboard/contracts/page.tsx`

- [ ] **Step 1: Write RED tests for step validation and Admin-isolated drafts**

```js
test("draft key is isolated by Admin", () => {
  const { buildContractDraftKey } = require("./contract-wizard-state");
  assert.equal(buildContractDraftKey("admin-123"), "trohub:contract-draft:admin-123");
});

test("step one requires roomId and tenantId", () => {
  const { validateContractStep } = require("./contract-wizard-state");
  assert.deepEqual(validateContractStep(1, { roomId: "", tenantId: "" }), {
    roomId: "Vui lòng chọn Phòng.",
    tenantId: "Vui lòng chọn Người thuê.",
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test webadmin-next/src/app/dashboard/contracts/new/contract-wizard.test.js`  
Expected: FAIL because state helpers do not exist.

- [ ] **Step 3: Implement state helpers and progress model**

```ts
export const CONTRACT_STEPS = [
  { id: 1, label: "Phòng và Người thuê" },
  { id: 2, label: "Điều khoản" },
  { id: 3, label: "Dịch vụ" },
  { id: 4, label: "Xác nhận" },
] as const;

export const buildContractDraftKey = (adminId: string) =>
  `trohub:contract-draft:${adminId}`;
```

- [ ] **Step 4: Implement the page and replace modal creation**

The list page button navigates to `/dashboard/contracts/new`. The wizard posts only `roomId`, `tenantId`, dates, fixed prices, initial indices, and selected service IDs/prices.

- [ ] **Step 5: Verify and commit**

Run:

```bash
node --test webadmin-next/src/app/dashboard/contracts/new/contract-wizard.test.js
cd webadmin-next && npm run lint && npm run build
```

Expected: PASS.

```bash
git add webadmin-next
git commit -m "feat: add contract creation wizard"
```

### Task 7: Complete invoice parity and issued date UI

**Files:**
- Modify: `webadmin-next/src/app/dashboard/invoices/page.tsx`
- Modify: `backend/src/controllers/invoiceController.js`
- Modify: `backend/test_overdue_invoice.js`

- [ ] **Step 1: Add RED tests for policy snapshot at issuance**

Assert that invoice creation ignores client snapshot fields and uses the authenticated Admin policy.

- [ ] **Step 2: Verify RED**

Run: `cd backend && node --test test_overdue_invoice.js`  
Expected: FAIL before snapshot integration.

- [ ] **Step 3: Add `issuedAt` to single and bulk forms**

The input must set `max` to the current local date and must not expose editable penalty fields.

- [ ] **Step 4: Verify and commit**

Run: `cd backend && npm test && cd ../webadmin-next && npm run build`  
Expected: PASS.

```bash
git add backend webadmin-next
git commit -m "feat: snapshot billing policy on invoices"
```

### Task 8: Move E2E coverage to Next.js port 3000

**Files:**
- Create: `webadmin-next/cypress.config.ts`
- Create: `webadmin-next/cypress/e2e/admin-login.cy.ts`
- Create: `webadmin-next/cypress/e2e/contract-wizard.cy.ts`
- Create: `webadmin-next/cypress/e2e/billing-policy.cy.ts`

- [ ] **Step 1: Configure Cypress**

```ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:3000",
    video: false,
  },
});
```

- [ ] **Step 2: Add authentication, wizard, and billing policy scenarios**

Each spec must intercept API calls with JSON fixtures and assert `useNotification` outcomes through visible messages.

- [ ] **Step 3: Run E2E**

Run: `cd webadmin-next && npx cypress run`  
Expected: all Admin scenarios PASS.

- [ ] **Step 4: Commit**

```bash
git add webadmin-next/cypress*
git commit -m "test: cover unified Admin workflows"
```

### Task 9: Delete legacy and rename atomically

**Files:**
- Delete: `webadmin/**`
- Move: `webadmin-next/**` to `webadmin/**`
- Modify: `test_ui_contracts.js`
- Modify: `test_notification_contracts.js`
- Modify: `test_webadmin_api_proxy.js`
- Modify: `test_unified_webadmin_contracts.js`
- Modify: `tsconfig.json`
- Modify: `README.md`

- [ ] **Step 1: Run the pre-deletion gate**

Run:

```bash
cd backend && npm test
cd ../webadmin-next && npm run lint && npm run build
cd .. && npm run test:ui
```

Expected: feature tests PASS; only the final filesystem assertion remains RED.

- [ ] **Step 2: Remove legacy and move Next.js**

Use `apply_patch` for tracked legacy files and `git mv webadmin-next webadmin` for the directory rename. Do not remove unrelated user files.

- [ ] **Step 3: Update active references**

All current tests and operational documentation must refer to `webadmin`. Remove port 5173 from active scripts/configuration.

- [ ] **Step 4: Verify final filesystem contract**

Run: `node --test test_unified_webadmin_contracts.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A webadmin webadmin-next package.json tsconfig.json README.md test_*.js
git commit -m "refactor: consolidate Web Admin into Next.js"
```

### Task 10: Full-system verification

**Files:**
- Create: `reports/unified-webadmin-report.md`

- [ ] **Step 1: Run backend verification**

Run: `cd backend && npm test`  
Expected: all Auth, business rules, invoice, billing policy, overdue and service tests PASS.

- [ ] **Step 2: Run Expo verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run unified Web Admin verification**

Run:

```bash
cd webadmin
npm run lint
npm run build
npx cypress run
```

Expected: no errors and all E2E scenarios PASS.

- [ ] **Step 4: Run repository contracts**

Run:

```bash
cd ..
npm run test:ui
git diff --check
rg -n "5173|webadmin-next" package.json README.md tsconfig.json test_*.js webadmin
```

Expected: tests PASS, diff check clean, and active paths contain no legacy port or directory name.

- [ ] **Step 5: Write the completion report**

Document final routes, feature parity, test totals, known non-blocking warnings, and the single startup command:

```bash
cd /Users/nguyen/TroHub_Local/webadmin && npm run dev
```

- [ ] **Step 6: Commit the report**

```bash
git add reports/unified-webadmin-report.md
git commit -m "docs: report unified Web Admin verification"
```
