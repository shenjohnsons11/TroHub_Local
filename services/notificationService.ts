import { apiClient } from "./apiClient";
import { authService } from "./authService";
import { AppNotification } from "../types/Notification";

type ApiNotification = Partial<AppNotification> & {
  _id?: string;
  message?: string;
};
type NotificationResponse = { success: boolean; data: ApiNotification[] };

const mapNotification = (item: ApiNotification): AppNotification => ({
  id: String(item._id || item.id || ""),
  type: String(item.category || item.type || "system").toLowerCase() as AppNotification["type"],
  title: item.title || "Thông báo",
  content: item.content || item.message || "",
  category: item.category,
  deepLink: item.deepLink,
  metadata: item.metadata || {},
  isRead: Boolean(item.isRead),
  createdAt: item.createdAt || new Date().toISOString(),
});

async function token() {
  return authService.getToken();
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const response = await apiClient.get<NotificationResponse>("/notifications", await token());
    return (response.data || []).map(mapNotification);
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>("/notifications/unread-count", await token());
    return response.data?.count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`, {}, await token());
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.put("/notifications/read-all", {}, await token());
  },

  async registerDevice(expoPushToken: string, platform: "ios" | "android"): Promise<void> {
    await apiClient.post("/notifications/devices", { expoPushToken, platform }, await token());
  },

  async deactivateDevice(expoPushToken: string): Promise<void> {
    await apiClient.post("/notifications/devices/deactivate", { expoPushToken }, await token());
  },
};
