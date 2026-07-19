# TroHub HTML Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete static HTML prototype that demonstrates every manager and tenant screen, interaction, responsive state, and approved TroHub visual direction without calling production APIs.

**Architecture:** A dependency-free SPA under `demo/` uses hash routing, a centralized local store, event delegation, and focused render modules grouped by domain. Semantic CSS tokens and reusable component helpers keep Desktop, Tablet, and Mobile visually synchronized while role-specific shells preserve platform-appropriate density.

**Tech Stack:** HTML5, modern CSS, ES modules, Node.js built-in test runner, static HTTP server.

---

## File structure

- `demo/index.html`: document shell and application mount.
- `demo/styles.css`: tokens, layout primitives, components, responsive rules, motion and themes.
- `demo/data.js`: immutable seed data and `createInitialState()`.
- `demo/store.js`: state access, subscriptions, mutations and reset.
- `demo/router.js`: route table, hash parsing and navigation.
- `demo/ui.js`: reusable markup helpers, icons, modal, toast, empty and loading states.
- `demo/screens/auth.js`: role picker and authentication screens.
- `demo/screens/admin.js`: manager dashboard and resource screens.
- `demo/screens/admin-workflows.js`: manager forms, wizards, CRUD and bulk actions.
- `demo/screens/tenant.js`: tenant dashboard and resource screens.
- `demo/screens/tenant-workflows.js`: tenant forms, signing, payment and repair actions.
- `demo/app.js`: application composition and delegated event handling.
- `demo/tests/demo-contract.test.js`: static and behavioral contracts.
- `demo/tests/store.test.js`: state mutation and business-invariant tests.

### Task 1: Contract tests and static shell

**Files:**
- Create: `demo/tests/demo-contract.test.js`
- Create: `demo/index.html`
- Create: `demo/app.js`
- Create: `demo/styles.css`

- [ ] **Step 1: Write failing static contract tests**

Create tests that read the demo source and assert the mount node, module entry, semantic token names, route names, role labels, banned-term scan, reduced-motion support and absence of direct API calls.

```js
test('demo exposes both complete role shells', () => {
  const source = read('app.js') + read('screens/admin.js') + read('screens/tenant.js');
  assert.match(source, /admin\/dashboard/);
  assert.match(source, /tenant\/overview/);
});

test('demo preserves repair ownership', () => {
  const source = allDemoSource();
  assert.match(source, /nguoiThueId/);
  assert.doesNotMatch(source, /repair[^\n]{0,80}roomId/i);
});
```

- [ ] **Step 2: Run the contract test and verify red state**

Run: `node --test demo/tests/demo-contract.test.js`

Expected: FAIL because the demo source does not exist.

- [ ] **Step 3: Create the accessible HTML shell**

Add `#app`, `#modal-root`, `#toast-root`, skip link, viewport metadata and `<script type="module" src="./app.js">`.

- [ ] **Step 4: Add base semantic tokens and reduced-motion reset**

Define `--canvas`, `--surface`, `--text`, `--muted`, `--border`, `--primary`, `--positive`, `--warning`, `--danger`, spacing and radius tokens for light/dark modes. Add focus-visible and `prefers-reduced-motion` rules.

- [ ] **Step 5: Run tests and commit foundation**

Run: `node --test demo/tests/demo-contract.test.js`

Expected: route assertions remain FAIL while shell/style assertions PASS.

Commit: `test: define TroHub prototype contracts`

### Task 2: Seed data, store and repair invariant

**Files:**
- Create: `demo/data.js`
- Create: `demo/store.js`
- Create: `demo/tests/store.test.js`

- [ ] **Step 1: Write failing store tests**

Cover reset, create/update/delete, filtering, selection, theme, viewport and repair ownership.

```js
test('creating a repair requires nguoiThueId and stores no room ownership', () => {
  const store = createStore(createInitialState());
  const repair = store.actions.createRepair({ nguoiThueId: 'nt-01', title: 'Vòi nước bị rò' });
  assert.equal(repair.nguoiThueId, 'nt-01');
  assert.equal(Object.hasOwn(repair, 'roomId'), false);
});
```

