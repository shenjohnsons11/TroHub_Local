import type { ReactNode } from "react";
import type { FeatureIconToken } from "@/constants/feature-icons";
import { FeatureIconBox } from "@/components/ui/feature-icon-box";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  iconToken,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  iconToken?: FeatureIconToken;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-sm font-bold text-[var(--calm-terracotta)]">{eyebrow}</p> : null}
        <div className="mt-1 flex items-center gap-3">
          {iconToken ? <FeatureIconBox token={iconToken} size="md" /> : null}
          <h1 className="text-3xl font-black tracking-[-.035em] text-foreground sm:text-4xl">{title}</h1>
        </div>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
