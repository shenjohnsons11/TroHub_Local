# CCCD Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a usable CCCD QR camera viewfinder and fill only a valid twelve-digit CCCD number into Registration and Add Tenant forms.

**Architecture:** `CCCDScannerModal` owns camera permission, viewfinder rendering, scan de-duplication, haptic feedback, and number extraction. Its callback returns a CCCD string, so each caller updates only its own CCCD state and leaves every other form field intact.

**Tech Stack:** Expo Camera, Expo Haptics, React Native, TypeScript

---

### Task 1: Make the shared scanner return only a CCCD number

**Files:**
- Modify: `components/CCCDScannerModal.tsx:1-62`

- [ ] **Step 1: Change the scanner callback contract and imports**

```ts
import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (cccdNumber: string) => void;
};
```

Remove the `CCCDQrData` and `parseCCCDQr` import from this modal. Leave `utils/cccdQr.ts` unchanged because it belongs to the separate full-screen scanner.

- [ ] **Step 2: Extract exactly twelve digits and prevent duplicate scans**

```ts
const scanningRef = useRef(false);
const permissionRequestedRef = useRef(false);

useEffect(() => {
  if (!visible) {
    scanningRef.current = false;
    permissionRequestedRef.current = false;
    return;
  }

  if (!permission?.granted && permission?.canAskAgain && !permissionRequestedRef.current) {
    permissionRequestedRef.current = true;
    void requestPermission();
  }
}, [visible, permission?.granted, permission?.canAskAgain, requestPermission]);

const handleBarcodeScanned = ({ data }: { data: string }) => {
  if (scanningRef.current) return;

  const rawText = data;
  const parts = rawText.split("|");
  const cccdNumber = (parts[0] || rawText).replace(/\D/g, "").slice(0, 12);
  if (cccdNumber.length !== 12) return;

  scanningRef.current = true;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  onScan(cccdNumber);
  onClose();
};
```

The effect resets duplicate-scan protection whenever the modal closes and requests permission only once per modal opening.

- [ ] **Step 3: Render the viewfinder overlay**

Use `useWindowDimensions()` to center a `260` pixel square. Render four dark scrim panels around the square, then render a transparent frame with four `#b8f5da` rounded corner marks. Keep the camera visible inside the square. Add the exact instruction below it:

```tsx
<Text style={styles.hint}>
  Hướng mã QR trên thẻ CCCD vào khung ngắm để tự động quét
</Text>
```

Render a 44-pixel minimum tap target in the header:

```tsx
<Pressable accessibilityRole="button" accessibilityLabel="Đóng camera quét CCCD" onPress={onClose} style={styles.close}>
  <Ionicons name="close" size={20} color="#ffffff" />
  <Text style={styles.closeText}>Đóng</Text>
</Pressable>
```

- [ ] **Step 4: Verify the shared component compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: exit `0`.

- [ ] **Step 5: Commit the shared scanner change**

```bash
git add components/CCCDScannerModal.tsx
git commit -m "fix: add CCCD camera viewfinder"
```

### Task 2: Preserve all non-CCCD form state

**Files:**
- Modify: `screens/LoginScreen.tsx:405-409`
- Modify: `screens/AdminTenantsScreen.tsx:298`
- Modify: `components/AddTenantModal.tsx:84`

- [ ] **Step 1: Update the registration callback**

```tsx
onScan={(cccdNumber) => {
  setIdCard(formatCCCD(cccdNumber));
  setIdCardError("");
}}
```

Do not call `setFullName`.

- [ ] **Step 2: Update the Add Tenant callbacks**

Use this callback in both `AdminTenantsScreen` and `AddTenantModal`:

```tsx
onScan={(cccdNumber) => {
  setIdCard(formatCCCD(cccdNumber));
  setLookupIdentifier(cccdNumber);
}}
```

Do not change the name, phone, email, room, or tenant-link state.

- [ ] **Step 3: Verify the new callback contract**

Run:

```bash
rg -n "CCCDScannerModal|onScan" screens/LoginScreen.tsx screens/AdminTenantsScreen.tsx components/AddTenantModal.tsx components/CCCDScannerModal.tsx
npx tsc --noEmit
```

Expected: each caller accepts one `cccdNumber` string and TypeScript exits `0`.

- [ ] **Step 4: Commit form integration**

```bash
git add screens/LoginScreen.tsx screens/AdminTenantsScreen.tsx components/AddTenantModal.tsx
git commit -m "fix: fill only scanned CCCD number"
```

### Task 3: Verify production compatibility and device behavior

**Files:**
- No repository files changed.

- [ ] **Step 1: Run production checks**

```bash
npx tsc --noEmit
npm run lint
cd webadmin && npm run lint
cd webadmin && npm run build
```

Expected: every command exits `0`; existing warnings may remain.

- [ ] **Step 2: Check source-level scan contract**

Run:

```bash
rg -n "const rawText = data|const parts = rawText.split|cccdNumber.length !== 12|NotificationFeedbackType.Success|width: 260|height: 260|Hướng mã QR" components/CCCDScannerModal.tsx
```

Expected: the scanner contains the required extraction, validation, haptic, frame dimensions, and guidance.

- [ ] **Step 3: Verify on an Android or iOS device**

Open Registration or Add Tenant, tap `📷 Quét CCCD`, allow camera access if requested, and confirm the square viewfinder is visible. Scan a CCCD QR code and confirm the modal closes after a haptic success signal, the CCCD input contains exactly twelve digits, and all other form fields retain their prior values.

- [ ] **Step 4: Inspect final repository state**

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace error and no uncommitted implementation file.
