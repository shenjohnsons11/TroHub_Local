# TroHub UI Refresh - Screen and Component Inventory

> Reference read-only: `/Users/nguyen/TroHub_Local`
> Implementation workspace: `/Users/nguyen/TroHub_Local_UI_Update`
> Scope: presentation only. Logic, flow, API, payload, validation and route behavior are protected.

## Mobile app shell and routes

| Surface | Current role/flow | UI change |
|---|---|---|
| `app/index.tsx` | Login gate, role branch, active tab state, screen rendering | Keep all branches and callbacks. Add keyed screen crossfade/short slide only around rendered view; never animate navigation state itself. Keep max-width web preview behavior. |
| `app/_layout.tsx` | Wraps `NotificationProvider`, hides Stack headers | No flow change. Mount final notification/Lottie asset preloading at provider level only if needed. |
| `app/modal.tsx` | Expo sample modal route | Apply shared typography/button/surface so no default Expo screen leaks into the app. Do not add a new route or behavior. |
| `BottomNav.tsx` | Five tabs per role; special active mapping for Utility/Profile | Floating blurred material, 20-24 px outer radius, 12 px inset, 44 px targets, active capsule. Preserve tab arrays, labels and special active rules. |
| `AppLoadingScreen.tsx` | Full-app initialization progress | Deep-green brand mark/progress, soft pulse, action-specific message. Respect Reduce Motion. |
| `TroHubLogo.tsx` | Canonical TH lockup | Preserve mark and wording; only normalize spacing/sizing and light/dark contrast. |

## Người thuê screens

| Screen | Existing content and flow | Specific UI changes |
|---|---|---|
| `LoginScreen.tsx` | Identifier/password, validation, loading, forgot-password modal | Split brand field and compact form surface; deep-green gradient identity panel; filled 16 px inputs; visible label/helper/error grouping; primary button with local loading; preserve keyboard and submit behavior. |
| `HomeScreen.tsx` | Greeting, invites, current invoice, quick links, contract/repair summaries | Make “Cần thanh toán” the single gradient hero with amount as top visual priority; invitation becomes warm tint section; quick actions become one compact group; contract and repair become two concise rows; stagger entrance once. |
| `InvoiceScreen.tsx` | All/unpaid/paid filters, invoice list, detail and payment modals | Gradient unpaid summary; pill filter group; amount-first invoice rows grouped by status/time; primary/secondary actions use one vocabulary; empty/loading states match final list geometry. |
| `ContractScreen.tsx` | Contract states, rent/deposit, service fees, signature, termination and deposit payment | Active contract hero with status; two-column metadata grid; service/meter terms in mint group; signature/deposit/termination actions visually separated by consequence; preserve all state-dependent branches. |
| `RepairScreen.tsx` | Create form, room/type/description/images, validation, history, selection and deletion | Tinted form section; filled controls; upload well without decorative border; compact request timeline; semantic priority/status pills; bulk selection bar floats above content without changing selection logic. |
| `UtilityScreen.tsx` | Current meter summary, report modal, history | Gradient electricity/water summary; two clear meter columns; tinted report form sheet; history grouped by month; numeric hierarchy stronger than labels. |
| `AccountScreen.tsx` | Profile identity, stats, account menu, logout, password modal | Profile hero; single compact stat strip; settings as one grouped list; logout isolated as destructive action; keep navigation and stats calls. |
| `ProfileScreen.tsx` | Personal/contact/room fields and save | Group identity, contact and tenancy fields; use filled shared input; disabled fields use tint rather than gray border; sticky save action only within screen safe area. |
| `ChangePasswordScreen.tsx` | Mandatory password change and logout | Security-focused centered surface; requirement/helper text next to fields; shared input/button; no decorative hero competing with mandatory task. |

## Chủ trọ/Admin Mobile screens

| Screen | Existing content and flow | Specific UI changes |
|---|---|---|
| `AdminDashboardScreen.tsx` | Occupancy, repairs, revenue, quick actions | Deep-green operations hero with revenue/occupancy; priority tasks in tint section; compact metrics without a border grid; quick actions grouped by workflow. |
| `AdminRoomsScreen.tsx` | Status filters, room list, detail modal, create-room modal | Occupancy summary hero; pill filters; rooms grouped by status; amount/area hierarchy; 24 px bottom sheet for detail/create with filled inputs. |
| `AdminTenantsScreen.tsx` | Tenant list, duplicate validation, add-tenant modal | Tenant count/active summary; avatar rows in one surface group; validation stays inline plus toast; add form uses shared sheet/input/button. |
| `AdminContractsScreen.tsx` | Contract list, filters, approve, four-step creation wizard | Contract pipeline summary; grouped pending/active sections; compact status rows; wizard gets clear stage header, selected tint and sticky actions. Preserve its full four-step order, date behavior and service toggles. |
| `AdminInvoicesScreen.tsx` | Invoice list, filters, create, remind, mark paid, detail | Collection/revenue hero; group unpaid first; amount-first rows; create sheet uses compact meter grid; reminder and mark-paid retain existing handlers but use notification adapter. |
| `BulkInvoiceScreen.tsx` | Bulk preview, selection, meter inputs, totals, issue action | Gradient issue summary with selected count/total; room blocks use selected tint, not borders; meter fields align in two columns; sticky issue button; blocking loading only during atomic issue operation. |
| `AdminRepairsScreen.tsx` | Status filters, selectable requests, bulk delete, update modal | Priority/workload hero; pending and completed tint groups; compact selectable rows; update sheet groups priority, status and note; bulk action bar is visually distinct. |
| `AdminSettingsScreen.tsx` | Owner info, bank/QR settings, security, logout | Separate owner, banking and security sections by background tint and spacing; filled inputs; save action fixed to form context; destructive logout isolated. |

