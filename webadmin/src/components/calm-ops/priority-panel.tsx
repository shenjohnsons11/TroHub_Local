import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export function PriorityPanel({ title = "Cần xử lý", count, children, action }: { title?: string; count?: number; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="calm-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[16px] bg-[var(--calm-terracotta-soft)] text-[var(--calm-terracotta)]"><AlertCircle className="size-5" /></span>
          <div><p className="text-xs font-bold text-[var(--calm-terracotta)]">Ưu tiên</p><h2 className="font-black tracking-[-.02em]">{title}{typeof count === "number" ? ` · ${count}` : ""}</h2></div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
