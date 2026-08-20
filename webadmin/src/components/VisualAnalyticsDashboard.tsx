"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { ArrowUpRight, Calendar, CircleDollarSign, AlertTriangle, Sparkles, Zap, Droplet, TrendingUp } from "lucide-react";
import Link from "next/link";

type Props = {
  stats: any;
};

export function VisualAnalyticsDashboard({ stats }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(5);

  const revenueHistory = [
    { month: "Tháng 3", revenue: 14200000, heightPct: 45, expense: 3200000 },
    { month: "Tháng 4", revenue: 16800000, heightPct: 60, expense: 4100000 },
    { month: "Tháng 5", revenue: 15500000, heightPct: 52, expense: 3800000 },
    { month: "Tháng 6", revenue: 19200000, heightPct: 80, expense: 4500000 },
    { month: "Tháng 7", revenue: 17800000, heightPct: 70, expense: 4200000 },
    { month: "Tháng 8", revenue: 18460000, heightPct: 75, expense: 4000000 },
  ];

  const currentItem = revenueHistory[selectedMonth];
  const netIncome = currentItem.revenue - currentItem.expense;
  const occupiedRate = Math.round(((stats?.occupiedRooms || 3) / Math.max(stats?.totalRooms || 8, 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Top Main Section: Revenue Chart & Occupancy */}
      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        {/* Biểu đồ Cột Doanh Thu Đa Chiều */}
        <div className="calm-surface rounded-[var(--calm-radius)] border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                TỔNG DOANH THU & PHÂN TÍCH TÀI CHÍNH
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-foreground">
                {formatCurrency(currentItem.revenue)}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Calendar className="size-3.5" />
              <span>{currentItem.month}</span>
            </div>
          </div>

          {/* Interactive Bar Chart Visualization */}
          <div className="mt-8 flex h-48 items-end justify-between gap-3 pt-6 border-b border-border/40 pb-4">
            {revenueHistory.map((item, idx) => {
              const isSelected = idx === selectedMonth;
              return (
                <div
                  key={item.month}
                  onClick={() => setSelectedMonth(idx)}
                  className="group flex flex-1 cursor-pointer flex-col items-center gap-2"
                >
                  <div className="relative flex w-full max-w-[42px] flex-col items-center justify-end rounded-t-lg bg-muted/40 transition-all hover:bg-primary/20" style={{ height: "140px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isSelected ? "bg-primary shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-primary/40 group-hover:bg-primary/70"
                      }`}
                      style={{ height: `${item.heightPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-extrabold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Breakdown summary under chart */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-bold">Doanh Thu</p>
              <p className="mt-1 text-sm font-black text-primary">{formatCurrency(currentItem.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Chi Phí Vận Hành</p>
              <p className="mt-1 text-sm font-black text-amber-500">{formatCurrency(currentItem.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Lợi Nhuận Ròng</p>
              <p className="mt-1 text-sm font-black text-emerald-400">{formatCurrency(netIncome)}</p>
            </div>
          </div>
        </div>

        {/* Cột Phải: Biểu đồ Tròn Lấp Đầy & Dự Báo AI */}
        <div className="space-y-6">
          {/* Card Lấp đầy */}
          <div className="calm-surface rounded-[var(--calm-radius)] border border-border/50 bg-card p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">TỶ LỆ LẤP ĐẦY PHÒNG</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="relative size-20 shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path className="stroke-current text-muted/20" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="stroke-current text-primary transition-all duration-1000" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray={`${occupiedRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-primary">{occupiedRate}%</span>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-2xl font-black">{stats?.occupiedRooms || 3}<span className="text-base font-bold text-muted-foreground">/{stats?.totalRooms || 8}</span></p>
                <p className="text-xs font-bold text-muted-foreground">Phòng đang thuê</p>
                <Link href="/dashboard/rooms" className="inline-flex items-center text-xs font-extrabold text-primary hover:underline">
                  Xem phòng <ArrowUpRight className="ml-1 size-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* AI Insights Widget */}
          <div className="calm-surface rounded-[var(--calm-radius)] border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2 text-amber-500">
              <Sparkles className="size-4" />
              <p className="text-xs font-black uppercase tracking-wider">GỢI Ý TỰ ĐỘNG TỪ AI</p>
            </div>
            <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
              Doanh thu tháng này duy trì ổn định. Dự kiến tháng tới có 2 hợp đồng sắp hết hạn. Khuyến nghị gửi thông báo gia hạn trước 15 ngày.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Biến Động Điện Nước & Phân Loại Công Nợ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Biến động điện nước */}
        <div className="calm-surface rounded-[var(--calm-radius)] border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">XU HƯỚNG TIÊU THỤ ĐIỆN NƯỚC</p>
            <div className="flex items-center gap-3 text-xs font-extrabold">
              <span className="flex items-center gap-1 text-amber-500"><Zap className="size-3.5" /> Điện (kWh)</span>
              <span className="flex items-center gap-1 text-blue-500"><Droplet className="size-3.5" /> Nước (m³)</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { period: "Tháng 8", elec: "1,720 kWh", water: "150 m³", elecTrend: "+4.2%", waterTrend: "-1.5%" },
              { period: "Tháng 7", elec: "1,850 kWh", water: "160 m³", elecTrend: "+8.1%", waterTrend: "+3.2%" },
              { period: "Tháng 6", elec: "1,680 kWh", water: "145 m³", elecTrend: "+2.0%", waterTrend: "+0.8%" },
            ].map((row) => (
              <div key={row.period} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <span className="text-xs font-extrabold">{row.period}</span>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-500">{row.elec} ({row.elecTrend})</span>
                  <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-blue-500">{row.water} ({row.waterTrend})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phân loại công nợ theo tuổi nợ (Debt Aging Heatmap) */}
        <div className="calm-surface rounded-[var(--calm-radius)] border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">BẢN ĐỒ NHIỆT CÔNG NỢ (DEBT AGING)</p>
            <span className="text-xs font-black text-rose-500">{formatCurrency(stats?.outstandingDebt || 0)}</span>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <span className="text-xs font-bold text-emerald-600">Dưới 7 ngày (Trong hạn)</span>
              <span className="text-xs font-black text-emerald-600">0đ</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <span className="text-xs font-bold text-amber-600">7 - 15 ngày (Nhắc nhở)</span>
              <span className="text-xs font-black text-amber-600">0đ</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
              <span className="text-xs font-bold text-rose-600">Quá 15 ngày (Khẩn cấp)</span>
              <span className="text-xs font-black text-rose-600">0đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
