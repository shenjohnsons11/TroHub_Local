import { safeJsonParse } from "@/lib/client-storage";

export type AIAction =
  | { type: "NAVIGATE_TAB"; target: string; tab?: string; params?: Record<string, unknown>; label?: string; autoNavigate?: boolean }
  | { type: "FILL_CONTRACT_FORM"; roomCode: string; tenantName?: string; rentPrice?: number; startDate?: string; label?: string; autoNavigate?: boolean }
  | { type: "FILL_UTILITY_READING"; roomCode: string; newElec?: number; newWater?: number; label?: string; autoNavigate?: boolean }
  | { type: "CREATE_INVOICE"; roomCode: string; month?: string; label?: string; autoNavigate?: boolean }
  | { type: "CREATE_REPAIR_REQUEST"; title?: string; label?: string; autoNavigate?: boolean };

const PENDING_ACTION_KEY = "trohub-ai-action";

export function isAIAction(value: unknown): value is AIAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (action.type === "NAVIGATE_TAB") return typeof action.target === "string" || typeof action.tab === "string";
  if (action.type === "FILL_CONTRACT_FORM") return typeof action.roomCode === "string";
  if (action.type === "FILL_UTILITY_READING") return typeof action.roomCode === "string";
  if (action.type === "CREATE_INVOICE") return typeof action.roomCode === "string";
  if (action.type === "CREATE_REPAIR_REQUEST") return true;
  return false;
}

export function dispatchAIAction(action: unknown) {
  if (typeof window === "undefined" || !isAIAction(action)) return false;
  sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
  window.dispatchEvent(new CustomEvent("trohub-ai-action", { detail: action }));
  return true;
}

export function consumePendingAIAction<T extends AIAction["type"]>(type: T): Extract<AIAction, { type: T }> | null {
  if (typeof window === "undefined") return null;
  try {
    const action = safeJsonParse<unknown>(sessionStorage.getItem(PENDING_ACTION_KEY), null);
    if (!isAIAction(action) || action.type !== type) return null;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return action as Extract<AIAction, { type: T }>;
  } catch {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return null;
  }
}
