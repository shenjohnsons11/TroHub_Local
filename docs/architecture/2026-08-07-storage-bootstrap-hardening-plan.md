# Storage Bootstrap Hardening Implementation Plan

**Goal:** Keep WebAdmin authenticated after a valid landlord login, safely read persisted browser data, and suppress only known extension-originated unhandled rejections.

**Architecture:** Browser storage helpers own malformed-value fallback and login payload normalization. The Dashboard owns logout decisions after a confirmed 401. A root-mounted Client Component registers a narrow extension-noise listener because the Next root layout remains a Server Component.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node runtime assertions.

---

### Task 1: Lock expected storage and extension behavior

**Files:**
- Modify: no persisted test files; the repository ignores test artifacts by policy.

- [ ] **Step 1: Run a failing one-off assertion before implementation**

```ts
node --no-warnings --experimental-strip-types --input-type=module -e 'import { safeJsonParse } from "./src/lib/client-storage.ts"; console.log(safeJsonParse("undefined", {}));'
```

- [ ] **Step 2: Verify the assertion fails**

Expected: FAIL because `client-storage` does not yet exist.

### Task 2: Add narrow browser helpers

**Files:**
- Create: `webadmin/src/lib/client-storage.ts`
- Create: `webadmin/src/lib/extension-noise.ts`

- [ ] **Step 1: Implement typed safe fallbacks**

```ts
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value || value === "undefined" || value === "null") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function safeStorageString(value: string | null | undefined): string | null {
  return !value || value === "undefined" || value === "null" ? null : value;
}
```

`normalizeWebAdminSession` must accept a top-level response or its `data` property, and return `null` unless token is a non-empty string and user is an object with a string id and numeric role.

- [ ] **Step 2: Implement the extension classifier**

```ts
const extensionMarkers = ["chrome-extension://", "gads-scrapper", "onboarding.js"];
export function isExtensionNoise(reason: unknown): boolean {
  const value = reason instanceof Error ? `${reason.message}\n${reason.stack || ""}` : `${(reason as { stack?: unknown })?.stack || ""}\n${String(reason || "")}`;
  return extensionMarkers.some((marker) => value.toLowerCase().includes(marker));
}
```

- [ ] **Step 3: Run the one-off assertions**

Run: assertions for invalid JSON, a valid wrapped login response, a missing token, extension noise, and a TroHub error.

Expected: PASS.

### Task 3: Repair the landlord login and dashboard bootstrap

**Files:**
- Modify: `webadmin/src/app/page.tsx`
- Modify: `webadmin/src/app/dashboard/layout.tsx`
- Modify: `webadmin/src/lib/api.ts`

- [ ] **Step 1: Persist only a valid login session**

`page.tsx` uses `normalizeWebAdminSession`. It reports an existing login error and does not navigate when token/user is invalid. For a valid landlord, it writes the synchronous `localStorage` values and calls `router.replace("/dashboard")`.

- [ ] **Step 2: Make Dashboard own confirmed-session redirects**

`dashboard/layout.tsx` reads the token with `safeStorageString` and user with `safeJsonParse`. Missing/invalid values redirect once. `role !== 1` shows `"Tài khoản không có quyền truy cập WebAdmin"` before redirect. `/auth/me` errors retain the local landlord state except a caught error with `status === 401`, which clears storage and redirects.

- [ ] **Step 3: Keep API requests authenticated without global redirects**

`api.ts` uses `safeStorageString(localStorage.getItem("trohub_token"))`, preserves the `Authorization` header for a valid token, and throws typed API errors instead of clearing storage or assigning `window.location`.

### Task 4: Apply WebAdmin storage helpers and mount the extension filter

**Files:**
- Create: `webadmin/src/components/extension-noise-filter.tsx`
- Modify: `webadmin/src/app/layout.tsx`
- Modify: `webadmin/src/lib/ai-actions.ts`
- Modify: `webadmin/src/components/theme-provider.tsx`
- Modify: `webadmin/src/components/language-provider.tsx`
- Modify: `webadmin/src/app/page.tsx`
- Modify: `webadmin/src/app/dashboard/rooms/page.tsx`
- Modify: `webadmin/src/app/dashboard/contracts/page.tsx`
- Modify: `webadmin/src/app/dashboard/contracts/new/page.tsx`

- [ ] **Step 1: Replace every WebAdmin persisted JSON parse**

Use `safeJsonParse` for stored users, contract drafts, and pending AI actions. Remove the client-only mock-login shortcut because its token cannot be verified by the backend. Use `safeStorageString` for token, theme, and language values. Preserve existing type checks such as `Array.isArray` and `isAIAction`.

- [ ] **Step 2: Mount the narrow Client Component from the Server layout**

```tsx
"use client";
import { useEffect } from "react";
import { isExtensionNoise } from "@/lib/extension-noise";

export function ExtensionNoiseFilter() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExtensionNoise(event.reason)) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);
  return null;
}
```

Render `<ExtensionNoiseFilter />` in `app/layout.tsx` inside `<body>`.

- [ ] **Step 3: Run the assertions and production build**

Run: the one-off assertions, then `npm run build`

Expected: assertions and Next production build pass.

### Task 5: Verify the exact regression path

**Files:**
- Modify: no files

- [ ] **Step 1: Review static contracts**

Run: `rg -n 'JSON\.parse|localStorage\.getItem|sessionStorage\.getItem' src`

Expected: no direct persisted JSON parse remains; raw token/theme/language reads flow through the helpers.

- [ ] **Step 2: Run browser verification**

Run: `npm run dev`

Expected: after clearing storage, a valid landlord login stores a non-empty JWT and role-1 user before dashboard navigation; no redirect follows when `/auth/me` succeeds. Extension marker rejections are prevented, while a TroHub rejection remains visible.
