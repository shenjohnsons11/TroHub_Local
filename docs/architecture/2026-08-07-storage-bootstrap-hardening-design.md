# Storage and Bootstrap Hardening Design

## Goal

Prevent malformed persisted values such as `"undefined"` from crashing WebAdmin or Mobile initialization, and ensure bootstrap promises settle safely.

## Scope

- Harden all persisted JSON reads in WebAdmin and Mobile.
- Preserve plain-string storage values such as JWT tokens, themes, and languages.
- Keep login and other user-triggered API failures visible to their existing UI error handlers.
- Make startup-only asynchronous work fall back safely instead of producing an unhandled rejection.

## Decision

Use a small `safeJsonParse` helper in each application boundary, plus a safe plain-string storage reader in WebAdmin. Do not install a global `unhandledrejection` handler: it would hide programming errors rather than fix their source.

## Data Flow

1. WebAdmin JSON storage readers (`trohub_user`, contract drafts, mock admins, pending AI action) call `safeJsonParse(value, fallback)`.
2. WebAdmin plain-string readers (`trohub_token`, `trohub_theme`, `trohub_language`) reject `null`, `"null"`, and `"undefined"` without calling `JSON.parse`.
3. Mobile AsyncStorage JSON readers (auth user, saved profile, contract drafts, and widget snapshots) call the Mobile helper with a typed fallback.
4. The Dashboard bootstrap redirects to login when no valid stored user exists; its profile refresh is caught and preserves the valid local fallback.
5. Mobile startup resets to logged-out/default state if auth hydration fails, catches the initial deep-link promise, and makes the Android widget task return safely when storage is malformed.
6. WebAdmin `fetchAPI` converts malformed JSON API responses into a normal, actionable API error that existing callers can catch.

## Verification

- Test `safeJsonParse` with null, `"undefined"`, `"null"`, malformed JSON, and valid JSON.
- Test the WebAdmin plain-string reader with a JWT-like token and invalid sentinel values.
- Test Mobile parser fallbacks without requiring device storage.
- Run `npx tsc --noEmit` and `cd webadmin && npm run build`.

## Non-goals

- Do not suppress errors globally.
- Do not alter API error behavior for user-initiated login, registration, or form submissions.
