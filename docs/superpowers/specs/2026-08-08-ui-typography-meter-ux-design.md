# TroHub UI Typography, Theme, and Meter UX Design

**Date:** 2026-08-08
**Status:** Awaiting written-spec review
**Register:** Product
**Surfaces:** Next.js WebAdmin and Expo Mobile App
**Roles:** Owner/Admin and Tenant

## 1. Objective

Upgrade TroHub's presentation layer into a consistent, premium product UI without changing existing business flows. The work standardizes typography, dual-theme colors, responsive layout, touch targets, display formatting, loading states, empty states, and utility-meter presentation across WebAdmin and Mobile.

The approved visual direction is **Dual-theme Calm Ops**:

- Dark Emerald is the primary brand expression.
- Light Atelier is the high-readability light mode.
- Both themes keep identical component structure and interaction behavior.
- Existing real-time `light`, `dark`, and `system` theme modes remain intact.

## 2. Non-goals and Safety Boundary

This project does not change:

- API contracts or endpoints.
- Backend calculation rules.
- Authentication, authorization, or role permissions.
- Navigation structure or task order.
- Invoice, contract, checkout, or payment business rules.
- Database schemas.
- Existing light/dark/system switching logic.

Presentation adapters may calculate a live preview from existing values, but the backend remains the authority for persisted invoice totals.

## 3. Typography System

Use **Inter** as the only product font on both platforms. Product labels, headings, tables, buttons, and body text use one family to avoid visual noise and cross-platform metric drift.

Required weights:

- Regular 400: body, secondary values, descriptions.
- Medium 500: controls, table cells, compact labels.
- SemiBold 600: section titles and emphasized labels.
- Bold 700: page titles, primary values, primary actions.

Implementation requirements:

- Self-host or bundle the Google Fonts Inter assets so rendering does not depend on runtime network access.
- WebAdmin defines font faces and the primary font stack in `webadmin/src/app/globals.css`.
- Mobile stores font assets under `assets/fonts` and loads all four weights in `app/_layout.tsx` before hiding the splash screen.
- Shared Mobile typography must map numeric `fontWeight` usage to the corresponding loaded Inter family so iOS and Android do not fall back to their system font.
- Product UI uses a fixed type scale; no fluid display typography.
- Body text meets WCAG AA contrast and prose is capped near 65–75 characters per line where applicable.

## 4. Dual-theme Palette

### Dark Emerald

- Background: `#04100e`.
- Brand/active surface: `#073e36`.
- Primary text: a near-white green-tinted ink with WCAG AA contrast.
- Accent/focus: `#b8f5da`.
- Translucent separator: `rgba(255,255,255,0.08)`.

### Light Atelier

- Background: `#f4f8f5`.
- Primary ink: `#1a202c`.
- Primary accent/action: `#0f5247`.
- Surface: neutral white or a minimally tinted near-white.
- Borders use a restrained green-neutral ramp with WCAG AA text contrast.

Translucent borders and blur are reserved for navigation and overlays. Data cards and tables use clear surfaces; glassmorphism is not the default card treatment.

### Existing theme behavior

The current behavior is preserved:

- The toggle cycles `light → dark → system`.
- `system` resolves to dark from 18:00 through 05:59 or when the operating system prefers dark mode.
- Theme state is checked every minute.
- WebAdmin keeps cross-tab storage synchronization.
- Mobile persists the choice in AsyncStorage.

Only theme tokens and component styling change. `ThemeProvider`, `toggleTheme`, and the functional switching flow are not redesigned.

## 5. Layout, Spacing, and Interaction

- Use a 4px spacing grid with intentional vertical rhythm.
- Primary buttons, important icon buttons, and form controls have a minimum 48px touch target.
- Standard card radius is 12–16px; pills are reserved for tags and compact statuses.
- Web data tables live in an intentional horizontal-scroll workbench on narrow screens.
- The primary identifying column may remain sticky when this materially improves row tracking.
- Toolbars and action groups wrap without compressing labels or overflowing their container.
- Mobile lists and cards respect safe areas and the available viewport width.
- Motion communicates state in 150–250ms and respects reduced-motion preferences.
- Loading disables only the affected control or content region unless the entire application is genuinely initializing.

## 6. Display Formatting

Display formatting is applied at render boundaries. Raw values sent to APIs remain numeric or unformatted as required by the existing service layer.

Required outputs:

- Currency: `8.900.000đ`.
- Phone: `0901.234.567`.
- CCCD: `0123.4567.8901`.

All rent, deposit, electricity, water, service, payment, and debt amounts must use the canonical currency formatter. Raw numeric output is not allowed in user-facing UI.

## 7. Meter Reading UX

### Root cause in the current presentation

The shared `formatNumberInput` strips every non-digit character. A reading such as `12.563,2` therefore loses decimal semantics. Existing invoice details also show compact arrows such as `1250 → 1320` without enough real-world context.

The backend already stores meter values as numbers and calculates:

`usage = newIndex - oldIndex`

`amount = roundVnd(usage × unitPrice)`

The backend formula remains unchanged.

### Approved combined design

Use **Option C as the responsive system, Option A for detailed cards, and Option B only inside the existing OCR/camera confirmation experience**.

#### WebAdmin: ledger presentation

Bulk invoice and meter-entry workbenches show:

- Room and tenant identity.
- Previous reading.
- Current reading input.
- Consumption with unit.
- Unit price.
- Calculated amount.
- Inline missing/invalid state.

The layout optimizes scanning across many rooms and retains horizontal scrolling at narrow widths.

