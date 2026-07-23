# TroHub Auth and Typography Design

## Scope

This phase changes the Expo application, the Next.js Admin application, and the shared backend authentication API. The legacy `webadmin` application receives no UI redesign or new feature work.

## Authentication

- Remove every public sign-up control and sign-up form from Expo and `webadmin-next`.
- Replace email-first naming with a single `identifier` concept labeled “Số điện thoại hoặc tên đăng nhập”.
- Preserve email lookup in the backend so existing accounts using an email-shaped username can still sign in.
- Normalize phone identifiers by removing spaces, dots, and hyphens before lookup.
- Disable `POST /api/auth/register` for public callers with HTTP 403 and a message directing account provisioning to Admin.
- Preserve Admin-managed Người thuê creation through the existing protected tenant-management workflow.
- Keep response tokens, stored-session keys, roles, and password-change behavior compatible with existing clients.

## Typography

- Use a Vietnamese-safe sans-serif system stack on Expo through shared font-family tokens.
- Use `next/font` in the Next.js root layout and expose its CSS variable to Tailwind.
- Keep explicit platform fallbacks so content remains readable when a preferred face is unavailable.
- Apply font tokens at root level and remove the global Arial override.
- Preserve accessible type sizes, line heights, input heights, focus states, dark mode, and reduced-motion behavior.

## UI Direction

Reading this as a property-management product used frequently on phones and desktop admin screens. The visual language is clean, operational, calm, and high-trust: restrained orange accent, neutral surfaces, strong labels, one consistent soft radius scale, and clear status feedback.

The Expo login becomes a focused single-purpose screen with a compact trust message and no account-creation diversion. The Next.js login keeps its split desktop composition but simplifies the form hierarchy and clearly communicates that accounts are issued by the property manager.

## Business Invariants

- Product language exclusively uses “Người thuê”, `nguoiThue`, or `NGUOI_THUE`.
- `RepairRequest.tenantId` remains required and directly references `Account`.
- No Repair Request ownership field is redirected to `Room`.
- No Zalo Mini App or chat work is included.

## Verification

- Backend unit tests prove public registration is disabled, phone normalization works, username login works, and legacy email login remains compatible.
- Static UI contract tests prove Expo and Next.js expose no registration UI, show the new identifier label, and use the intended font integration.
- Run backend tests, root UI contract tests, Expo lint/type checks, Next.js lint, and Next.js production build.
- Render the Expo web login and Next.js login for visual inspection when the local runtimes are available.
