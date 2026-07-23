"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CircleDollarSign, FileText, Users, Wrench } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

type Stats = { totalRooms: number; occupiedRooms: number; totalTenants: number; pendingRepairs: number; totalRevenue: number };

export default function DashboardPage() {
  const notification = useNotification();
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(async () => { try { const response = await fetchAPI("/dashboard/stats"); setStats(response.data); } catch (error) { notification.error(getNotificationMessage(error, "Không thể tải tổng quan.")); } }, [notification]);
  useEffect(() => { void load(); }, [load]);
  const cards = [
    ["Tổng số phòng", stats?.totalRooms || 0, Building2],
    ["Phòng đang thuê", stats?.occupiedRooms || 0, FileText],
    ["Người thuê", stats?.totalTenants || 0, Users],
    ["Sửa chữa đang mở", stats?.pendingRepairs || 0, Wrench],
  ] as const;
  return <div className="space-y-7"><header className="rounded-[18px] bg-[#25292d] p-7 text-white"><p className="text-sm font-bold uppercase tracking-[.12em] text-[#ff7a32]">Tổng quan vận hành</p><h1 className="mt-2 text-3xl font-black">Mọi chỉ số quan trọng, trong một màn hình.</h1><p className="mt-3 text-[#c8cdd0]">Theo dõi Phòng, Người thuê, hóa đơn và sửa chữa theo thời gian thực.</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-[14px] border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-5 text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}</div><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-[14px] border border-border bg-card p-6"><CircleDollarSign className="h-6 w-6 text-primary" /><p className="mt-5 text-sm font-semibold text-muted-foreground">Doanh thu đã thu trong kỳ</p><p className="mt-1 text-4xl font-black">{(stats?.totalRevenue || 0).toLocaleString("vi-VN")}đ</p></div><div className="rounded-[14px] border border-border bg-card p-6"><p className="font-black">Truy cập nhanh</p><div className="mt-4 grid gap-2">{[["Tạo hợp đồng","/dashboard/contracts/new"],["Phát hành hóa đơn","/dashboard/invoices"],["Xem giao dịch","/dashboard/payments"]].map(([label,href]) => <Link key={href} href={href} className="rounded-[10px] bg-background px-4 py-3 text-sm font-bold hover:bg-primary/10">{label}</Link>)}</div></div></div></div>;
}
