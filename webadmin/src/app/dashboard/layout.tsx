"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Droplet,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings2,
  SlidersHorizontal,
  Users,
  Wallet,
  Wrench,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TroHubLogo } from "@/components/trohub-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLoading } from "@/components/app-loading";
import { NotificationBell } from "@/components/notification-bell";
import { MiniCalendarPopover } from "@/components/mini-calendar-popover";
import { LanguageToggle } from "@/components/language-toggle";
import { fetchAPI } from "@/lib/api";
import AIChatWidget from "@/components/AIChatWidget";
import { useLanguage } from "@/components/language-provider";
import { safeJsonParse, safeStorageString, type WebAdminUser } from "@/lib/client-storage";
import { useNotification } from "@/hooks/use-notification";
import { FEATURE_ICONS, type FeatureIconToken } from "@/constants/feature-icons";
import { FeatureIconBox } from "@/components/ui/feature-icon-box";

type NavItem = {
  key: string;
  fallback: string;
  href: string;
  token: FeatureIconToken;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const notification = useNotification();
  const { t } = useLanguage();
  const [user, setUser] = useState<WebAdminUser | null>(null);

  useEffect(() => {
    let active = true;
    let redirectTimer: number | undefined;
    const clearSession = () => {
      localStorage.removeItem("trohub_token");
      localStorage.removeItem("trohub_user");
    };
    const redirectToLogin = () => {
      clearSession();
      router.replace("/");
    };
    const token = safeStorageString(localStorage.getItem("trohub_token"));
    const storedUser = safeJsonParse<WebAdminUser | null>(
      localStorage.getItem("trohub_user"),
      null,
    );

    if (!token || !storedUser || typeof storedUser.role !== "number") {
      redirectToLogin();
      return () => undefined;
    }
    if (storedUser.role !== 1) {
      notification.error("Tài khoản không có quyền truy cập WebAdmin");
      redirectTimer = window.setTimeout(redirectToLogin, 250);
      return () => window.clearTimeout(redirectTimer);
    }

    setUser(storedUser);
    void fetchAPI("/auth/me")
      .then((data) => {
        if (!active || !data.user || typeof data.user !== "object") return;
        const nextUser = { ...storedUser, ...data.user } as WebAdminUser;
        if (nextUser.role !== 1) {
          notification.error("Tài khoản không có quyền truy cập WebAdmin");
          redirectTimer = window.setTimeout(redirectToLogin, 250);
          return;
        }
        localStorage.setItem("trohub_user", JSON.stringify(nextUser));
        setUser(nextUser);
      })
      .catch((error: { status?: number }) => {
        if (active && error.status === 401) redirectToLogin();
      });

    return () => {
      active = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [notification, router]);

  const handleLogout = () => {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    router.replace("/");
  };

  const navGroups: NavGroup[] = [
    { label: t("common.status") === "Trạng thái" ? "Vận hành" : "Operations", items: [
      { key: "nav.overview", fallback: "Tổng quan", href: "/dashboard", token: FEATURE_ICONS.overview },
      { key: "nav.rooms", fallback: "Quản lý Phòng", href: "/dashboard/rooms", token: FEATURE_ICONS.rooms },
      { key: "nav.tenants", fallback: "Người thuê", href: "/dashboard/tenants", token: FEATURE_ICONS.tenants },
      { key: "nav.contracts", fallback: "Hợp đồng", href: "/dashboard/contracts", token: FEATURE_ICONS.contracts },
      { key: "nav.utilities", fallback: "Điện nước", href: "/dashboard/utilities", token: FEATURE_ICONS.utilities },
    ] },
    { label: t("common.status") === "Trạng thái" ? "Tài chính" : "Finance", items: [
      { key: "nav.invoices", fallback: "Hóa đơn", href: "/dashboard/invoices", token: FEATURE_ICONS.invoices },
      { key: "nav.debts", fallback: "Công nợ", href: "/dashboard/debts", token: FEATURE_ICONS.debts },
      { key: "nav.payments", fallback: "Thanh toán", href: "/dashboard/payments", token: FEATURE_ICONS.payments },
      { key: "nav.services", fallback: "Quản lý dịch vụ", href: "/dashboard/services", token: FEATURE_ICONS.services },
    ] },
    { label: t("common.status") === "Trạng thái" ? "Hỗ trợ" : "Support", items: [
      { key: "nav.repairs", fallback: "Sửa chữa", href: "/dashboard/repairs", token: FEATURE_ICONS.repairs },
      { key: "nav.settings", fallback: "Cài đặt", href: "/dashboard/settings", token: FEATURE_ICONS.settings },
    ] },
  ];
  const navItems = navGroups.flatMap((group) => group.items);

  if (!user) return <AppLoading message={t("common.loading")} />;

  return (
    <div className="calm-admin flex min-h-[100dvh] bg-background">
      <aside className="app-sidebar fixed inset-y-3 left-3 z-30 hidden w-[264px] flex-col overflow-hidden rounded-[20px] md:flex">
        <div className="flex h-[76px] items-center px-5">
          <TroHubLogo />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {navGroups.map((group) => (
            <section key={group.label} className="mb-5">
              <p className="mb-2 px-3 text-[11px] font-extrabold text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
                  const title = t(item.key) || item.fallback;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-[16px] px-3 py-2 text-sm font-bold transition-[background-color,color,transform] duration-200 active:scale-[.98] ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_24%,transparent)]"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <FeatureIconBox token={item.token} size="sm" isActive={isActive} />
                      <span className="truncate">{title}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="m-3 rounded-[16px] bg-accent/75 p-2">
          <div className="mb-1 flex items-center gap-3 px-2 py-2">
            <div className="grid size-10 place-items-center rounded-full bg-primary font-black text-primary-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
              {user.fullName ? user.fullName[0].toUpperCase() : "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-extrabold text-foreground">{user.fullName || "Chủ trọ"}</p>
              <p className="truncate text-xs text-muted-foreground">{t("auth.registerLandlord")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t("auth.logout")}
            title={t("auth.logout")}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] text-sm font-bold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-[288px]">
        <header className="app-topbar sticky top-0 z-20">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="md:hidden"><TroHubLogo compact /></div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-muted-foreground">{t("nav.overview")}</p>
              <h2 className="text-xl font-black tracking-[-.025em] text-foreground">
                {t(navItems.find(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"))?.key || "nav.overview")}
              </h2>
            </div>
            {user.propertyAddress ? (
              <div className="hidden min-w-0 flex-1 rounded-xl bg-primary/8 px-3 py-2 lg:flex lg:items-center lg:gap-2" title={user.propertyAddress}>
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate text-sm font-bold text-foreground">🏠 TroHub - {user.propertyAddress}</span>
              </div>
            ) : <div className="hidden flex-1 lg:block" />}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <MiniCalendarPopover />
              </div>
              <NotificationBell />
              <LanguageToggle />
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("auth.logout")}
                title={t("auth.logout")}
                className="grid size-10 place-items-center rounded-[14px] text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[16px] px-3 py-2 text-sm font-bold transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "bg-card/75 text-muted-foreground"
                  }`}
                >
                  <FeatureIconBox token={item.token} size="sm" isActive={active} />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </div>
      </main>
      <AIChatWidget />
    </div>
  );
}
