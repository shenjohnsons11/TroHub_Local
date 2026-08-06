export type AIAction =
  | { type: "FILL_CONTRACT_FORM"; roomCode: string; tenantName: string; rentPrice: number; startDate: string }
  | { type: "FILL_UTILITY_READING"; roomCode: string; newElec: number; newWater: number };

const PENDING_ACTION_KEY = "trohub-ai-action";

export function isAIAction(value: unknown): value is AIAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (action.type === "FILL_CONTRACT_FORM") return typeof action.roomCode === "string" && typeof action.tenantName === "string" && typeof action.rentPrice === "number" && /^\d{4}-\d{2}-\d{2}$/.test(String(action.startDate));
  return action.type === "FILL_UTILITY_READING" && typeof action.roomCode === "string" && typeof action.newElec === "number" && typeof action.newWater === "number";
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
    const action = JSON.parse(sessionStorage.getItem(PENDING_ACTION_KEY) || "null");
    if (!isAIAction(action) || action.type !== type) return null;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return action as Extract<AIAction, { type: T }>;
  } catch {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return null;
  }
}
