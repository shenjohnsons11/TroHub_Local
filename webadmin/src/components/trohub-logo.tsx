import { cn } from "@/lib/utils";

export function TroHubLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label="TRO HUB">
      <span className="grid h-10 w-[58px] -skew-x-[9deg] grid-cols-2 gap-[3px]" aria-hidden="true">
        <b className="grid place-items-center rounded-[3px] bg-[#ef6a22] text-lg font-black text-[#f8f8f6]">T</b>
        <b className="grid place-items-center rounded-[3px] bg-[#17834a] text-lg font-black text-[#f8f8f6]">H</b>
      </span>
      {!compact && (
        <span className="grid gap-0.5 leading-none">
          <strong className="text-xl font-black text-foreground">TRO HUB</strong>
          <small className="text-[8px] font-extrabold tracking-[0.14em] text-muted-foreground">QUẢN LÝ NHÀ TRỌ</small>
        </span>
      )}
    </span>
  );
}
