"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatters";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { FEATURE_ICONS } from "@/constants/feature-icons";
import { FeatureIconBox } from "@/components/ui/feature-icon-box";

type Props = {
  stats: any;
};

export function BentoGridDashboard({ stats }: Props) {
  const totalRooms = Number(stats?.totalRooms ?? 0);
  const occupiedRooms = Number(stats?.occupiedRooms ?? 0);
  const vacantRooms = Number(stats?.vacantRooms ?? Math.max(0, totalRooms - occupiedRooms));
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalRevenue = Number(stats?.totalRevenue ?? 0);
  const outstandingDebt = Number(stats?.outstandingDebt ?? 0);
  const pendingRepairs = Number(stats?.pendingRepairs ?? 0);
  const revenueSeries = Array.isArray(stats?.revenueSeries) ? stats.revenueSeries : [];
  const maxRevenue = Math.max(1, ...revenueSeries.map((item: any) => Number(item.value || 0)));

  return (
    <div className="space-y-6">
      {/* Top Row: Asymmetric Bento Grid (2 Columns) */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Big Card 1: Revenue Overview with Wave Graph */}
        <div className="calm-surface relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-card to-card p-7 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              TỔNG DOANH THU THÁNG NÀY
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="size-3.5" /> {totalRevenue > 0 ? "Thực tế" : "Chưa có phát sinh"}
            </span>
          </div>

          <div className="mt-4">
            <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              {formatCurrency(totalRevenue)}
            </h2>
          </div>


          {/* 3D Wave Bar Chart Animation */}
          <div className="mt-8 flex h-24 items-end justify-between gap-3 border-b border-border/40 pb-4">
            {revenueSeries.map((item: any) => (
              <div key={item.period} className="group flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-emerald-500/60 transition-all duration-300 group-hover:bg-emerald-500"
                  style={{ height: `${Math.max(3, Number(item.value || 0) / maxRevenue * 100)}%` }}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-bold text-muted-foreground">
              {stats?.utilityReading?.readyRooms || 0}/{stats?.utilityReading?.totalOccupiedRooms || 0} phòng đủ chỉ số
            </span>
            <Link href="/dashboard/payments" className="inline-flex items-center text-xs font-black text-primary hover:underline">
              Chi tiết giao dịch <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </div>
        </div>

        {/* Big Card 2: Property Occupancy Bento Circular Ring */}
        <div className="calm-surface flex flex-col justify-between rounded-[28px] border border-border/50 bg-card p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">CÔNG SUẤT PHÒNG</span>
            <Link href="/dashboard/rooms" className="text-muted-foreground hover:text-foreground">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="my-6 flex items-center justify-between">
            <div className="relative size-24 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path className="stroke-current text-muted/20" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-current text-emerald-500 transition-all duration-1000" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray={`${occupancyRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-emerald-500">{occupancyRate}%</span>
            </div>

            <div className="space-y-2 text-right">
              <div>
                <p className="text-3xl font-black">{occupiedRooms}<span className="text-base font-bold text-muted-foreground">/{totalRooms}</span></p>
                <p className="text-xs font-bold text-muted-foreground">Đang thuê</p>
              </div>
              <p className="text-xs font-black text-amber-500">{vacantRooms} phòng trống</p>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-center text-xs font-bold text-muted-foreground">
            Hiệu suất lấp đầy đạt chỉ tiêu cao 🎯
          </div>
        </div>
      </div>

      {/* Middle Row: AI Quick Action Bar (3 Pills) */}
      <div className="calm-surface rounded-[28px] border border-border/50 bg-card p-6 shadow-sm">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">THAO TÁC NHANH THÔNG MINH (AI QUICK ACTIONS)</span>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/dashboard/invoices" className="group flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-pink-500/5 p-4 transition-all hover:scale-[1.02] border border-pink-500/20">
            <FeatureIconBox token={FEATURE_ICONS.scanMeter} size="md" />
            <div>
              <p className="font-black text-foreground">Quét điện nước AI 📸</p>
              <p className="text-xs text-muted-foreground">Chụp camera tự chốt số</p>
            </div>
          </Link>

          <Link href="/dashboard/invoices" className="group flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 p-4 transition-all hover:scale-[1.02] border border-indigo-500/20">
            <FeatureIconBox token={FEATURE_ICONS.invoiceBulk} size="md" />
            <div>
              <p className="font-black text-foreground">Tạo Hóa Đơn Hàng Loạt</p>
              <p className="text-xs text-muted-foreground">Phát hành tự động 1s</p>
            </div>
          </Link>

          <Link href="/dashboard/contracts/new" className="group flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 p-4 transition-all hover:scale-[1.02] border border-emerald-500/20">
            <FeatureIconBox token={FEATURE_ICONS.contractCreate} size="md" />
            <div>
              <p className="font-black text-foreground">Tạo Hợp Đồng Mới</p>
              <p className="text-xs text-muted-foreground">Dự thảo & Ký điện tử</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Row: 2 Square Bento Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/dashboard/debts" className="calm-surface group flex flex-col justify-between rounded-[28px] border border-border/50 bg-card p-6 transition-all hover:border-rose-500/30">
          <div className="flex items-center justify-between">
            <FeatureIconBox token={FEATURE_ICONS.debts} size="md" />
            {outstandingDebt > 0 && <span className="size-2.5 rounded-full bg-rose-500 animate-pulse" />}
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-muted-foreground">Công nợ chưa thu</p>
            <p className="mt-1 text-2xl font-black text-foreground">{formatCurrency(outstandingDebt)}</p>
          </div>

          <p className="mt-3 text-xs font-extrabold text-rose-500">
            {outstandingDebt > 0 ? "⚠️ Cần gửi thông báo nhắc nợ" : "✅ Đã quyết toán hết"}
          </p>
        </Link>

        <Link href="/dashboard/repairs" className="calm-surface group flex flex-col justify-between rounded-[28px] border border-border/50 bg-card p-6 transition-all hover:border-orange-500/30">
          <div className="flex items-center justify-between">
            <FeatureIconBox token={FEATURE_ICONS.repairs} size="md" />
            {pendingRepairs > 0 && <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-muted-foreground">Sự cố & Sửa chữa</p>
            <p className="mt-1 text-2xl font-black text-foreground">{pendingRepairs} Yêu cầu</p>
          </div>

          <p className="mt-3 text-xs font-extrabold text-amber-500">
            {pendingRepairs > 0 ? `${pendingRepairs} việc cần xử lý hôm nay` : "✅ Hệ thống ổn định"}
          </p>
        </Link>
      </div>
    </div>
  );
}
