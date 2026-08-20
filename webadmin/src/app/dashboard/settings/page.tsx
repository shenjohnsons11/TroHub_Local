"use client";

import Link from "next/link";
import { ArrowUpRight, Landmark, ReceiptText, Settings2, UserRound, LogOut } from "lucide-react";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useLanguage } from "@/components/language-provider";

export default function SettingsPage() {
  const { t } = useLanguage();

  const items = [
    { href: "/dashboard/settings/account", title: t("settings.account.title"), description: t("settings.account.subtitle"), icon: UserRound },
    { href: "/dashboard/settings/banking", title: t("settings.banking.title"), description: t("settings.banking.subtitle"), icon: Landmark },
    { href: "/dashboard/settings/billing", title: t("settings.billing.title"), description: t("settings.billing.subtitle"), icon: ReceiptText },
  ];

  const handleLogout = () => {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.settings")} title={t("settings.title")} description={t("settings.subtitle")} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={`Open ${title}`}
            className="group calm-surface relative min-h-52 overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            <span className="grid size-12 place-items-center rounded-[16px] bg-accent text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <ArrowUpRight aria-hidden="true" className="absolute right-5 top-5 size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <h2 className="mt-8 text-xl font-black tracking-[-.025em]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-[20px] bg-primary px-5 py-4 text-primary-foreground shadow-[var(--calm-shadow)]">
        <Settings2 aria-hidden="true" className="size-5" />
        <p className="text-sm font-bold">TroHub Security & Config</p>
      </div>

      <div className="pt-4 border-t border-border/50">
        <button
          onClick={handleLogout}
          className="flex min-h-12 items-center justify-center gap-3 rounded-[16px] bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground transition-all hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30"
        >
          <LogOut className="size-5" aria-hidden="true" />
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
