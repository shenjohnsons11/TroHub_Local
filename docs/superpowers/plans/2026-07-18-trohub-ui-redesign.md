# TroHub UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trien khai prototype giao dien dong nhat cho Expo Mobile, Web Admin legacy va Web Admin Next.js voi logo TRO HUB moi, light/dark theme, loading screen, responsive va accessibility ma khong thay doi backend/API.

**Architecture:** Moi frontend giu framework va luong hien co, nhung dung cung mot bo semantic token va quy tac nhan dien. UI contract test tai root kiem tra cac yeu cau bat bien; moi ung dung co implementation ban dia de tranh them dependency va tranh lien ket build cheo.

**Tech Stack:** Expo 54, React Native 0.81, React 19, vanilla HTML/CSS/JS, Next.js 16, Tailwind CSS 4, Node test runner, Cypress.

---

### Task 1: UI Contract Tests

**Files:**
- Create: `test_ui_contracts.js`
- Modify: `package.json`
- Test: `test_ui_contracts.js`

- [ ] **Step 1: Write failing tests for shared identity and theme contracts**

Create Node tests that assert:

```js
test("all frontends expose the TRO HUB identity", () => {
  assert.match(read("components/TroHubLogo.tsx"), /TRO HUB/);
  assert.match(read("webadmin/index.html"), /trohub-logo/);
  assert.match(read("webadmin-next/src/components/trohub-logo.tsx"), /TRO HUB/);
});

test("all frontends implement light dark and reduced motion", () => {
  assert.match(read("constants/theme.ts"), /dark/);
  assert.match(read("webadmin/src/styles.css"), /prefers-reduced-motion/);
  assert.match(read("webadmin-next/src/app/globals.css"), /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run tests and verify expected failure**

Run: `node --test test_ui_contracts.js`

Expected: FAIL because the new logo components and theme contracts do not exist yet.

- [ ] **Step 3: Add the UI test script**

Add to root `package.json`:

```json
"test:ui": "node --test test_ui_contracts.js"
```

- [ ] **Step 4: Keep tests red until Tasks 2-4 complete**

Do not weaken assertions to fit old code.

### Task 2: Expo Foundation, Logo And Loading

**Files:**
- Modify: `constants/theme.ts`
- Create: `components/TroHubLogo.tsx`
- Create: `components/AppLoadingScreen.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`
- Test: `test_ui_contracts.js`

- [ ] **Step 1: Define semantic light and dark token objects**

Keep compatibility exports for existing `COLORS` consumers while adding semantic tokens for background, surface, elevated surface, text, muted text, border, primary orange, positive green, danger, focus and overlay.

- [ ] **Step 2: Implement the responsive TRO HUB logo**

Create a React Native component with `mark`, `full` and `compact` modes. Build the two skewed letter blocks from `View` and `Text`, include accessibility text, and avoid image/network dependencies.

- [ ] **Step 3: Implement AppLoadingScreen**

Render theme-aware logo, wordmark, contextual status and a determinate decorative progress bar. Use Reanimated only when reduced motion is not requested; otherwise render a static bar.

- [ ] **Step 4: Wire startup and session restoration**

Replace the old activity indicator in `app/index.tsx` with `AppLoadingScreen`. Preserve all authentication, role and navigation behavior.

- [ ] **Step 5: Run TypeScript verification**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 3: Expo Screen System

**Files:**
- Modify: `components/Card.tsx`
- Modify: `components/BottomNav.tsx`
- Modify: `screens/LoginScreen.tsx`
- Modify: `screens/HomeScreen.tsx`
- Modify: `screens/AdminDashboardScreen.tsx`
- Modify: `screens/InvoiceScreen.tsx`
- Modify: `screens/ContractScreen.tsx`
- Modify: `screens/RepairScreen.tsx`
- Modify: `screens/UtilityScreen.tsx`
- Modify: `screens/ProfileScreen.tsx`
- Modify: `screens/AccountScreen.tsx`
- Modify: `screens/AdminRoomsScreen.tsx`
- Modify: `screens/AdminTenantsScreen.tsx`
- Modify: `screens/AdminContractsScreen.tsx`
- Modify: `screens/AdminInvoicesScreen.tsx`
- Modify: `screens/AdminRepairsScreen.tsx`
- Modify: `screens/AdminSettingsScreen.tsx`
- Modify: `screens/BulkInvoiceScreen.tsx`
- Modify: modal components under `components/`
- Test: `test_ui_contracts.js`

- [ ] **Step 1: Normalize shared surfaces and navigation**

Update Card and BottomNav to semantic tokens, 13px surface radius, 44px touch targets and clear selected/focus states.

- [ ] **Step 2: Redesign login and dashboards first**

Apply the selected logo, hierarchy, orange primary CTA, green positive state and structured gray surfaces without changing handlers or form payloads.

- [ ] **Step 3: Normalize list/detail screens**

Replace local palette drift with semantic tokens while preserving existing content, actions, filters and navigation.

- [ ] **Step 4: Normalize forms and modals**

Use consistent control height, radius, overlays, error states and action placement. Do not lock final field-label copy during this prototype phase.

- [ ] **Step 5: Verify Expo**

Run: `npm run lint` and `npx tsc --noEmit`.

Expected: both exit 0.

### Task 4: Web Admin Legacy Theme And Shell

**Files:**
- Modify: `webadmin/index.html`
- Modify: `webadmin/src/styles.css`
- Modify: `webadmin/src/app.js`
- Create: `webadmin/src/theme.js`
- Test: `test_ui_contracts.js`
- Test: `webadmin/cypress/e2e/login.cy.js`
- Test: `webadmin/cypress/e2e/admin_workflows.cy.js`

- [ ] **Step 1: Add logo markup, startup loading surface and theme bootstrap**

Place the non-interactive startup surface in `index.html` so it renders before JavaScript. Use `theme.js` to resolve local preference then system preference before the app shell paints.

- [ ] **Step 2: Replace CSS foundation**

Define semantic variables for both themes, shared radius rules, focus rings, reduced motion, responsive sidebar/drawer behavior and table mobile fallbacks.

- [ ] **Step 3: Update app render helpers**

Add reusable logo and theme-toggle render helpers. Preserve every `data-action`, route-like state key, API call and visible business term.

- [ ] **Step 4: Run static checks**

Run: `node --check webadmin/src/app.js` and `node --check webadmin/src/theme.js`.

Expected: both exit 0.

- [ ] **Step 5: Run Cypress smoke tests**

Run: `cd webadmin && npx cypress run --spec cypress/e2e/login.cy.js,cypress/e2e/admin_workflows.cy.js`.

Expected: all selected specs pass.

### Task 5: Web Admin Next.js Theme And Screens

**Files:**
- Modify: `webadmin-next/src/app/globals.css`
- Modify: `webadmin-next/src/app/layout.tsx`
- Modify: `webadmin-next/src/app/page.tsx`
- Modify: `webadmin-next/src/app/dashboard/layout.tsx`
- Modify: all pages under `webadmin-next/src/app/dashboard/`
- Create: `webadmin-next/src/components/trohub-logo.tsx`
- Create: `webadmin-next/src/components/theme-toggle.tsx`
- Create: `webadmin-next/src/components/app-loading.tsx`
- Test: `test_ui_contracts.js`

- [ ] **Step 1: Replace global tokens with TroHub dual-theme variables**

Use Tailwind v4 semantic variables, system dark preference, manual `.dark` override, visible focus styles and reduced-motion overrides.

- [ ] **Step 2: Implement reusable identity and theme components**

Create accessible logo, theme toggle and loading components without adding a package.

- [ ] **Step 3: Redesign login/register**

Use a responsive asymmetric split, preserve handlers and field payloads, and provide inline loading/error/success states.

- [ ] **Step 4: Redesign dashboard shell and pages**

Apply one-line desktop navigation, responsive sidebar, semantic tables/forms/dialogs and mobile fallbacks while preserving routes and data flow.

- [ ] **Step 5: Verify Next.js**

Run: `npm run lint`, `npx tsc --noEmit` and `npm run build` from `webadmin-next/`.

Expected: all exit 0.

### Task 6: Contract Test Green And Visual Pre-Flight

**Files:**
- Modify: files from Tasks 2-5 if verification identifies defects
- Test: `test_ui_contracts.js`

- [ ] **Step 1: Run UI contract tests**

Run: `npm run test:ui`.

Expected: PASS after all three frontends expose identity, themes and reduced-motion support.

- [ ] **Step 2: Run business regression tests**

Run: `cd backend && npm test`.

Expected: business rules still pass despite no backend edits.

- [ ] **Step 3: Start all frontend development servers**

Run Expo Web, Web Admin legacy and Web Admin Next.js on separate available ports.

- [ ] **Step 4: Inspect responsive states**

Verify login, dashboard and one data-heavy screen at 1440x900, 768x1024 and 390x844. Confirm no overlap, clipped controls, wrapped desktop CTA or accidental horizontal page scroll.

- [ ] **Step 5: Inspect accessibility states**

Verify light/dark contrast, keyboard focus, visible labels or accessible names, 44px targets and static reduced-motion rendering.

- [ ] **Step 6: Run Taste Skill pre-flight**

Check the approved design read and dials, zero forbidden dash characters in visible new copy, one accent hierarchy, consistent radius rules, responsive collapse, no fake screenshots, no decorative status dots and no duplicated CTA intent.

- [ ] **Step 7: Present live URLs for review**

Keep the three servers running and provide their URLs with a concise list of screens ready for review.
