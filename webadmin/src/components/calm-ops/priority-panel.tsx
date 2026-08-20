"use client";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function PriorityPanel({ title, count, children, action }: { title?: string; count?: number; children: ReactNode; action?: ReactNode }) {
  const { t } = useLanguage();
  const displayTitle = title || t("i18n.priority.defaultTitle");
  return (
    <section className="calm-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[16px] bg-[var(--calm-terracotta-soft)] text-[var(--calm-terracotta)]"><AlertCircle className="size-5" /></span>
          <div><p className="text-xs font-bold text-[var(--calm-terracotta)]">{t("i18n.priority.label")}</p><h2 className="font-black tracking-[-.02em]">{displayTitle}{typeof count === "number" ? ` · ${count}` : ""}</h2></div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
