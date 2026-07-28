import type { LucideIcon } from "lucide-react";

export function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <div className="grid min-h-52 place-items-center rounded-[20px] bg-accent/45 p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-[var(--calm-forest-soft)] text-[var(--calm-forest)] shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_15%,transparent)]"><Icon className="size-6" /></span><h3 className="mt-4 text-base font-black tracking-[-.02em]">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p></div></div>;
}