- [ ] **Step 2: Run store tests and verify failure**

Run: `node --test demo/tests/store.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement realistic seed data**

Create accounts, rooms, tenants, contracts, invoices, utility readings, invitations, repairs and activity records. Repairs contain `nguoiThueId`, `contractId`, status, priority, images and notes only.

- [ ] **Step 4: Implement the observable store**

Expose `getState()`, `subscribe()`, `dispatch()`, domain actions and `reset()`. Clone seed data with `structuredClone` and persist only theme/viewport to `localStorage`.

- [ ] **Step 5: Verify and commit store**

Run: `node --test demo/tests/store.test.js`

Expected: PASS.

Commit: `feat: add prototype data store`

### Task 3: Router, shared UI and application shell

**Files:**
- Create: `demo/router.js`
- Create: `demo/ui.js`
- Modify: `demo/app.js`
- Modify: `demo/styles.css`
- Modify: `demo/tests/demo-contract.test.js`

- [ ] **Step 1: Add failing router and shell contracts**

Assert hash parsing, fallback route, active navigation, theme toggle, viewport switcher, modal root and toast live region.

- [ ] **Step 2: Implement the route table**

Register auth, manager and tenant routes with `role`, `title`, `navKey` and render function keys. Unknown hashes redirect to `#/role`.

- [ ] **Step 3: Implement reusable UI helpers**

Create safe HTML escaping, inline SVG primitives, buttons, badges, filters, table/list adapters, form fields, modal, confirm dialog, toast, skeleton and empty-state helpers.

- [ ] **Step 4: Compose the responsive shells**

Implement manager sidebar/topbar, tenant bottom navigation, compact mobile drawer, role switcher, theme toggle and Desktop/Tablet/Mobile preview controls.

- [ ] **Step 5: Verify and commit shell**

Run: `node --test demo/tests/*.test.js`

Expected: PASS for router/shell contracts.

Commit: `feat: build prototype navigation shell`

### Task 4: Authentication and entry flow

**Files:**
- Create: `demo/screens/auth.js`
- Modify: `demo/app.js`
- Modify: `demo/styles.css`
- Modify: `demo/tests/demo-contract.test.js`

- [ ] **Step 1: Add failing auth route/action contracts**

Cover role selection, login, register, forgot password, validation and demo credential shortcuts.

- [ ] **Step 2: Build the asymmetric authentication layout**

Use a narrow functional form column and an editorial product-summary field. Maintain two-line heading limits and responsive single-column collapse.

- [ ] **Step 3: Implement auth interactions**

Validate required fields and email shape, show inline errors, simulate loading, route managers to `#/admin/dashboard` and tenants to `#/tenant/overview`.

- [ ] **Step 4: Verify and commit auth flow**

Run: `node --test demo/tests/*.test.js`

Expected: PASS.

Commit: `feat: add interactive prototype authentication`

### Task 5: Manager overview and resource screens

**Files:**
- Create: `demo/screens/admin.js`
- Modify: `demo/styles.css`
- Modify: `demo/tests/demo-contract.test.js`

- [ ] **Step 1: Add failing manager screen contracts**

Assert routes for dashboard, rooms, tenants, contracts, invoices, debts, utilities, repairs and settings.

- [ ] **Step 2: Build the manager dashboard**

Render asymmetric metrics, collection progress, recent activity, attention queue and quick actions with responsive density.

- [ ] **Step 3: Build reusable resource views**

Render desktop tables and mobile record blocks with search, segmented filters, selection states, status badges, contextual actions, empty and loading states.

- [ ] **Step 4: Implement every manager read screen**

Add room detail, tenant detail, contract detail, invoice detail, debt summary, utility entry grid, repair detail and account settings.

- [ ] **Step 5: Verify and commit manager screens**

Run: `node --test demo/tests/*.test.js`

Expected: PASS with all manager route contracts green.

Commit: `feat: add manager prototype screens`

### Task 6: Manager CRUD, wizards and bulk actions

