# Invoice Calculation and Admin Service Backend Design

## Goal

Provide one authoritative invoice calculator and an Admin-only service-management API without breaking existing Service or Invoice data.

## Invoice Calculation

- A pure calculator validates all monetary values and meter indices.
- Inputs must be finite, numeric, and non-negative.
- A new meter index must never be lower than its old index.
- Meter charges and invoice totals are rounded to whole VND.
- The server calculates every total and ignores totals supplied by clients.
- Draft room indices are suggestions for new indices only.
- Previous finalized invoice indices are the source of old indices.
- Single and bulk invoice creation share the same calculator.

## Service Management

- Existing fields `name`, `type`, `unit`, `defaultPrice`, and `landlordId` remain compatible.
- New `code` and `isActive` fields receive safe defaults for existing records.
- Service ownership always comes from the verified Admin JWT.
- Client-provided `landlordId` is ignored.
- Create and update accept only whitelisted fields.
- Service codes are normalized and unique per Admin.
- Deleting an unused service removes it. Deleting a service referenced by a contract archives it by setting `isActive` to false.

## Security

- Every `/api/services` route requires a valid JWT with role `1`.
- Role `2` receives HTTP 403.
- Missing or invalid tokens receive HTTP 401.
- Detail, update, and delete queries always include the authenticated Admin ID.

## Business Invariants

- Product language exclusively uses “Người thuê”, `nguoiThue`, or `NGUOI_THUE`.
- `RepairRequest.tenantId` remains required and directly references `Account`.
- `RepairRequest` receives no room ownership field.

## Verification

- Pure calculator tests cover valid usage, fractional usage, invalid finite values, regressing indices, rounding, discounts, and client-total resistance.
- Middleware tests cover missing, invalid, Người thuê, and Admin tokens.
- Controller tests cover ownership, validation, create, read, update, archive, and delete behavior.
- Existing Auth and business-invariant tests remain green.