#### Mobile and invoice details: calculation cards

Electricity and water each show:

- `Chỉ số kỳ trước` as read-only.
- `Chỉ số kỳ này` as the active value.
- Correct unit: `kWh` or `m³`.
- `Tiêu thụ kỳ này`.
- Unit price.
- Calculation explanation.
- Formatted amount.

Example:

`12.458,6 → 12.563,2 kWh`

`Tiêu thụ 104,6 kWh × 3.500đ/kWh = 366.100đ`

#### OCR confirmation: meter-face assistance

The existing camera/OCR path may show a compact meter-face preview to distinguish normal and red decimal digits. It is an assistance and confirmation surface, not a new navigation flow.

If OCR does not provide decimal-position metadata, the user can correct the decimal separator before confirmation. The application must never silently invent decimal placement.

### Meter-specific formatter

Add a meter-only formatter/parser instead of changing the generic currency/number formatter.

Requirements:

- Accept Vietnamese decimal comma and normalized decimal point input.
- Preserve fractional readings supported by the existing numeric backend.
- Format thousands with `.` and decimals with `,`.
- Keep meter units outside the editable numeric value.
- Reject a new reading smaller than the previous reading with an inline business-language message.
- Do not silently clamp invalid readings to zero.

## 8. Empty and Loading States

Rooms, Contracts, Invoices, and Notifications receive shared empty-state and skeleton patterns on both platforms.

An empty state contains:

- A restrained icon or existing TroHub asset.
- A specific title explaining what is empty.
- One short instructional sentence.
- A role-valid action.

Owner/Admin may see `+ Tạo ngay` when the role already has create permission. Tenant empty states use valid actions such as refresh, return, view related information, or contact the owner. Empty-state UI must not introduce new permissions.

Skeletons mirror the final content dimensions to reduce layout shift. Web states use appropriate `aria-busy`, status, or live-region semantics. Decorative loading motion is removed under reduced-motion preferences.

## 9. Component Boundaries

Keep platform-native implementations while sharing naming and behavior:

- Theme tokens: Web CSS variables and Mobile `TROHUB_THEMES`.
- Typography tokens: Web font utilities and Mobile font-family mappings.
- Formatting helpers: equivalent canonical helpers on Web and Mobile.
- Meter presentation model: previous, current, usage, unit price, unit, and amount.
- Web meter ledger row/workbench.
- Mobile meter calculation card.
- OCR meter-face confirmation preview.
- Shared button, skeleton, and illustrated empty-state vocabulary.

No cross-platform UI framework is introduced.

## 10. Data Flow and Error Handling

1. Existing services return raw numeric meter and monetary values.
2. Presentation adapters format values for the current locale.
3. Meter fields parse a decimal-aware user entry into a number.
4. Existing client previews may show usage and amount for immediate feedback.
5. Existing API endpoints receive numeric values.
6. Backend validation and calculation remain authoritative.

Errors are inline and actionable:

- Missing current reading: identify the exact room and utility.
- New reading below previous reading: explain the comparison.
- Invalid decimal input: explain the accepted format.
- OCR uncertainty: require confirmation rather than auto-submitting.
- Loading and submission errors remain scoped to the affected region.

## 11. Verification Strategy

Follow red-green-refactor for behavior changes:

- Add failing formatter regression tests before changing formatting helpers.
- Verify exact currency, phone, CCCD, and meter-reading outputs.
- Verify decimal parsing and regression validation.
- Verify role-aware empty-state actions.

Run fresh verification before completion:

- Root Mobile project: `npm run lint`.
- Root Mobile project: TypeScript no-emit validation.
- WebAdmin: `npm run lint`.
- WebAdmin: `npm run build`.
- Verify Light, Dark, and System modes switch immediately on both platforms.
- Verify the automatic time/system resolution still updates.
- Inspect key Owner/Admin and Tenant screens at mobile, tablet, and desktop widths.
- Verify primary touch targets are at least 48px.
- Verify empty and skeleton states for Rooms, Contracts, Invoices, and Notifications.

The WebAdmin uses Next.js 16.2.9. Relevant local documentation under `webadmin/node_modules/next/dist/docs/` must be read before editing Next.js-specific files.

## 12. Before/After Mockup Deliverable

Before implementation, capture representative baseline states where the applications can run locally. After implementation, create a visual-companion page comparing actual old and new states.

The comparison annotates:

- Inter typography and hierarchy.
- Dark Emerald and Light Atelier tokens.
- Real-time theme consistency.
- Spacing and 48px touch targets.
- Responsive tables and cards.
- Currency, phone, and CCCD formatting.
- Meter ledger, calculation cards, and OCR confirmation.
- Empty states and skeleton loading.

The mockup must describe only implemented improvements. Conceptual elements are clearly labeled and are not presented as shipped UI.

## 13. Acceptance Criteria

- WebAdmin and Mobile use Inter 400/500/600/700 without default OS font rendering in product text.
- Existing Light/Dark/System behavior remains operational.
- Required dual-theme palette is consistently applied.
- Primary actions meet the 48px minimum.
- Target tables and cards do not clip or compress content at supported widths.
- Currency, phone, and CCCD displays use canonical formatters.
- Meter readings preserve decimals and show previous, current, usage, unit price, unit, and amount where relevant.
- Owner/Admin and Tenant receive permission-appropriate empty states.
- Target lists use skeleton loading.
- WebAdmin build and platform verification commands complete successfully, or remaining environmental blockers are reported with evidence.
- A final before/after visual comparison is delivered to the Owner.
