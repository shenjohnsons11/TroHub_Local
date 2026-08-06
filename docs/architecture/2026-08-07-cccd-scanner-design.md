# CCCD Scanner Design

## Goal

Make the shared mobile CCCD scanner show a clear camera viewfinder and fill only a valid twelve-digit CCCD number into the invoking form.

## Scope

- Show the camera behind a 260 by 260 pixel central viewfinder.
- Dim only the area around the viewfinder and render four emerald `#b8f5da` corner marks.
- Provide a top-right `X Đóng` control and the approved scanning instruction below the frame.
- Extract the number directly from barcode data:

```ts
const rawText = event.data;
const parts = rawText.split('|');
const cccdNumber = (parts[0] || rawText).replace(/\D/g, '').slice(0, 12);
```

- Accept a scan only when `cccdNumber.length === 12`, provide success haptic feedback, then close the modal.
- Fill only the CCCD input. Do not read, write, or overwrite a name, phone, email, or other form value.

## Implementation

`components/CCCDScannerModal.tsx` remains the single camera component. Its callback changes from a parsed identity object to a `string` CCCD value. `LoginScreen`, `AdminTenantsScreen`, and `AddTenantModal` update only their CCCD state from that callback.

The modal uses a ref to ignore duplicate barcode events while it is closing. Camera permission behavior, QR-only scanner settings, and the separate full-screen scanner remain unchanged.

## Verification

- Typecheck the mobile application.
- Confirm all callback call sites accept the new string contract.
- On a device, open Registration or Add Tenant, tap Quét CCCD, inspect the viewfinder, then scan a CCCD QR code and confirm exactly twelve digits appear in the CCCD field while the remaining inputs are unchanged.
