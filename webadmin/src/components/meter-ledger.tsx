"use client";

import { formatCurrency, formatMeterReading, parseMeterReading } from "@/lib/formatters";
import { getMeterPreview } from "@/lib/meter-reading";
import { useLanguage } from "@/components/language-provider";

export function MeterLedger({ label, unit, previous, current, unitPrice, onChange }: {
  label: string;
  unit: "kWh" | "m³";
  previous: number;
  current: string;
  unitPrice: number;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const parsedCurrent = parseMeterReading(current);
  const preview = parsedCurrent === null ? null : getMeterPreview(previous, parsedCurrent, unitPrice);

  return <div className="grid gap-3 rounded-xl bg-muted/45 p-3 sm:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)]">
    <LedgerValue label={t("i18n.meter.previousPeriod", { label })} value={`${formatMeterReading(previous)} ${unit}`} />
    <label className="text-xs text-muted-foreground">{t("i18n.meter.currentPeriod")}<input value={current} inputMode="decimal" onChange={(event) => { const value = event.target.value; onChange(parseMeterReading(value) === null ? value : formatMeterReading(value)); }} className="mt-1 h-12 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25" /></label>
    <LedgerValue label={t("i18n.meter.consumption")} value={preview ? `${formatMeterReading(preview.usage)} ${unit}` : t("i18n.meter.checkReading")} />
    <LedgerValue label={t("i18n.meter.amount")} value={preview ? formatCurrency(preview.amount) : "—"} accent />
    <div className="sm:col-start-3"><LedgerValue label={t("i18n.meter.unitPrice")} value={formatCurrency(unitPrice)} /></div>
    {parsedCurrent !== null && parsedCurrent < previous ? <p className="text-xs font-semibold text-destructive sm:col-span-4">{t("i18n.meter.readingTooLow")}</p> : null}
  </div>;
}

function LedgerValue({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${accent ? "text-primary" : ""}`}>{value}</p></div>;
}
