export interface AppNotification {
  id: string;
  type: "invoice" | "contract" | "repair" | "tenant" | "utility" | "system";
  title: string;
  content: string;
  category?: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
