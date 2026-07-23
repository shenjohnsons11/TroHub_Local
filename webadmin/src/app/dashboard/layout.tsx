"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Home, Droplet, Receipt, Wrench, LogOut, Wallet, Settings2, CreditCard, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { TroHubLogo } from "@/components/trohub-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLoading } from "@/components/app-loading";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("trohub_user");
    if (!userData) {
      window.location.href = "/";
    } else {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    window.location.href = "/";
  };

  const navItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Quản lý Phòng", href: "/dashboard/rooms", icon: Home },
    { name: "Người thuê", href: "/dashboard/tenants", icon: Users },
    { name: "Hợp đồng", href: "/dashboard/contracts", icon: FileText },
    { name: "Điện nước", href: "/dashboard/utilities", icon: Droplet },
    { name: "Hóa đơn", href: "/dashboard/invoices", icon: Receipt },
    { name: "Công nợ", href: "/dashboard/debts", icon: Wallet },
    { name: "Thanh toán", href: "/dashboard/payments", icon: CreditCard },
    { name: "Quản lý dịch vụ", href: "/dashboard/services", icon: Settings2 },
    { name: "Sửa chữa", href: "/dashboard/repairs", icon: Wrench },
    { name: "Cài đặt", href: "/dashboard/settings", icon: SlidersHorizontal },
  ];

  if (!user) return <AppLoading message="Đang mở bảng điều khiển" />;

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="fixed hidden h-full w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-[72px] items-center border-b border-border px-5">
          <TroHubLogo />
        </div>
        
        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-[9px] px-3 py-2.5 font-semibold transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-background font-bold text-foreground">
              {user.fullName ? user.fullName[0].toUpperCase() : "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-foreground">{user.fullName || "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">Chủ trọ</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-[9px] px-3 py-2.5 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="md:hidden"><TroHubLogo compact /></div>
          <h2 className="hidden text-xl font-black text-foreground sm:block">
            {navItems.find(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"))?.name || "Dashboard"}
          </h2>
          <ThemeToggle />
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
              return <Link key={item.href} href={item.href} className={`shrink-0 rounded-[8px] px-3 py-2 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item.name}</Link>;
            })}
          </nav>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
