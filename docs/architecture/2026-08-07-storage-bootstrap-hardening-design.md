# Storage and Bootstrap Hardening Design

## Goal

Prevent malformed persisted values such as `"undefined"` from crashing WebAdmin or Mobile initialization, and prevent WebAdmin from immediately redirecting a landlord back to login after a successful sign-in.

## Scope

- Harden all persisted JSON reads in WebAdmin and Mobile.
- Normalize both top-level and `data`-wrapped WebAdmin login payloads before persisting a JWT and user.
- Preserve plain-string storage values such as JWT tokens, themes, and languages.
- Keep login and other user-triggered API failures visible to their existing UI error handlers.
- Make startup-only asynchronous work fall back safely instead of producing an unhandled rejection.

## Decision

Use a small `safeJsonParse` helper in each application boundary, plus a safe plain-string storage reader in WebAdmin. Login rejects incomplete responses before writing storage. `fetchAPI` attaches a valid stored token but does not globally clear storage or redirect on every 401; the Dashboard owns its authenticated-session decision. Do not install a global `unhandledrejection` handler: it would hide programming errors rather than fix their source.

## Data Flow

1. WebAdmin login normalizes `response.data ?? response`, then requires a non-empty token and an object user before writing `trohub_token` and `trohub_user`. Storage is synchronous; navigation follows only after those writes complete.
2. WebAdmin JSON storage readers (`trohub_user`, contract drafts, mock admins, pending AI action) call `safeJsonParse(value, fallback)`.
3. WebAdmin plain-string readers (`trohub_token`, `trohub_theme`, `trohub_language`) reject `null`, `"null"`, and `"undefined"` without calling `JSON.parse`.
4. The Dashboard validates the persisted landlord role before rendering. It shows the required access notification before redirecting a non-landlord, retains an authenticated view on a temporary `/auth/me` network failure, and clears credentials only after `/auth/me` explicitly returns 401.
5. Mobile AsyncStorage JSON readers (auth user, saved profile, contract drafts, and widget snapshots) call the Mobile helper with a typed fallback.
6. Mobile startup resets to logged-out/default state if auth hydration fails, catches the initial deep-link promise, and makes the Android widget task return safely when storage is malformed.
7. WebAdmin `fetchAPI` sends `Authorization: Bearer <token>` only for a valid token and converts malformed JSON API responses into a normal, actionable API error that existing callers can catch.

## Verification

- Test `safeJsonParse` with null, `"undefined"`, `"null"`, malformed JSON, and valid JSON.
- Test the WebAdmin plain-string reader with a JWT-like token and invalid sentinel values.
- Test login payload normalization for top-level and `data`-wrapped responses, including rejection of a missing token/user.
- Test Mobile parser fallbacks without requiring device storage.
- Run `npx tsc --noEmit` and `cd webadmin && npm run build`.

## Non-goals

- Do not suppress errors globally.
- Do not alter API error behavior for user-initiated login, registration, or form submissions.