**Files:**
- Create: `demo/screens/admin-workflows.js`
- Modify: `demo/app.js`
- Modify: `demo/styles.css`
- Modify: `demo/tests/store.test.js`

- [ ] **Step 1: Add failing workflow tests**

Cover room CRUD, tenant duplicate validation, contract wizard, invoice creation, bulk invoice creation, payment reminders, mark-paid, utility bulk save, repair update and bulk delete.

- [ ] **Step 2: Implement room and tenant modal forms**

Use inline validation, populated edit state, confirm-before-delete and toast feedback.

- [ ] **Step 3: Implement the contract wizard**

Create four steps: tenant, room, terms/services and review. Persist draft state between steps and validate before advancing.

- [ ] **Step 4: Implement invoice and utility workflows**

Support single and bulk creation, calculated totals, local mark-paid/reminder/delete actions and validated bulk utility entry.

- [ ] **Step 5: Implement repair management**

Update priority/status/note, select all, select individual records and confirm bulk deletion without changing ownership fields.

- [ ] **Step 6: Verify and commit manager interactions**

Run: `node --test demo/tests/*.test.js`

Expected: PASS.

Commit: `feat: add manager prototype workflows`

### Task 7: Tenant screens and interactions

**Files:**
- Create: `demo/screens/tenant.js`
- Create: `demo/screens/tenant-workflows.js`
- Modify: `demo/app.js`
- Modify: `demo/styles.css`
- Modify: `demo/tests/demo-contract.test.js`
- Modify: `demo/tests/store.test.js`

- [ ] **Step 1: Add failing tenant contracts**

Cover overview, invitation decisions, contracts, invoices, payment QR, utilities, repair creation/history, profile and account routes.

- [ ] **Step 2: Build the tenant overview and navigation**

Render next payment, active contract, utility snapshot, invitations and recent repair status with bottom navigation on narrow viewports.

- [ ] **Step 3: Build contract and invoice flows**

Add filter/detail screens, signing confirmation, termination request, QR payment modal and simulated successful payment.

- [ ] **Step 4: Build utilities and repair flows**

Add usage history, incorrect-reading report, repair form with local image previews, list filters, selection and deletion. The form derives display room data through the active contract while storing only `nguoiThueId` ownership.

- [ ] **Step 5: Build profile and account flows**

Support profile validation/save, password update, logout and reset demo data.

- [ ] **Step 6: Verify and commit tenant interactions**

Run: `node --test demo/tests/*.test.js`

Expected: PASS.

Commit: `feat: add tenant prototype screens and flows`

### Task 8: Visual polish, accessibility and browser QA

**Files:**
- Modify: `demo/styles.css`
- Modify: `demo/app.js`
- Modify: `demo/tests/demo-contract.test.js`
- Create: `demo/README.md`

- [ ] **Step 1: Add final pre-flight contracts**

Assert focus-visible styles, reduced motion, minimum control sizing, dark tokens, no forbidden copy, no remote API fetch and no placeholder markers.

- [ ] **Step 2: Complete responsive and motion polish**

Verify 1440×900, 768×1024 and 390×844 layouts; use only opacity/transform animations; prevent document-level horizontal overflow.

- [ ] **Step 3: Perform keyboard and state QA**

Test skip link, tab order, Enter submit, Escape modal close, confirm dialogs, empty/loading/error/disabled states and focus restoration.

- [ ] **Step 4: Add run and review instructions**

Document `python3 -m http.server 4173 --directory demo`, the demo credentials, role switcher, viewport switcher, theme toggle and reset action.

- [ ] **Step 5: Run final verification**

Run:

```bash
node --test demo/tests/*.test.js
node --check demo/app.js
node --check demo/data.js
node --check demo/store.js
node --check demo/router.js
```

Expected: all commands exit 0.

- [ ] **Step 6: Start the demo and inspect in browser**

Run: `python3 -m http.server 4173 --directory demo`

Expected: the prototype loads at `http://localhost:4173`, every navigation item resolves and all documented interactions respond.

- [ ] **Step 7: Commit verified prototype**

Commit: `feat: complete TroHub interactive HTML prototype`
