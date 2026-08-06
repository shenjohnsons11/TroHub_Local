import { apiClient } from "./apiClient";
import { authService } from "./authService";

export type InboxNotification = {
  _id: string;
  type: "CONTRACT_SENT" | "INVOICE_DUE_SOON" | "INVOICE_DUE_TODAY" | "INVOICE_OVERDUE" | "INVOICE_MANUAL_REMINDER";
  title: string;
  message: string;
  entityType: "CONTRACT" | "INVOICE";
  entityId: string;
  deepLink: string;
  isRead: boolean;
  createdAt: string;
};

async function token() {
  const value = await authService.getToken();
  if (!value) throw new Error("Người thuê cần đăng nhập để xem thông báo.");
  return value;
}

export const notificationApi = {
  async list() {
    const response = await apiClient.get<{ success: boolean; data: InboxNotification[] }>("/notifications", await token());
    return response.data;
  },
  async unreadCount() {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>("/notifications/unread-count", await token());
    return response.data.count;
  },
  async markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`, undefined, await token());
  },
  async markAllRead() {
    await apiClient.patch("/notifications/read-all", undefined, await token());
  },
  async registerDevice(input: { expoPushToken: string; platform: "android" | "ios"; deviceId: string }) {
    await apiClient.post("/notifications/devices", input, await token());
  },
};
