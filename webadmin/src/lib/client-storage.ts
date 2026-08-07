export type WebAdminUser = {
  id?: string;
  _id?: string;
  role: number;
  fullName?: string;
  propertyAddress?: string;
  [key: string]: unknown;
};

export type WebAdminSession = {
  token: string;
  user: WebAdminUser;
};

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value || value === "undefined" || value === "null") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeStorageString(value: string | null | undefined): string | null {
  if (!value || value === "undefined" || value === "null") return null;
  const normalized = value.trim();
  return normalized || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWebAdminUser(value: unknown): value is WebAdminUser {
  if (!isRecord(value) || typeof value.role !== "number") return false;
  return typeof value.id === "string" || typeof value._id === "string";
}

export function normalizeWebAdminSession(response: unknown): WebAdminSession | null {
  if (!isRecord(response)) return null;
  const payload = isRecord(response.data) ? response.data : response;
  const token = safeStorageString(typeof payload.token === "string" ? payload.token : null);
  if (!token || !isWebAdminUser(payload.user)) return null;
  return { token, user: payload.user };
}
