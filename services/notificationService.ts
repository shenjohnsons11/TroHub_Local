import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNotification } from "../types/Notification";

const STORAGE_KEY = "@trohub_notifications";

export const notificationService = {
  getNotifications: async (): Promise<AppNotification[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as AppNotification[];
      }
      return [];
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
      return [];
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const notifs = await notificationService.getNotifications();
      return notifs.filter(n => !n.isRead).length;
    } catch (error) {
      return 0;
    }
  },

  addNotification: async (type: AppNotification["type"], title: string, content: string): Promise<AppNotification | null> => {
    try {
      const notifs = await notificationService.getNotifications();
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(2, 11),
        type,
        title,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [newNotif, ...notifs];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newNotif;
    } catch (error) {
      console.error("Lỗi thêm thông báo:", error);
      return null;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      const notifs = await notificationService.getNotifications();
      const updated = notifs.map(n => n.id === id ? { ...n, isRead: true } : n);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      const notifs = await notificationService.getNotifications();
      const updated = notifs.map(n => ({ ...n, isRead: true }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc tất cả:", error);
    }
  }
};
