"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export function TroHubLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t } = useLanguage();
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label="TRO HUB">
      <span className="relative flex-shrink-0" aria-hidden="true">
        <Image
          src="/app_logo.png"
          alt="TroHub Logo"
          width={44}
          height={44}
          priority
          className="rounded-[13px] object-cover"
          style={{ width: 44, height: 44 }}
        />
      </span>
      {!compact && (
        <span className="grid gap-0.5 leading-none">
          <strong className="text-xl font-black tracking-[-.03em] text-foreground">TRO HUB</strong>
          <small className="text-[9px] font-bold text-muted-foreground">{t("i18n.brand.tagline")}</small>
        </span>
      )}
    </span>
  );
}
