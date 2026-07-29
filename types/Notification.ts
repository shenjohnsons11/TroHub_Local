export interface AppNotification {
  id: string;
  type: "invoice" | "contract" | "repair" | "tenant" | "utility" | "system";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}
