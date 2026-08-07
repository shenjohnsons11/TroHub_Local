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
import { useLanguage } from "@/components/language-provider";


type Stats = { totalRooms: number; occupiedRooms: number; vacantRooms: number; maintenanceRooms: number; totalTenants: number; pendingRepairs: number; pendingContracts: number; totalRevenue: number; outstandingDebt: number };
const EMPTY_STATS: Stats = { totalRooms: 0, occupiedRooms: 0, vacantRooms: 0, maintenanceRooms: 0, totalTenants: 0, pendingRepairs: 0, pendingContracts: 0, totalRevenue: 0, outstandingDebt: 0 };

export default function DashboardPage() {
  const notification = useNotification();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetchAPI("/dashboard/stats");
      setStats({ ...EMPTY_STATS, ...(response.data || {}) });
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
      setStats(EMPTY_STATS);
    }
  }, [notification, t]);

  useEffect(() => { void load(); }, [load]);

  if (!stats) return <AppLoading message={t("common.loading")} />;

  const vacantRooms = stats.vacantRooms || Math.max(0, stats.totalRooms - stats.occupiedRooms);
  const occupancyRate = Math.round((stats.occupiedRooms / Math.max(stats.totalRooms, 1)) * 100);
  const hour = new Date().getHours();
  const greetingKey = hour >= 5 && hour < 12 ? "dashboard.morning" : hour >= 12 && hour < 18 ? "dashboard.afternoon" : "dashboard.evening";
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("dashboard.eyebrow")} title={t(greetingKey)} description={t("dashboard.today")} />

      <PriorityPanel title={t("dashboard.today")} count={stats.pendingRepairs + stats.pendingContracts} action={<Link href="/dashboard/repairs" className="text-sm font-extrabold text-primary hover:underline">{t("dashboard.viewAll")}</Link>}>
        <div>
          <Link href="/dashboard/repairs" className="flex min-h-20 items-center justify-between gap-4 rounded-[16px] bg-muted p-4 transition hover:bg-[var(--calm-forest-soft)]">
            <div><p className="font-black">{stats.pendingRepairs} {t("dashboard.openRequests")}</p><p className="mt-1 text-sm text-muted-foreground">{t("dashboard.repairHint")}</p></div>
            <StatusBadge tone="progress">{t("dashboard.today")}</StatusBadge>
          </Link>
        </div>
      </PriorityPanel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dashboard.revenue")} value={formatCurrency(stats.totalRevenue)} detail={t("dashboard.active")} icon={CircleDollarSign} />
        <StatCard label={t("dashboard.debt")} value={formatCurrency(stats.outstandingDebt)} detail={t("dashboard.today")} icon={WalletCards} urgent={stats.outstandingDebt > 0} />
        <StatCard label={t("dashboard.rooms")} value={stats.totalRooms} detail={`${stats.occupiedRooms} ${t("dashboard.occupied").toLowerCase()}`} icon={Building2} />
        <StatCard label={t("dashboard.vacant")} value={vacantRooms} detail={t("dashboard.createContract")} icon={FileText} urgent={vacantRooms > 0} />
        <StatCard label={t("dashboard.maintenance")} value={stats.maintenanceRooms} detail={t("dashboard.rooms")} icon={Wrench} urgent={stats.maintenanceRooms > 0} />
        <StatCard label={t("dashboard.contracts")} value={stats.pendingContracts} detail={t("dashboard.today")} icon={FileSignature} urgent={stats.pendingContracts > 0} />
        <StatCard label={t("dashboard.tenants")} value={stats.totalTenants} detail={t("dashboard.active")} icon={Users} />
        <StatCard label={t("dashboard.repairs")} value={stats.pendingRepairs} detail={t("dashboard.today")} icon={Wrench} urgent={stats.pendingRepairs > 0} />
        <div className="calm-surface flex flex-col justify-center rounded-[var(--calm-radius)] bg-card p-5">
          <p className="text-xs font-extrabold text-muted-foreground">{t("dashboard.occupancy")}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative size-16 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path className="stroke-current text-muted/25" strokeWidth="3" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-current text-primary transition-all duration-1000 ease-out" strokeWidth="3"
                  strokeLinecap="round" fill="none"
                  strokeDasharray={`${occupancyRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black">
                {occupancyRate}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-black">{stats.occupiedRooms}<span className="text-base font-bold text-muted-foreground">/{stats.totalRooms}</span></p>
              <p className="text-xs text-muted-foreground">{t("dashboard.occupied")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <section className="calm-surface overflow-hidden bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_62%,#04100e))] p-6 text-primary-foreground sm:p-8">
          <div className="flex items-start justify-between gap-5"><span className="grid size-12 place-items-center rounded-[16px] bg-primary-foreground/12"><CircleDollarSign className="size-6" /></span><span className="rounded-full bg-primary-foreground/12 px-3 py-1 text-xs font-bold">Dữ liệu thực</span></div>
          <p className="mt-8 text-sm font-bold opacity-75">{t("dashboard.revenue")}</p>
          <p className="mt-1 text-4xl font-black tracking-[-.05em] sm:text-5xl">{formatCurrency(stats.totalRevenue)}</p>
          <Link href="/dashboard/payments" className="mt-5 inline-flex items-center gap-2 text-sm font-bold">{t("dashboard.viewAll")} <ArrowUpRight className="size-4" /></Link>
        </section>
        <section className="calm-surface p-6">
          <p className="font-black">{t("dashboard.quickActions")}</p>
          <div className="mt-4 grid gap-2">
            {[
              { label: t("dashboard.createContract"), href: "/dashboard/contracts/new", icon: FileSignature },
              { label: t("invoices.createInvoice"), href: "/dashboard/invoices", icon: ReceiptText },
              { label: t("dashboard.viewAll"), href: "/dashboard/payments", icon: WalletCards },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-[16px] bg-muted px-4 py-3 text-sm font-extrabold transition hover:bg-[var(--calm-forest-soft)]"><Icon className="size-4 text-primary" />{label}<ArrowUpRight className="ml-auto size-4 text-muted-foreground" /></Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