## Mobile detail, modal, alert and loading surfaces

| Component | Current use | Specific UI changes |
|---|---|---|
| `Card.tsx` | Generic bordered/elevated wrapper | Become borderless semantic surface with 20-22 px radius and one tinted shadow token. Avoid nested card defaults. |
| `InvoiceDetailModal.tsx` | Line items, total, payment/mark-paid action | 24 px sheet; total hero; line items in grouped rows; compact sticky footer. |
| `PaymentModal.tsx` | Method selection, VietQR, VNPay, ZaloPay, polling, WebView state | Keep all payment code. Replace local styling with shared sheet, segmented methods, amount hero and contextual loading/result section. Migrate remaining `Alert.alert` calls to adapter. |
| `SignContractWizard.tsx` | Four steps and agreement | Step header with progress, plain content sections, selected tint, sticky back/continue/sign bar. No step-order change. |
| `ForgotPasswordModal.tsx` | Phone input and submit | Compact recovery sheet; label/helper/error; local submit loading; result via Lottie toast. |
| `ChangePasswordModal.tsx` | Old/new/confirm and submit | Compact security sheet; password requirements; shared inputs; result via Lottie toast. |
| `NotificationToast.tsx` | Success/error/warning/info toast surface | Floating borderless toast, 56 px max animated Lottie glyph, concise copy and close action. |
| `NotificationProvider.tsx` | Toast + confirm modal | Central modal 20-24 px radius; Lottie success/error/warning glyphs; `confirm` and `loading` states share visual shell. Add Reduce Motion final-frame behavior. |

## WebAdmin shell and pages

| Route/page | Existing content | Specific UI changes |
|---|---|---|
| `/` login | Brand panel and login form | Align with Mobile brand gradient, filled controls, calm error hierarchy; notification stays behind hook. |
| `/dashboard/layout.tsx` | Fixed sidebar, sticky header, mobile horizontal nav | Deep-green active state, border reduction, soft sidebar separation, sticky translucent header; preserve all hrefs and logout. |
| `/dashboard` | Hero, four stats, revenue and shortcuts | Gradient summary hero; compact metric strip; priority shortcuts; money hierarchy. |
| `/dashboard/rooms` | Search, create/edit dialog, room cards | Occupancy summary; toolbar; grouped room grid; filled dialog fields; replace native alert/confirm with hook. |
| `/dashboard/tenants` | Search, create/edit dialog, tenant table | Tenant summary; compact data table; sticky header at scroll container; replace native alert/confirm with hook. |
| `/dashboard/contracts` | Search, create/edit dialog, table, approve/delete | Pipeline summary; status filter/toolbar; readable table; consequences use SweetAlert2 confirm/loading/success. |
| `/dashboard/contracts/new` | Four-step wizard and draft restore | Keep steps and draft state; add progress surface, grouped fields and sticky actions; reduce decorative borders. |
| `/dashboard/invoices` | Search, bulk creation dialog, invoice table | Collection summary; amount emphasis; meter table inside sheet; mark-paid/delete through SweetAlert2. |
| `/dashboard/payments` | Search and transaction table | Reconciliation summary; compact status table; money and transaction code hierarchy. |
| `/dashboard/debts` | Debt total, search and debt table | Danger-tinted summary without red gradient; group overdue rows by room; reminder feedback through SweetAlert2 toast. |
| `/dashboard/utilities` | Search, bulk meter entry table | Meter-period summary; editable columns use tint/focus state; sticky save action. |
| `/dashboard/services` | Search, service table and CRUD dialog | Compact service catalogue; semantic calculation badges; shared filled dialog fields; delete confirm through SweetAlert2. |
| `/dashboard/repairs` | Search, request table, status actions | Workload summary; priority/status columns; actions remain contextual; native alert removed. |
| `/dashboard/settings` | Links to account/banking/billing | One grouped settings surface with clear descriptions; no identical floating cards. |
| `/dashboard/settings/account` | Owner fields and password | Filled form controls; section grouping; local save loading. |
| `/dashboard/settings/banking` | Bank fields | Banking tint section and preview/help copy; no flow change. |
| `/dashboard/settings/billing` | Grace days, late fee and preview | Policy summary, two numeric fields and live preview tint; preserve existing calculation. |

## Shared Web components and notifications

| Component | UI change |
|---|---|
| `globals.css` | Replace orange/gray legacy tokens with semantic deep-green/mint/ink tokens; define radii, shadows, focus and reduced-motion; keep dark-mode parity. |
| `button.tsx`, `input.tsx`, `select.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `dialog.tsx` | Normalize 16 px controls, 20-22 px surfaces, pill badges, filled fields and semantic focus/error states. Avoid new wrapper abstractions beyond these existing primitives. |
| `app-loading.tsx` | Match Mobile brand loading and reduced-motion behavior. |
| `notification-provider.tsx` | Replace Sonner/custom confirm with official SweetAlert2 mixin behind the same hook contract; include toast, confirm and loading. |
| Remaining browser `alert()`/`confirm()` | Replace only presentation call with `useNotification()`; retain the exact request and mutation handler. |

## Explicit non-goals

- No backend, service, API, model, route or payload edits.
- No IA, tab label, form order or workflow changes.
- No new charts, analytics or data.
- No image-generation assets; TroHub is a data/task product and decorative imagery would not add information.
- No custom notification API per screen.
