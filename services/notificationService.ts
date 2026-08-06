import { apiClient } from "./apiClient";
import { authService } from "./authService";
import { AppNotification } from "../types/Notification";

type NotificationResponse = { success: boolean; data: AppNotification[] };

async function token() {
  return authService.getToken();
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const response = await apiClient.get<NotificationResponse>("/notifications", await token());
    return response.data || [];
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
