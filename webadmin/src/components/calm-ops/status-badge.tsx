import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "overdue" | "neutral" | "progress";
export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-extrabold", {
    "bg-[var(--calm-forest-soft)] text-[var(--calm-forest)]": tone === "success",
    "bg-[var(--calm-terracotta-soft)] text-[var(--calm-terracotta)]": tone === "warning" || tone === "overdue",
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300": tone === "progress",
    "bg-muted text-muted-foreground": tone === "neutral",
  })}>{children}</span>;
}
