# TroHub i18n Toggle and Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make language switching deterministic and make all user-facing Mobile and WebAdmin copy resolve from paired Vietnamese/English catalogs without changing product logic.

**Architecture:** Retain the existing lightweight JSON translators. Add a pure language helper per platform, route provider updates through `changeLanguage(next?)`, and use catalog namespaces plus status-label adapters for UI copy. Scanner scripts distinguish display literals from backend status constants.

**Tech Stack:** Expo/React Native, Next.js 16, TypeScript, Node test runner, local JSON catalogs.

---

## Task 1: Prove and repair language-target resolution

**Files:**
- Create: `utils/language.ts`, `tests/language.test.mts`
- Create: `webadmin/src/lib/language.ts`, `webadmin/tests/language.test.mts`
- Modify: `contexts/LanguageContext.tsx`, `components/LanguageToggle.tsx`
- Modify: `webadmin/src/components/language-provider.tsx`, `webadmin/src/components/language-toggle.tsx`, `webadmin/src/components/language-switcher.tsx`

- [ ] Write failing tests that expect `normalizeLanguage("VI") === "vi"`, `resolveLanguageTarget("vi") === "en"`, and an explicit target to remain idempotent.
- [ ] Run both tests and verify the helper modules are initially missing.
- [ ] Implement only `normalizeLanguage` and `resolveLanguageTarget` in the two helpers.
- [ ] Route all provider writes through `changeLanguage(next?)`; migrate legacy storage to canonical `trohub_lang` and make visual segments call the explicit target.
- [ ] Re-run tests and commit `fix: stabilize canonical language switching`.

## Task 2: Add catalog and hardcoded-copy verification

**Files:**
- Create: `scripts/verify-i18n-coverage.cjs`, `webadmin/scripts/verify-i18n-coverage.cjs`
- Modify: `scripts/verify-mobile-i18n.cjs`

- [ ] Add recursive key-parity checks for each `vi.json`/`en.json` pair.
- [ ] Add allowlisted scanner boundaries for locale files, service/API values, and status adapters; all UI source files are otherwise scanned for Vietnamese display literals.
- [ ] Run the scanners and record the current coverage failures.

## Task 3: Localize Mobile feature surfaces

**Files:**
- Modify: `locales/vi.json`, `locales/en.json`
- Modify: all affected files under `app/`, `components/`, `providers/`, and `screens/`

- [ ] Add paired namespaces for navigation/auth, tenant/landlord dashboards, rooms/floors, tenants/CCCD, contracts/checkout, invoices/meter readings, repairs, notifications, settings, empty/loading states, dialogs, and toasts.
- [ ] Convert each display string, label, placeholder, accessibility label, toast, and modal copy to `t(key, params)`; preserve backend value comparisons and translate their labels at the presentation boundary.
- [ ] Run TypeScript, lint, and the Mobile coverage scanner after each module group.
- [ ] Commit `feat: localize mobile interface coverage`.

## Task 4: Localize WebAdmin feature surfaces

**Files:**
- Modify: `webadmin/src/locales/vi.json`, `webadmin/src/locales/en.json`
- Modify: affected `webadmin/src/app/**` and `webadmin/src/components/**` UI files

- [ ] Add paired namespaces mirroring the Mobile product vocabulary, including payment/debt, service, account/banking/billing, notification, calendar, invoice drawer, and meter ledger copy.
- [ ] Convert user-facing strings to the provider `t` function, including title, label, placeholder, aria-label, dialog, empty, loading, and toast content.
- [ ] Use localized dates (`en-US`/`vi-VN`) and status-label mappers without changing stored values.
- [ ] Run lint and the Web coverage scanner after each route group.
- [ ] Commit `feat: localize WebAdmin interface coverage`.

## Task 5: Verify all paths and ship

**Files:** no source change expected.

- [ ] Run both language-helper tests, both coverage scanners, Mobile lint/TypeScript, Web lint, and Web `npm run build`.
- [ ] Bundle Mobile on iPhone Simulator, exercise explicit EN then VI selection, and capture its UI; exercise WebAdmin toggle in both directions when the local server is available.
- [ ] Inspect `git diff --check`, list intentional files only, and report residual environment limitations separately from application results.
