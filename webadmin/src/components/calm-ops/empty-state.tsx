import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, icon: Icon, action }: { title: string; description: string; icon: LucideIcon; action?: { label: string; onClick: () => void; icon?: LucideIcon } }) {
  const ActionIcon = action?.icon;
  return <div className="grid min-h-52 place-items-center rounded-[20px] bg-accent/45 p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-[var(--calm-forest-soft)] text-[var(--calm-forest)] shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_15%,transparent)]"><Icon className="size-6" /></span><h3 className="mt-4 text-base font-black tracking-[-.02em]">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action ? <Button className="mt-5" onClick={action.onClick}>{ActionIcon ? <ActionIcon aria-hidden="true" /> : null}{action.label}</Button> : null}</div></div>;
}
