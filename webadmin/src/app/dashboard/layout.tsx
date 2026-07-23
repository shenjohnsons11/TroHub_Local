"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Home, Droplet, Receipt, Wrench, LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

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
    { name: "Khách thuê", href: "/dashboard/tenants", icon: Users },
    { name: "Hợp đồng", href: "/dashboard/contracts", icon: FileText },
    { name: "Điện nước", href: "/dashboard/utilities", icon: Droplet },
    { name: "Hóa đơn", href: "/dashboard/invoices", icon: Receipt },
    { name: "Công nợ", href: "/dashboard/debts", icon: Wallet },
    { name: "Sửa chữa", href: "/dashboard/repairs", icon: Wrench },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="w-8 h-8 bg-[#f37021] text-white rounded-lg flex items-center justify-center font-bold text-sm">
            TH
          </div>
          <span className="font-bold text-lg text-slate-800">TroHub Admin</span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? "bg-orange-50 text-[#f37021]" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
              {user.fullName ? user.fullName[0].toUpperCase() : "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || "Admin"}</p>
              <p className="text-xs text-slate-500 truncate">Chủ trọ</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            {navItems.find(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"))?.name || "Dashboard"}
          </h2>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
