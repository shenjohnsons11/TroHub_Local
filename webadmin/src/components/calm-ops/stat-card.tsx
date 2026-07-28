import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, detail, icon: Icon, urgent = false }: { label: string; value: React.ReactNode; detail?: string; icon: LucideIcon; urgent?: boolean }) {
  return <article className="calm-surface p-5 transition-transform duration-200 hover:-translate-y-0.5"><span className={`grid size-11 place-items-center rounded-[16px] ${urgent ? "bg-[var(--calm-terracotta-soft)] text-[var(--calm-terracotta)]" : "bg-[var(--calm-forest-soft)] text-[var(--calm-forest)]"}`}><Icon className="size-5" /></span><p className="mt-5 text-sm font-bold text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black tracking-[-.035em]">{value}</p>{detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}</article>;
}
