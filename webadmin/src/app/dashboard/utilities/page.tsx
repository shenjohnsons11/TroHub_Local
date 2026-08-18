"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CalendarRange, Eye, Gauge, Search, Send, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";
import { formatCurrency, formatMeterReading, parseMeterReading } from "@/lib/formatters";
import { consumePendingAIAction } from "@/lib/ai-actions";
import { useLanguage } from "@/components/language-provider";

type MeterField = "electricity" | "water";

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Cannot read file"));
  reader.onerror = () => reject(new Error("Cannot read file"));
  reader.readAsDataURL(file);
});

export default function UtilitiesPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [previews, setPreviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [startMonth, setStartMonth] = useState(currentMonthStr);
  const [endMonth, setEndMonth] = useState(currentMonthStr);
  const [utilitiesState, setUtilitiesState] = useState<Record<string, { electricity: string; water: string }>>({});
  const [highlightedContractId, setHighlightedContractId] = useState("");
  const meterImageInputRef = useRef<HTMLInputElement>(null);
  const pendingMeterRef = useRef<{ contractId: string; room: string; field: MeterField } | null>(null);
  const [meterChoice, setMeterChoice] = useState<{ contractId: string; room: string } | null>(null);
  const [manualMeter, setManualMeter] = useState<{ contractId: string; room: string; field: MeterField } | null>(null);
  const [manualMeterValue, setManualMeterValue] = useState("");

  const steps = [
    { label: t("invoices.period"), icon: CalendarRange },
    { label: t("invoices.recordMeter"), icon: Gauge },
    { label: "Preview", icon: Eye },
    { label: t("common.send"), icon: Send },
  ];

  const loadPreviews = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI("/utilities/readings");
      if (data.success && data.data) {
        setPreviews(data.data);
        const stateInit: Record<string, { electricity: string; water: string }> = {};
        data.data.forEach((p: any) => {
          stateInit[p.contractId] = {
            electricity: formatMeterReading(p.electricityDraft),
            water: formatMeterReading(p.waterDraft),
          };
        });
        setUtilitiesState(stateInit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreviews();
  }, []);

  useEffect(() => {
    if (!previews.length) return;
    const action = consumePendingAIAction("FILL_UTILITY_READING");
    if (!action) return;
    const preview = previews.find((item) => item.room?.trim().toLowerCase() === action.roomCode.trim().toLowerCase());
    if (!preview) { notification.warning(`${t("common.room")} ${action.roomCode} not found.`); return; }
    setUtilitiesState((current) => ({ ...current, [preview.contractId]: { electricity: formatMeterReading(action.newElec), water: formatMeterReading(action.newWater) } }));
    setHighlightedContractId(preview.contractId);
    const timer = window.setTimeout(() => setHighlightedContractId(""), 2000);
    return () => window.clearTimeout(timer);
  }, [previews, notification, t]);

  const handleUpdateInput = (contractId: string, field: "electricity" | "water", value: string) => {
    setUtilitiesState((prev) => ({
      ...prev,
      [contractId]: { ...prev[contractId], [field]: parseMeterReading(value) === null ? value : formatMeterReading(value) },
    }));
  };

  const beginMeterCapture = (field: MeterField) => {
    if (!meterChoice) return;
    pendingMeterRef.current = { ...meterChoice, field };
    setMeterChoice(null);
    meterImageInputRef.current?.click();
  };

  const handleMeterImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = pendingMeterRef.current;
    pendingMeterRef.current = null;
    event.target.value = "";
    if (!file || !target) return;
    try {
      const image = await fileToDataUrl(file);
      const result = await fetchAPI("/ocr/meter", { method: "POST", body: JSON.stringify({ image }) });
      if (!result.data?.digits) throw new Error("Cannot read digits");
      handleUpdateInput(target.contractId, target.field, result.data.digits);
      notification.success(t("invoices.ocrSuccess"));
    } catch {
      setManualMeter(target);
      setManualMeterValue("");
      notification.warning(t("invoices.ocrError"));
    }
  };

  const applyManualMeter = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualMeter || !manualMeterValue.trim()) return;
    handleUpdateInput(manualMeter.contractId, manualMeter.field, manualMeterValue);
    setManualMeter(null);
    setManualMeterValue("");
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    try {
      const utilitiesToUpdate = previews
        .map((p) => {
          const inputState = utilitiesState[p.contractId];
          const draftElectricity = parseMeterReading(inputState?.electricity);
          const draftWater = parseMeterReading(inputState?.water);
          return {
            roomId: p.roomId,
            draftElectricity: draftElectricity ?? undefined,
            draftWater: draftWater ?? undefined,
          };
        })
        .filter((item) => item.draftElectricity !== undefined || item.draftWater !== undefined);

      if (utilitiesToUpdate.length === 0) {
        notification.warning(t("common.noData"));
        setLoading(false);
        return;
      }

      const res = await fetchAPI("/rooms/bulk-report-utility", {
        method: "POST",
        body: JSON.stringify({ utilities: utilitiesToUpdate }),
      });

      if (res.success) {
        notification.success(t("utilities.savedSuccess"));
        void loadPreviews();
      } else {
        notification.error(getNotificationMessage(res.message, t("common.error")));
      }
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  };

  const filteredPreviews = previews.filter((p) => p.room?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <input ref={meterImageInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={handleMeterImage} tabIndex={-1} />
      <PageHeader
        eyebrow={t("nav.overview")}
        title={t("utilities.title")}
        description={t("utilities.subtitle")}
        action={
          <Button onClick={handleSaveBulk} disabled={loading}>
            <Save aria-hidden="true" /> {loading ? t("common.loading") : t("utilities.recordAll")}
          </Button>
        }
      />

      <div className="flex gap-4 p-4 calm-surface rounded-[20px]">
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">{t("common.from")} {t("common.month")}</label>
          <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">{t("common.to")} {t("common.month")}</label>
          <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </div>
      </div>

      <ol aria-label={t("utilities.title")} className="grid gap-2 rounded-[20px] bg-card p-3 shadow-[var(--calm-shadow)] ring-1 ring-border/50 sm:grid-cols-4">
        {steps.map(({ label, icon: Icon }, index) => {
          const active = index === 1;
          const complete = index < 1;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-3 rounded-[16px] px-3 py-3 ${active ? "bg-primary text-primary-foreground" : complete ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-current/10">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[.12em] opacity-70">Step {index + 1}</span>
                <span className="text-sm font-extrabold">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("common.search")}
              placeholder={t("rooms.searchPlaceholder")}
              className="h-11 pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-sm font-bold text-muted-foreground">{previews.length} {t("nav.rooms")}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={6} className="bg-muted/50 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("invoices.period")}: {startMonth} - {endMonth}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead>{t("rooms.roomCode")}</TableHead>
              <TableHead>{t("rooms.price")}</TableHead>
              <TableHead>{t("utilities.oldElec")}</TableHead>
              <TableHead className="text-primary">{t("utilities.newElec")}</TableHead>
              <TableHead>{t("utilities.oldWater")}</TableHead>
              <TableHead className="text-primary">{t("utilities.newWater")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="p-4"><div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div></TableCell></TableRow>
            ) : filteredPreviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-left" />
                  <p className="font-extrabold">{t("common.noData")}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPreviews.map((p) => (
                <TableRow key={p.contractId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">{p.room}</span>
                      <Button type="button" variant="outline" size="sm" className="h-11 whitespace-nowrap px-2 text-xs" aria-label={t("utilities.scanCamera")} onClick={() => setMeterChoice({ contractId: p.contractId, room: p.room })}>
                        📷
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(p.roomAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatMeterReading(p.electricityOld)} kWh</TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${t("utilities.newElec")} ${p.room}`}
                      className="h-12 w-28 bg-accent/45"
                      style={highlightedContractId === p.contractId ? { outline: "2px solid #b8f5da", outlineOffset: 2, boxShadow: "0 0 8px #b8f5da" } : undefined}
                      placeholder="0"
                      inputMode="decimal"
                      value={utilitiesState[p.contractId]?.electricity || ""}
                      onChange={(event) => handleUpdateInput(p.contractId, "electricity", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatMeterReading(p.waterOld)} m³</TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${t("utilities.newWater")} ${p.room}`}
                      className="h-12 w-28 bg-accent/45"
                      style={highlightedContractId === p.contractId ? { outline: "2px solid #b8f5da", outlineOffset: 2, boxShadow: "0 0 8px #b8f5da" } : undefined}
                      placeholder="0"
                      inputMode="decimal"
                      value={utilitiesState[p.contractId]?.water || ""}
                      onChange={(event) => handleUpdateInput(p.contractId, "water", event.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog open={Boolean(meterChoice)} onOpenChange={(open) => { if (!open) setMeterChoice(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("utilities.scanCamera")} · {meterChoice?.room}</DialogTitle></DialogHeader>
          <div className="flex gap-3">
            <Button type="button" className="flex-1" onClick={() => beginMeterCapture("electricity")}>⚡ {t("nav.utilities")}</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => beginMeterCapture("water")}>💧 {t("nav.utilities")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(manualMeter)} onOpenChange={(open) => { if (!open) setManualMeter(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("invoices.recordMeter")} · {manualMeter?.room}</DialogTitle></DialogHeader>
          <form onSubmit={applyManualMeter} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("invoices.ocrError")}</p>
            <Input autoFocus inputMode="decimal" aria-label={manualMeter?.room || ""} value={manualMeterValue} onChange={(event) => { const value = event.target.value; setManualMeterValue(parseMeterReading(value) === null ? value : formatMeterReading(value)); }} placeholder="0" required />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setManualMeter(null)}>{t("common.cancel")}</Button><Button type="submit">{t("common.save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
