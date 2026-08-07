import React, { createContext, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { InboxNotification, notificationApi } from "../services/notification-api";

type InboxContextValue = {
  notifications: InboxNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (notification: InboxNotification) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
};

export const InboxNotificationContext = createContext<InboxContextValue | null>(null);

export function InboxNotificationProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [items, count] = await Promise.all([notificationApi.list(), notificationApi.unreadCount()]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notification: InboxNotification) => {
    if (!notification.isRead) await notificationApi.markRead(notification._id);
    setNotifications((items) => items.map((item) => item._id === notification._id
      ? { ...item, isRead: true }
      : item));
    setUnreadCount((count) => notification.isRead ? count : Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  const reset = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    reset,
  }), [loading, markAllRead, markRead, notifications, refresh, reset, unreadCount]);

  return <InboxNotificationContext.Provider value={value}>{children}</InboxNotificationContext.Provider>;
}
