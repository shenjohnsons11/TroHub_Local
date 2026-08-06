"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName?: string; propertyAddress?: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("trohub_user");
    if (!userData) {
      window.location.href = "/";
    } else {
      const storedUser = JSON.parse(userData);
      setUser(storedUser);
      void fetchAPI("/auth/me").then((data) => {
        if (!data.user) return;
        const nextUser = { ...storedUser, ...data.user };
        localStorage.setItem("trohub_user", JSON.stringify(nextUser));
        setUser(nextUser);
      }).catch(() => undefined);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    window.location.href = "/";
  };

  const navGroups = [
    { label: "Vận hành", items: [
      { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
      { name: "Quản lý Phòng", href: "/dashboard/rooms", icon: Home },
      { name: "Người thuê", href: "/dashboard/tenants", icon: Users },
      { name: "Hợp đồng", href: "/dashboard/contracts", icon: FileText },
      { name: "Điện nước", href: "/dashboard/utilities", icon: Droplet },
    ] },
    { label: "Tài chính", items: [
      { name: "Hóa đơn", href: "/dashboard/invoices", icon: Receipt },
      { name: "Công nợ", href: "/dashboard/debts", icon: Wallet },
      { name: "Thanh toán", href: "/dashboard/payments", icon: CreditCard },
      { name: "Quản lý dịch vụ", href: "/dashboard/services", icon: Settings2 },
    ] },
    { label: "Hỗ trợ", items: [
      { name: "Sửa chữa", href: "/dashboard/repairs", icon: Wrench },
      { name: "Cài đặt", href: "/dashboard/settings", icon: SlidersHorizontal },
    ] },
  ];
  const navItems = navGroups.flatMap((group) => group.items);

  if (!user) return <AppLoading message="Đang mở bảng điều khiển" />;

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
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-bold transition-[background-color,color,transform] duration-200 active:scale-[.98] ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_24%,transparent)]"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <span className={`grid size-8 place-items-center rounded-xl ${isActive ? "bg-white/14" : "bg-accent group-hover:bg-card"}`}>
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      {item.name}
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
              <p className="truncate text-sm font-extrabold text-foreground">{user.fullName || "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">Chủ trọ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] text-sm font-bold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-[288px]">
        <header className="app-topbar sticky top-0 z-20">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="md:hidden"><TroHubLogo compact /></div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-muted-foreground">Không gian vận hành</p>
              <h2 className="text-xl font-black tracking-[-.025em] text-foreground">
                {navItems.find(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"))?.name || "Dashboard"}
              </h2>
            </div>
            {user.propertyAddress ? (
              <div className="hidden min-w-0 flex-1 rounded-xl bg-primary/8 px-3 py-2 lg:flex lg:items-center lg:gap-2" title={user.propertyAddress}>
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate text-sm font-bold text-foreground">🏠 Nhà trọ TroHub - {user.propertyAddress}</span>
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
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="grid size-10 place-items-center rounded-[14px] text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[16px] px-3 py-2 text-sm font-bold transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "bg-card/75 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
