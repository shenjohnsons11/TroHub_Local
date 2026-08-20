"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, FileText, Info, LogOut, Receipt, Wrench } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";

export type NotificationType = {
  id: string;
  type: "checkout" | "invoice" | "contract" | "repair" | "tenant" | "utility" | "system";
  title: string;
  content: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type ApiNotification = Partial<NotificationType> & {
  _id?: string;
  message?: string;
  category?: string;
};

const normalizeType = (value?: string): NotificationType["type"] => {
  const type = String(value || "system").toLowerCase();
  if (type.includes("checkout")) return "checkout";
  if (type.includes("invoice")) return "invoice";
  if (type.includes("contract")) return "contract";
  if (type.includes("repair")) return "repair";
  if (type.includes("tenant")) return "tenant";
  if (type.includes("utility")) return "utility";
  return "system";
};

const mapNotification = (item: ApiNotification): NotificationType => ({
  id: String(item._id || item.id || ""),
  type: normalizeType(item.category || item.type),
  title: item.title || "",
  content: item.content || item.message || "",
  deepLink: item.deepLink,
  metadata: item.metadata || {},
  isRead: Boolean(item.isRead),
  createdAt: item.createdAt || new Date().toISOString(),
});

function getCategoryConfig(type: NotificationType["type"], t: (key: string) => string) {
  switch (type) {
    case "checkout":
      return { icon: LogOut, colorClass: "text-red-600 dark:text-red-400", bgClass: "bg-red-500/10 border border-red-500/20", badgeText: t("i18n.notificationBell.checkout") };
    case "invoice":
      return { icon: Receipt, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10 border border-emerald-500/20", badgeText: t("i18n.notificationBell.invoice") };
    case "repair":
      return { icon: Wrench, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10 border border-amber-500/20", badgeText: t("i18n.notificationBell.repair") };
    case "contract":
      return { icon: FileText, colorClass: "text-indigo-600 dark:text-indigo-400", bgClass: "bg-indigo-500/10 border border-indigo-500/20", badgeText: t("i18n.notificationBell.contract") };
    default:
      return { icon: Info, colorClass: "text-muted-foreground", bgClass: "bg-muted border border-border", badgeText: t("i18n.notificationBell.system") };
  }
}

const routeFor = (type: NotificationType["type"]) => {
  if (type === "invoice") return "/dashboard/invoices";
  if (type === "repair") return "/dashboard/repairs";
  if (type === "checkout" || type === "contract") return "/dashboard/contracts";
  if (type === "tenant") return "/dashboard/tenants";
  if (type === "utility") return "/dashboard/utilities";
  return "/dashboard";
};

export function NotificationBell() {
  const { language, t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = async () => {
    try {
      const response = await fetchAPI("/notifications");
      setNotifications((response.data || []).map(mapNotification));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 8000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const markAllAsRead = async () => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    try {
      await fetchAPI("/notifications/read-all", { method: "PUT" });
    } catch (error) {
      setNotifications(previous);
      console.error("Lỗi đánh dấu thông báo:", error);
    }
  };

  const markAsRead = async (id: string) => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item));
    try {
      await fetchAPI(`/notifications/${id}/read`, { method: "PUT" });
      return true;
    } catch (error) {
      setNotifications(previous);
      console.error("Lỗi đánh dấu thông báo:", error);
      return false;
    }
  };

  const handleItemClick = async (notification: NotificationType) => {
    if (!notification.isRead && !await markAsRead(notification.id)) return;
    setIsOpen(false);
    router.push(routeFor(notification.type));
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const grouped = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.createdAt);
      if (date >= todayStart) groups.today.push(notification);
      else if (date >= yesterdayStart) groups.yesterday.push(notification);
      else groups.older.push(notification);
      return groups;
    },
    { today: [] as NotificationType[], yesterday: [] as NotificationType[], older: [] as NotificationType[] },
  );

  const renderGroup = (label: string, items: NotificationType[]) => items.length ? (
    <div className="mb-4">
      <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</h4>
      <div className="space-y-1.5">
        {items.map((notification) => {
          const config = getCategoryConfig(notification.type, t);
          const Icon = config.icon;
          return (
            <button
              key={notification.id}
              onClick={() => void handleItemClick(notification)}
              className={`w-full cursor-pointer rounded-[16px] p-3 text-left transition-all duration-200 hover:scale-[1.01] hover:bg-accent/80 ${notification.isRead ? "opacity-75" : "bg-primary/5 font-medium"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${config.bgClass}`}><Icon className={`size-4.5 ${config.colorClass}`} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm leading-tight ${notification.isRead ? "font-bold" : "font-black"}`}>{notification.title || t("i18n.notificationBell.fallbackTitle")}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${config.bgClass} ${config.colorClass}`}>{config.badgeText}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.content}</p>
                  <p className="mt-1.5 text-[10px] font-bold text-muted-foreground/70">{new Date(notification.createdAt).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen((open) => !open)} className="theme-icon-button relative text-muted-foreground hover:text-foreground" aria-label={t("i18n.notificationBell.aria", { count: unreadCount ? t("i18n.notificationBell.unread", { count: unreadCount }) : "" })}>
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black leading-none text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[400px] origin-top-right overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-[0_12px_48px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div><h3 className="text-base font-black tracking-tight">{t("i18n.notificationBell.title")}</h3>{unreadCount > 0 && <p className="text-xs font-bold text-muted-foreground">{t("i18n.notificationBell.needsAttention", { count: unreadCount })}</p>}</div>
            {unreadCount > 0 && <button onClick={() => void markAllAsRead()} className="flex min-h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"><Check className="size-3.5" />{t("i18n.notificationBell.markRead")}</button>}
          </div>
          <div className="max-h-[460px] overflow-y-auto p-4">
            {notifications.length === 0 ? <div className="flex flex-col items-center py-10 text-center"><Bell className="mb-3 size-10 text-muted-foreground/40" /><p className="text-sm font-semibold text-muted-foreground">{t("i18n.notificationBell.empty")}</p></div> : <>{renderGroup(t("i18n.notificationBell.today"), grouped.today)}{renderGroup(t("i18n.notificationBell.yesterday"), grouped.yesterday)}{renderGroup(t("i18n.notificationBell.older"), grouped.older)}</>}
          </div>
        </div>
      )}
    </div>
  );
}
