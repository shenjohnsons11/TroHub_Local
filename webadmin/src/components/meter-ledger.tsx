"use client";

import { formatCurrency, formatMeterReading, parseMeterReading } from "@/lib/formatters";
import { getMeterPreview } from "@/lib/meter-reading";

export function MeterLedger({ label, unit, previous, current, unitPrice, onChange }: {
  label: string;
  unit: "kWh" | "m³";
  previous: number;
  current: string;
  unitPrice: number;
  onChange: (value: string) => void;
}) {
  const parsedCurrent = parseMeterReading(current);
  const preview = parsedCurrent === null ? null : getMeterPreview(previous, parsedCurrent, unitPrice);

  return <div className="grid gap-3 rounded-xl bg-muted/45 p-3 sm:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)]">
    <LedgerValue label={`${label} · kỳ trước`} value={`${formatMeterReading(previous)} ${unit}`} />
    <label className="text-xs text-muted-foreground">Kỳ này<input value={current} inputMode="decimal" onChange={(event) => { const value = event.target.value; onChange(parseMeterReading(value) === null ? value : formatMeterReading(value)); }} className="mt-1 h-12 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25" /></label>
    <LedgerValue label="Tiêu thụ" value={preview ? `${formatMeterReading(preview.usage)} ${unit}` : "Kiểm tra chỉ số"} />
    <LedgerValue label="Thành tiền" value={preview ? formatCurrency(preview.amount) : "—"} accent />
    <div className="sm:col-start-3"><LedgerValue label="Đơn giá" value={formatCurrency(unitPrice)} /></div>
    {parsedCurrent !== null && parsedCurrent < previous ? <p className="text-xs font-semibold text-destructive sm:col-span-4">Chỉ số kỳ này không được nhỏ hơn kỳ trước.</p> : null}
  </div>;
}

function LedgerValue({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${accent ? "text-primary" : ""}`}>{value}</p></div>;
}
