# TroHub AI Role RBAC Design

## Goal

Prevent a tenant from receiving landlord-only AI guidance, data, or auto-fill actions while preserving the landlord AI workflow.

## Scope

- `role === 1` (Chủ trọ) receives landlord statistics, debt details, and supported auto-fill actions.
- `role === 2` (Người thuê) receives only their active-room and own-invoice context.
- A tenant request for a landlord-only task is denied before any database context or Gemini request is made.

## Decision

Use a deterministic backend guard plus separate role-specific system instructions. Prompt-only protection is not sufficient because it depends on model compliance.

## Request Flow

1. `POST /api/ai/chat` authenticates the JWT and provides the trusted `req.auth.role`.
2. `askTroHubAI` validates the message.
3. For a tenant, a Vietnamese intent matcher detects landlord-only tasks: creating or administering contracts, revenue/debt statistics, utility finalization, room/tenant administration, and landlord payment reminders.
4. A matched request returns exactly:

   `🔒 Xin lỗi, tài khoản của bạn thuộc vai trò Người thuê nên không có quyền truy cập hoặc hướng dẫn các thao tác quản trị của Chủ trọ.`

   The response action is always `null`; Gemini and MongoDB context retrieval are skipped.
5. Otherwise, context is fetched for that role and the corresponding role-specific system instruction is sent to Gemini.
6. Only a landlord response may retain `FILL_CONTRACT_FORM` or `FILL_UTILITY_READING`; tenant responses always have `action: null`.

## Security Properties

- Role comes from verified server-side JWT, never from request body.
- The preflight guard is enforced in service code, not delegated to the model.
- Tenant context queries contracts by `tenantId: userId`; invoice queries are limited to those contracts.
- The public response shape remains `{ reply, action }`.

## Verification

An isolated Node assertion will first prove the guard is missing, then confirm that a tenant request, `Hướng dẫn tôi tạo hợp đồng mới`, returns the exact denial text and `action: null` without requiring Gemini or MongoDB.
