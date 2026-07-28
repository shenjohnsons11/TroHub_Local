# TroHub UI System Rebuild v2 — Screen Audit

> Reference, read-only: `/Users/nguyen/TroHub_Local`
> Future implementation target: `/Users/nguyen/TroHub_Local_UI_Update`
> Gate: audit/mockup only until Owner says **“ĐỒNG Ý MOCKUP MỚI”**.

## Mobile shell and shared presentation

| Surface | Flow that stays unchanged | UI rebuild v2 |
|---|---|---|
| `app/index.tsx` | Login gate, role branch, active tab and callbacks | Keep branching untouched; wrap rendered screens in one 220 ms fade/slide transition. |
| `app/_layout.tsx` | Provider and hidden Stack headers | Load the shared display font and notification visuals at the existing provider boundary. |
| `app/modal.tsx` | Existing Expo modal route | Replace sample-looking presentation with the same surface, type and button tokens. |
| `BottomNav.tsx` | Five role-aware tabs and special active mappings | Floating blurred glass dock, dimensional active icon tile, safe-area inset and 44 px targets. |
| `Card.tsx` | Generic content wrapper | Borderless 20–24 px surface, two elevation levels, optional tint; no nested shadow stacks. |
| `AppLoadingScreen.tsx` | Initialization state and message | Architectural loading artwork, animated window lights/key orbit, branded progress and skeleton fallback. |
| `TroHubLogo.tsx` | Existing mark and wording | Preserve identity; normalize clear space and light/dark lockups. |

## Tenant mobile screens

| Screen | Flow that stays unchanged | UI rebuild v2 |
|---|---|---|
| `LoginScreen.tsx` | Identifier/password, validation, forgot password and submit | Cinematic emerald property scene plus compact ivory form; expressive heading, filled fields and dimensional submit state. |
| `HomeScreen.tsx` | Greeting, invitations, invoice, quick links, contract and repair | Deep-emerald “Cần thanh toán” hero with amount dominant; architectural micro-scene, coral deadline cue, compact task rail and staggered entrance. |
| `InvoiceScreen.tsx` | Filters, list, detail and payment modals | Collection hero, tactile filter control, amount-first rows, status tint; dedicated illustrated “Chưa có hóa đơn” state. |
| `ContractScreen.tsx` | Contract states, fees, signature, termination and deposit | Contract identity cover, semantic metadata grid, service tint section and consequence-aware actions; illustrated empty contract state. |
| `RepairScreen.tsx` | Create form, images, validation, list, select/delete | Guided issue composer, image well, priority timeline and floating selection action; illustrated “Chưa có sự cố”. |
| `UtilityScreen.tsx` | Current meters, report modal and history | Two luminous meter dials/cards, trend strip and compact monthly history; numeric readings outrank labels. |
| `AccountScreen.tsx` | Profile, stats, menu, logout and password modal | Property-key identity hero, single stat rail, grouped settings and isolated destructive logout. |
| `ProfileScreen.tsx` | Personal/contact/room fields and save | Editorial field groups with filled controls, tinted read-only tenancy panel and contextual sticky save. |
| `ChangePasswordScreen.tsx` | Mandatory change and logout | Focused security task surface with requirements beside the fields; no competing decoration. |

## Admin mobile screens

| Screen | Flow that stays unchanged | UI rebuild v2 |
|---|---|---|
| `AdminDashboardScreen.tsx` | Occupancy, repairs, revenue and quick actions | Mobile operations cockpit: revenue hero, occupancy ring, urgent task rail and compact workflow launcher. |
| `AdminRoomsScreen.tsx` | Filters, room list, detail and create modal | Building/floor grouping, occupancy signal tiles, amount/area hierarchy and a 24 px tactile sheet. |
| `AdminTenantsScreen.tsx` | List, duplicate validation and add modal | Tenant pulse summary, avatar rows and a modern add-tenant stepper without changing validation or submission. |
| `AdminContractsScreen.tsx` | Filters, approve and four-step creation | Pipeline hero and clearly staged stepper: Chọn phòng → Thông tin khách → Điện & nước → Ký & xác nhận. |
| `AdminInvoicesScreen.tsx` | Filters, create, remind, mark paid and detail | Collection command view, unpaid-first rhythm, amount emphasis and animated notification results. |
| `BulkInvoiceScreen.tsx` | Selection, meter inputs, preview, totals and issue | Four-step progress: Chọn kỳ → Chốt điện/nước → Xem trước → Phát hành; sticky amount/action rail. |
| `AdminRepairsScreen.tsx` | Filters, selection, bulk delete and update | Workload hero, priority lanes, compact status editor and illustrated zero-state. |
| `AdminSettingsScreen.tsx` | Owner/bank/security settings and logout | Split property identity, finance and security into tinted groups; preserve every existing handler. |

