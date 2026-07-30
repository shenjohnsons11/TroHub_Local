"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Receipt, FileText, Wrench, Users, Zap, Info } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatPhone } from "@/lib/formatters";

export type NotificationType = {
  id: string;
  type: "invoice" | "contract" | "repair" | "tenant" | "utility" | "system";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

const NOTIF_KEY = "@trohub_notifications";
const READ_KEY = "@trohub_read_notifications";

function getCategoryConfig(type: string) {
  switch (type) {
    case "invoice":
      return {
        icon: Receipt,
        colorClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-500/10 border border-emerald-500/20",
        badgeText: "Hóa đơn",
      };
    case "repair":
      return {
        icon: Wrench,
        colorClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-500/10 border border-amber-500/20",
        badgeText: "Sự cố",
      };
    case "contract":
      return {
        icon: FileText,
        colorClass: "text-indigo-600 dark:text-indigo-400",
        bgClass: "bg-indigo-500/10 border border-indigo-500/20",
        badgeText: "Hợp đồng",
      };
    case "tenant":
      return {
        icon: Users,
        colorClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-500/10 border border-blue-500/20",
        badgeText: "Người thuê",
      };
    case "utility":
      return {
        icon: Zap,
        colorClass: "text-yellow-600 dark:text-yellow-400",
        bgClass: "bg-yellow-500/10 border border-yellow-500/20",
        badgeText: "Điện nước",
      };
    default:
      return {
        icon: Info,
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted border border-border",
        badgeText: "Hệ thống",
      };
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = async () => {
    try {
      let localNotifs: NotificationType[] = [];
      const stored = localStorage.getItem(NOTIF_KEY);
      if (stored) localNotifs = JSON.parse(stored);

      let readIds: string[] = [];
      const storedRead = localStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);

      const [invoicesRes, contractsRes, repairsRes, tenantsRes, roomsRes] = await Promise.allSettled([
        fetchAPI("/invoices"),
        fetchAPI("/contracts"),
        fetchAPI("/repairs"),
        fetchAPI("/tenants"),
        fetchAPI("/rooms")
      ]);

      const dbNotifs: NotificationType[] = [];

      // 1. HÓA ĐƠN (Invoice)
      if (invoicesRes.status === "fulfilled" && invoicesRes.value?.success) {
        const invoices = invoicesRes.value.data || [];
        invoices.forEach((inv: any) => {
          if (inv.status === "Chưa thanh toán" || inv.status === "Quá hạn") {
            const roomCode = inv.contractId?.roomId?.roomCode || inv.room || "N/A";
            const id = `invoice-${inv._id || inv.id}`;
            dbNotifs.push({
              id,
              type: "invoice",
              title: inv.status === "Quá hạn" ? `Hóa đơn QUÁ HẠN - Phòng ${roomCode}` : `Hóa đơn chưa thu - Phòng ${roomCode}`,
              content: `Kỳ ${inv.period}: ${formatCurrency(inv.totalAmount)} - Hạn đóng: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "N/A"}`,
              isRead: readIds.includes(id),
              createdAt: inv.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // 2. HỢP ĐỒNG (Contract)
      if (contractsRes.status === "fulfilled" && contractsRes.value?.success) {
        const contracts = contractsRes.value.data || [];
        contracts.forEach((con: any) => {
          if (con.status === 0 || con.status === 4 || con.status === 5) {
            const roomCode = con.roomId?.roomCode || "N/A";
            const tenantName = con.tenantId?.fullName || "N/A";
            const id = `contract-${con._id || con.id}`;
            let title = "Hợp đồng chờ duyệt";
            if (con.status === 5) title = "Yêu cầu thanh lý trả phòng";
            else if (con.status === 0) title = "Hợp đồng chờ ký kết";

            dbNotifs.push({
              id,
              type: "contract",
              title,
              content: `Phòng ${roomCode} - Người thuê: ${tenantName}`,
              isRead: readIds.includes(id),
              createdAt: con.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // 3. SỰ CỐ (Repair)
      if (repairsRes.status === "fulfilled" && repairsRes.value?.success) {
        const repairs = repairsRes.value.data || [];
        repairs.forEach((rep: any) => {
          if (rep.status === "Chờ xử lý" || rep.status === "Đang sửa") {
            const roomCode = rep.roomCode || "N/A";
            const id = `repair-${rep._id || rep.id}`;
            dbNotifs.push({
              id,
              type: "repair",
              title: `Sự cố ${rep.title || rep.description || "Máy lạnh"} - Phòng ${roomCode}`,
              content: `Trạng thái: ${rep.status} · Phụ trách: ${rep.assignedTo || "Chưa phân công"}`,
              isRead: readIds.includes(id),
              createdAt: rep.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // 4. KHÁCH THUÊ (Tenant)
      if (tenantsRes.status === "fulfilled" && tenantsRes.value?.success) {
        const tenants = tenantsRes.value.data || [];
        tenants.forEach((t: any) => {
          if (!t.linkedAccountId) {
            const id = `tenant-${t._id || t.id}`;
            dbNotifs.push({
              id,
              type: "tenant",
              title: `Người thuê chưa liên kết App: ${t.fullName}`,
              content: `SĐT: ${formatPhone(t.phone)} - Cần gửi lời mời Zalo/SMS để tải ứng dụng.`,
              isRead: readIds.includes(id),
              createdAt: t.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // 5. ĐIỆN NƯỚC (Utility)
      if (roomsRes.status === "fulfilled" && roomsRes.value?.success) {
        const rooms = roomsRes.value.data || [];
        const occupied = rooms.filter((r: any) => r.status === 1).length;
        if (occupied > 0) {
          const now = new Date();
          const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
          const id = `utility-check-${monthStr}`;
          dbNotifs.push({
            id,
            type: "utility",
            title: `Nhắc chốt chỉ số Điện Nước kỳ ${monthStr}`,
            content: `Có ${occupied} phòng đang thuê sẵn sàng nhập chỉ số công tơ điện nước.`,
            isRead: readIds.includes(id),
            createdAt: now.toISOString()
          });
        }
      }

      // Gộp & lọc trùng
      const combined = [...dbNotifs, ...localNotifs.map(n => ({ ...n, isRead: readIds.includes(n.id) || n.isRead }))];
      
      const uniqueMap = new Map<string, NotificationType>();
      combined.forEach(n => {
        if (!uniqueMap.has(n.id)) {
          uniqueMap.set(n.id, n);
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(sorted);
    } catch (err) {
      console.error("Lỗi tải thông báo chuông:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    let readIds: string[] = [];
    try {
      const storedRead = localStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);
    } catch {}

    const activeIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...activeIds]));
    localStorage.setItem(READ_KEY, JSON.stringify(newReadIds));

    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
  };

  const markAsRead = (id: string) => {
    let readIds: string[] = [];
    try {
      const storedRead = localStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);
    } catch {}

    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(READ_KEY, JSON.stringify(readIds));
    }

    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
  };

  const handleItemClick = (n: NotificationType) => {
    markAsRead(n.id);
    setIsOpen(false);

    // Deep-link Navigation
    switch (n.type) {
      case "invoice":
        router.push("/dashboard/invoices");
        break;
      case "repair":
        router.push("/dashboard/repairs");
        break;
      case "contract":
        router.push("/dashboard/contracts");
        break;
      case "tenant":
        router.push("/dashboard/tenants");
        break;
      case "utility":
        router.push("/dashboard/utilities");
        break;
      default:
        break;
    }
  };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const grouped = notifications.reduce(
    (acc, curr) => {
      const d = new Date(curr.createdAt);
      if (d >= todayStart) acc.today.push(curr);
      else if (d >= yesterdayStart) acc.yesterday.push(curr);
      else acc.older.push(curr);
      return acc;
    },
    { today: [] as NotificationType[], yesterday: [] as NotificationType[], older: [] as NotificationType[] }
  );

  const renderGroup = (label: string, items: NotificationType[]) =>
    items.length > 0 ? (
      <div className="mb-4">
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</h4>
        <div className="space-y-1.5">
          {items.map(n => {
            const config = getCategoryConfig(n.type);
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`w-full cursor-pointer rounded-[16px] p-3 text-left transition-all duration-200 hover:scale-[1.01] hover:bg-accent/80 ${n.isRead ? "opacity-75" : "bg-primary/5 font-medium"}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${config.bgClass}`}>
                    <Icon className={`size-4.5 ${config.colorClass}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm leading-tight ${n.isRead ? "font-bold text-foreground" : "font-black text-foreground"}`}>{n.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${config.bgClass} ${config.colorClass}`}>
                        {config.badgeText}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                    <p className="mt-1.5 text-[10px] font-bold text-muted-foreground/70">
                      {new Date(n.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(o => !o)}
        className="theme-icon-button relative text-muted-foreground hover:text-foreground"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[400px] origin-top-right overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-[0_12px_48px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h3 className="text-base font-black tracking-tight">Thông báo vận hành</h3>
              {unreadCount > 0 && <p className="text-xs font-bold text-muted-foreground">{unreadCount} việc cần chú ý</p>}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
              >
                <Check className="size-3.5" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto p-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground">Không có thông báo nào</p>
              </div>
            ) : (
              <>
                {renderGroup("Hôm nay", grouped.today)}
                {renderGroup("Hôm qua", grouped.yesterday)}
                {renderGroup("Cũ hơn", grouped.older)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function addWebNotification(type: "invoice" | "contract" | "repair" | "tenant" | "utility" | "system", title: string, content: string) {
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    const list = stored ? JSON.parse(stored) : [];
    const newNotif = {
      id: "local-" + Math.random().toString(36).substring(2, 9),
      type,
      title,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newNotif);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
  } catch {}
}
