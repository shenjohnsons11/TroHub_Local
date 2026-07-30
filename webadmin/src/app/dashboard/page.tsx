"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CircleDollarSign, FileSignature, FileText, ReceiptText, Users, WalletCards, Wrench } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/calm-ops/page-header";
import { PriorityPanel } from "@/components/calm-ops/priority-panel";
import { StatCard } from "@/components/calm-ops/stat-card";
import { StatusBadge } from "@/components/calm-ops/status-badge";
import { AppLoading } from "@/components/app-loading";

import { getRealtimeGreeting } from "@/lib/utils";

type Stats = { totalRooms: number; occupiedRooms: number; totalTenants: number; pendingRepairs: number; totalRevenue: number };

export default function DashboardPage() {
  const notification = useNotification();
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetchAPI("/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải tổng quan."));
    }
  }, [notification]);

  useEffect(() => { void load(); }, [load]);

  if (!stats) return <AppLoading message="Đang tổng hợp dữ liệu vận hành" />;

  const vacantRooms = Math.max(0, stats.totalRooms - stats.occupiedRooms);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tổng quan vận hành" title={getRealtimeGreeting()} description="Những việc cần chú ý được đưa lên trước để Chủ trọ xử lý nhanh và không bỏ sót." />

      <PriorityPanel title="Cần xử lý hôm nay" count={stats.pendingRepairs} action={<Link href="/dashboard/repairs" className="text-sm font-extrabold text-primary hover:underline">Xem tất cả</Link>}>
        <div>
          <Link href="/dashboard/repairs" className="flex min-h-20 items-center justify-between gap-4 rounded-[16px] bg-muted p-4 transition hover:bg-[var(--calm-forest-soft)]">
            <div><p className="font-black">{stats.pendingRepairs} yêu cầu sửa chữa đang mở</p><p className="mt-1 text-sm text-muted-foreground">Tiếp nhận và cập nhật trạng thái cho Người thuê.</p></div>
            <StatusBadge tone="progress">Đang xử lý</StatusBadge>
          </Link>
        </div>
      </PriorityPanel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tổng số phòng" value={stats.totalRooms} detail={`${stats.occupiedRooms} phòng đang thuê`} icon={Building2} />
        <StatCard label="Phòng trống" value={vacantRooms} detail="Sẵn sàng tạo hợp đồng" icon={FileText} urgent={vacantRooms > 0} />
        <StatCard label="Người thuê" value={stats.totalTenants} detail="Đang hoạt động" icon={Users} />
        <StatCard label="Sửa chữa mở" value={stats.pendingRepairs} detail="Cần theo dõi tiến độ" icon={Wrench} urgent={stats.pendingRepairs > 0} />
        <div className="calm-surface flex flex-col justify-center rounded-[var(--calm-radius)] bg-card p-5">
          <p className="text-xs font-extrabold text-muted-foreground">Tỷ lệ lấp đầy</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative size-16 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path className="stroke-current text-muted/25" strokeWidth="3" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-current text-primary transition-all duration-1000 ease-out" strokeWidth="3"
                  strokeLinecap="round" fill="none"
                  strokeDasharray={`${Math.round((stats.occupiedRooms / Math.max(stats.totalRooms, 1)) * 100)}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
                {Math.round((stats.occupiedRooms / Math.max(stats.totalRooms, 1)) * 100)}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-black">{stats.occupiedRooms}<span className="text-base font-bold text-muted-foreground">/{stats.totalRooms}</span></p>
              <p className="text-xs text-muted-foreground">Phòng đang thuê</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <section className="calm-surface overflow-hidden bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_62%,#04100e))] p-6 text-primary-foreground sm:p-8">
          <div className="flex items-start justify-between gap-5"><span className="grid size-12 place-items-center rounded-[16px] bg-primary-foreground/12"><CircleDollarSign className="size-6" /></span><span className="rounded-full bg-primary-foreground/12 px-3 py-1 text-xs font-bold">Dữ liệu thực</span></div>
          <p className="mt-8 text-sm font-bold opacity-75">Doanh thu đã thu trong kỳ</p>
          <p className="mt-1 text-4xl font-black tracking-[-.05em] sm:text-5xl">{formatCurrency(stats.totalRevenue)}</p>
          <Link href="/dashboard/payments" className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Đối chiếu giao dịch <ArrowUpRight className="size-4" /></Link>
        </section>
        <section className="calm-surface p-6">
          <p className="font-black">Thao tác nhanh</p>
          <div className="mt-4 grid gap-2">
            {[
              { label: "Tạo hợp đồng", href: "/dashboard/contracts/new", icon: FileSignature },
              { label: "Phát hành hóa đơn", href: "/dashboard/invoices", icon: ReceiptText },
              { label: "Xem giao dịch", href: "/dashboard/payments", icon: WalletCards },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-[16px] bg-muted px-4 py-3 text-sm font-extrabold transition hover:bg-[var(--calm-forest-soft)]"><Icon className="size-4 text-primary" />{label}<ArrowUpRight className="ml-auto size-4 text-muted-foreground" /></Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