## Mobile modals, alerts and status

| Component | UI rebuild v2 |
|---|---|
| `InvoiceDetailModal.tsx` | 24 px sheet, amount hero, grouped line items and compact sticky footer. |
| `PaymentModal.tsx` | Preserve payment integrations; rebuild only method selector, VietQR area, polling/loading and result presentation. |
| `SignContractWizard.tsx` | Expressive four-stage header, completed connectors, step-specific illustration cue and fixed actions. |
| `ForgotPasswordModal.tsx`, `ChangePasswordModal.tsx` | Compact security sheets using shared filled fields and animated result notification. |
| `NotificationToast.tsx` / provider | One adapter for success, error, confirm and loading. Lottie or native animated SVG path: success draws and rotates; warning bounces; Reduce Motion shows a meaningful final frame. |

## WebAdmin shell and pages

| Route | Flow that stays unchanged | UI rebuild v2 |
|---|---|---|
| `/` | Existing login request and validation | Art-directed property panel, expressive type and compact glass/ivory login surface. |
| `/dashboard/layout.tsx` | Navigation hrefs, role and logout | Deep glass sidebar, translucent topbar, dimensional active icon, responsive collapse. |
| `/dashboard` | Existing metrics and shortcuts | High-definition operations dashboard: money-first hero, occupancy/revenue visuals, urgent tasks, hover table and pagination. |
| `/dashboard/rooms` | Search and create/edit room | Floor-oriented occupancy overview, dense room matrix and refined form dialog. |
| `/dashboard/tenants` | Search, CRUD and tenant table | Tenant summary, readable sticky table and step-based add-tenant dialog. |
| `/dashboard/contracts` | Search, CRUD, approval and delete | Contract pipeline, semantic table and animated SweetAlert2 decisions/results. |
| `/dashboard/contracts/new` | Existing draft and four-step wizard | Modern connected stepper: room → tenant → utility pricing → signature/confirmation; sticky review rail. |
| `/dashboard/invoices` | Search, bulk create, mark paid and delete | Collection overview, bulk-invoice stepper and amount-first table. |
| `/dashboard/payments` | Search and transaction table | Reconciliation pulse, strong transaction/money hierarchy and smooth pagination. |
| `/dashboard/debts` | Debt totals, search and reminder | Controlled coral warning surface, overdue grouping and animated reminder result. |
| `/dashboard/utilities` | Search and bulk meter entry | Period controller, focused editable meter grid and sticky save state. |
| `/dashboard/services` | Search, CRUD and service table | Compact service catalogue with dimensional category icons and refined dialog. |
| `/dashboard/repairs` | Search, status updates and table | Priority workload lanes, actionable table and illustrated empty state. |
| `/dashboard/settings` | Existing destination links | One architectural settings workspace instead of identical floating cards. |
| `/dashboard/settings/account` | Owner fields and password | Editorial form grouping, security inset and contextual loading. |
| `/dashboard/settings/banking` | Bank fields | Finance tint, bank-preview object and unchanged save behavior. |
| `/dashboard/settings/billing` | Grace/late fee and preview | Policy summary, clear numeric inputs and live preview surface. |

## Web shared layer and notifications

| Surface | UI rebuild v2 |
|---|---|
| `globals.css` | Outfit/Inter hierarchy, emerald/teal/mint/ivory/coral semantic tokens, 20–24 px radii, layered shadows, focus and reduced-motion rules. |
| Existing UI primitives | Restyle `button`, `input`, `select`, `badge`, `card`, `table` and `dialog`; reuse them instead of adding a second component kit. |
| Loading/empty states | Reuse the approved architectural artwork in loading and the three domain-specific empty states. |
| Alerts | Replace visual use of native browser alerts with one `useNotification()` adapter backed by official SweetAlert2; request/mutation logic remains intact. |

## Protected boundaries

- No edit to API clients, endpoints, payloads, models, backend, route behavior, business validation, payment logic or workflow order.
- No new metric or fake production data source.
- No application implementation before the exact approval phrase.
