import { fetchAPI } from "@/lib/api";

export function requestPasswordReset(identifier: string) {
  return fetchAPI("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  }) as Promise<{ success: boolean; message: string }>;
}

export function verifyPasswordReset(identifier: string, otp: string) {
  return fetchAPI("/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify({ identifier, otp }),
  }) as Promise<{ success: boolean; resetToken: string }>;
}

export function completePasswordReset(resetToken: string, newPassword: string) {
  return fetchAPI("/auth/password-reset/complete", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  }) as Promise<{ success: boolean; message: string }>;
}

export function issueTemporaryPassword(accountId: string) {
  return fetchAPI(`/admin/accounts/${accountId}/temporary-password`, {
    method: "POST",
  }) as Promise<{
    success: boolean;
    message: string;
    temporaryPassword: string;
  }>;
}
