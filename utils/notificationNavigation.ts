import { AppNotification } from "../types/Notification";

export type NotificationTab = "home" | "invoice" | "repair" | "contract" | "utility" | "profile" | "scan_meter";

export function resolveNotificationTarget(notification: Pick<AppNotification, "type" | "deepLink" | "metadata">): { tab: NotificationTab; params: Record<string, unknown> } {
  const params = notification.metadata || {};
  if (notification.deepLink === "home" || notification.type === "tenant") return { tab: "home", params };
  if (notification.type === "checkout") return { tab: "contract", params: { ...params, action: params.action || "checkout" } };
  if (notification.deepLink === "invoice" || notification.deepLink === "/invoices" || notification.type === "invoice") return { tab: "invoice", params: { ...params, paymentInvoiceId: params.paymentInvoiceId || params.invoiceId } };
  if (notification.deepLink === "scan_meter") return { tab: "scan_meter", params };
  if (notification.deepLink === "utility" || notification.type === "utility") return { tab: "utility", params };
  if (notification.deepLink === "repair" || notification.deepLink === "/repairs" || notification.type === "repair") return { tab: "repair", params };
  if (notification.deepLink === "profile") return { tab: "profile", params };
  return { tab: "contract", params };
}
