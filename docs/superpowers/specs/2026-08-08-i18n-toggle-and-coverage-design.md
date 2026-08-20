# TroHub i18n Toggle and Coverage Design

## Scope

Repair the Vietnamese/English presentation system for the Expo Mobile application and Next.js WebAdmin. This is a UI-copy-only change: API payloads, status values used in comparisons, routes, RBAC, data models, and business calculations remain unchanged.

## Findings

- Mobile stores lower-case language codes, but its segmented control changes behavior when the active segment is pressed. This creates an implicit toggle path separate from explicit selection.
- WebAdmin exposes only a direct setter and reads legacy storage without normalizing upper-case values.
- Both catalog pairs are structurally balanced, but their coverage is not: Mobile has Vietnamese UI literals in 42 files and WebAdmin has Vietnamese UI literals in 33 files. Catalog presence does not ensure a component calls `t`.

## Design

1. Introduce a small, pure language-state helper on each platform: normalize persisted values to `vi | en`, resolve an optional explicit target or a two-way toggle, and keep the canonical `trohub_lang` value lower-case.
2. Expose one `changeLanguage(next?)` API in both providers. `setLanguage` and `toggleLanguage` remain compatibility aliases; controls always select the explicit segment and never infer a toggle from the pressed visual tab.
3. Keep the existing local JSON translator instead of adding a second i18n runtime. Expand the catalogs by feature namespace and convert presentation strings to `t(key, params)`. Backend status codes stay intact and are translated through label mappers.
4. Add deterministic verification: helper unit tests for VI → EN → VI, recursive catalog-parity tests, and source scanners that reject remaining Vietnamese presentation literals while allowing locale dictionaries and explicitly documented backend-status adapters.

## Acceptance Criteria

- Persisted `VI`, `vi`, `EN`, and `en` resolve to canonical lower-case values.
- An unspecified language change performs `vi → en → vi`; explicit selection is idempotent.
- Mobile and WebAdmin catalog key trees match exactly.
- Auth, dashboard, rooms, tenants, contracts, invoices/meters, repairs, settings, notifications, dialogs, toasts, and role-specific screens render through translation keys.
- All project checks, Mobile runtime bundle, and WebAdmin production build pass.
