import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TroHubLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label="TRO HUB">
      <span className="logo-mark grid size-11 place-items-center rounded-[15px] bg-primary text-primary-foreground" aria-hidden="true">
        <Building2 className="size-[22px]" strokeWidth={2.25} />
      </span>
      {!compact && (
        <span className="grid gap-0.5 leading-none">
          <strong className="text-xl font-black tracking-[-.03em] text-foreground">TRO HUB</strong>
          <small className="text-[9px] font-bold text-muted-foreground">Quản lý nhà trọ</small>
        </span>
      )}
    </span>
  );
}
