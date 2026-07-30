import Image from "next/image";
import { TroHubLogo } from "@/components/trohub-logo";
import { Loader2 } from "lucide-react";

export function AppLoading({ message = "Đang tải dữ liệu không gian sống..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6" role="status" aria-live="polite">
      <TroHubLogo />
      <div className="app-loading-frame mt-8 mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm w-full max-w-[340px] aspect-[1.6] relative" aria-hidden="true">
        <Image
          src="/trohub-property-loading.png"
          alt="Loading Space"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="app-loading-track flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
