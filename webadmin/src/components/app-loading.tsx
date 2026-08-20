"use client";

import Image from "next/image";
import { TroHubLogo } from "@/components/trohub-logo";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function AppLoading({ message }: { message?: string }) {
  const { t } = useLanguage();
  const displayMessage = message || t("i18n.loading.propertyData");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6" role="status" aria-live="polite">
      <TroHubLogo />
      <div className="app-loading-frame mt-8 mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm w-full max-w-[340px] aspect-[1.6] relative" aria-hidden="true">
        <Image
          src="/trohub-property-loading.png"
          alt={t("i18n.loading.spaceAlt")}
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="app-loading-track flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" />
        <p className="text-sm font-semibold text-muted-foreground">{displayMessage}</p>
      </div>
    </div>
  );
}
