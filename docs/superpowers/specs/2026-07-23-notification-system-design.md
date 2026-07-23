# TroHub Notification System Design

## Scope

Build platform-specific notification providers for Expo and Next.js with one semantic API:

- `success(message, options?)`
- `error(message, options?)`
- `warning(message, options?)`
- `info(message, options?)`
- `confirm(options): Promise<boolean>`

## Expo

- Keep `react-native-toast-message` as the rendering engine.
- Render a custom toast surface with a restrained status accent, icon, title, message, and close affordance.
- Mount the provider once in `app/_layout.tsx`.
- Keep callbacks stable with `useCallback` and the context value stable with `useMemo`.
- Store the pending confirmation resolver in a ref so it never becomes render state.
- Use a native `Modal` for confirmations and preserve keyboard/accessibility behavior.

## Next.js

- Keep Sonner as the rendering engine.
- Mount a client Notification Provider once in the root layout.
- Apply status-specific Sonner styling through global design tokens.
- Implement a custom promise-based confirmation dialog inside the Provider.
- Keep the context API identical to Expo.

## Integrations

- Expo: login, bulk invoice creation, utility readings, and Repair Request flows.
- Next.js: login, invoice creation/payment, utility drafts, and Service CRUD.
- Translate stable backend codes such as `METER_INDEX_REGRESSION` into concise Vietnamese user messages.
- Preserve backend messages as fallback details without exposing stack traces.

## Business Invariants

- Product language exclusively uses “Người thuê”, `nguoiThue`, or `NGUOI_THUE`.
- Repair Request remains directly owned through `tenantId` referencing Người thuê.
- No notification derives Repair Request ownership from a room.

## Interaction

- Radius: 12px.
- Motion: 180–240ms ease-out.
- Success/info duration: 3.5 seconds.
- Warning duration: 4.5 seconds.
- Error duration: 5.5 seconds.
- Status color is limited to icon, thin border, and a subtle tinted surface.
- Confirmations are reserved for destructive or irreversible actions.
