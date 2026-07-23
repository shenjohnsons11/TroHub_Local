# TroHub Auth and Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove public registration, make phone number or username the primary login identifier, and establish reliable Vietnamese typography in Expo and Next.js.

**Architecture:** Authentication normalization and account lookup move into testable backend helpers while the public registration route becomes an explicit 403 boundary. Expo and Next.js use focused login-only views, with typography configured once at each application root.

**Tech Stack:** Node.js test runner, Express, Mongoose, React Native/Expo, Next.js 16, React 19, Tailwind CSS 4.

---

### Task 1: Lock Authentication and Typography Contracts

**Files:**
- Create: `backend/test_auth_contract.js`
- Modify: `test_ui_contracts.js`

- [ ] **Step 1: Add failing backend tests**

Test identifier normalization for dotted, spaced, and hyphenated phone numbers; query construction for username and legacy email; and the public registration handler’s 403 response without writing an account.

- [ ] **Step 2: Add failing UI contract tests**

Assert that Expo and Next.js no longer contain registration forms or public registration calls, both expose “Số điện thoại hoặc tên đăng nhập”, the Expo theme exports font-family tokens, and Next.js uses `next/font`.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
node --test backend/test_auth_contract.js
npm run test:ui
```

Expected: failures caused by missing auth helpers, remaining registration UI, and missing font integration.

### Task 2: Harden the Backend Authentication Boundary

**Files:**
- Create: `backend/src/services/authIdentifier.js`
- Modify: `backend/src/controllers/authController.js`
- Modify: `backend/src/routes/authRoutes.js`

- [ ] **Step 1: Implement identifier normalization and lookup**

Create pure helpers that trim identifiers, normalize Vietnamese phone formatting, and produce a lookup query ordered by phone, username, then legacy email.

- [ ] **Step 2: Disable public registration**

Return HTTP 403 from the public registration endpoint with a stable error code and guidance that accounts are created by Admin.

- [ ] **Step 3: Preserve login compatibility**

Keep the existing request field `username`, JWT payload, response shape, role behavior, and legacy email matching.

- [ ] **Step 4: Run backend tests and verify GREEN**

Run:

```bash
node --test backend/test_auth_contract.js backend/test_business_rules.js
```

Expected: all authentication and business-invariant tests pass.

### Task 3: Refactor the Expo Login and Font Tokens

**Files:**
- Modify: `constants/theme.ts`
- Modify: `screens/LoginScreen.tsx`
- Modify: `app/index.tsx`
- Modify: `services/authService.ts`

- [ ] **Step 1: Add shared Expo typography tokens**

Define platform-aware sans and monospace font families with Vietnamese-safe system fallbacks.

- [ ] **Step 2: Replace the combined auth screen**

Remove registration state, fields, validation, submission, and navigation. Rename the login callback argument and state to `identifier`, use the approved label, retain forgot-password access, and apply the typography tokens.

- [ ] **Step 3: Remove the public registration client method**

Delete the unused public register method and registration payload type while retaining login and session behavior.

- [ ] **Step 4: Verify Expo contracts**

Run:

```bash
npm run test:ui
npx tsc --noEmit
npm run lint
```

Expected: UI contracts, TypeScript, and Expo lint pass.

### Task 4: Refactor Next.js Login and Font Loading

**Files:**
- Modify: `webadmin-next/src/app/layout.tsx`
- Modify: `webadmin-next/src/app/globals.css`
- Modify: `webadmin-next/src/app/page.tsx`

- [ ] **Step 1: Integrate the framework font**

Load a Vietnamese-capable sans through `next/font`, expose its CSS variable on `<html>`, and make Tailwind’s `font-sans` consume it with explicit fallbacks.

- [ ] **Step 2: Replace the combined auth page**

Remove registration state, handler, fields, tabs, formatter imports, and public API call. Rename email-first state to `identifier`, use the approved label and helper copy, and retain login response/session behavior.

- [ ] **Step 3: Verify Next.js**

Run:

```bash
cd webadmin-next
npm run lint
npm run build
```

Expected: lint and production build exit successfully.

### Task 5: Visual Verification and Report

**Files:**
- Create: `reports/auth_typography_report.md`

- [ ] **Step 1: Start the required local services**

Start the backend, Expo web surface, and Next.js Admin using their existing scripts without changing production configuration.

- [ ] **Step 2: Capture both login views**

Render and inspect the Expo web login and Next.js login at desktop and mobile widths. Confirm font rendering, Vietnamese diacritics, focus hierarchy, dark/light compatibility, and absence of registration UI.

- [ ] **Step 3: Record verified evidence**

Write the commands, exit codes, visual observations, and any remaining environment limitations to the report.

- [ ] **Step 4: Re-run the final verification suite**

Run the backend tests, UI contracts, TypeScript checks, linters, and Next.js build again immediately before reporting completion.
