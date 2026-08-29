"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { getNotificationMessage } from "@/lib/notification-messages";
import { useLanguage } from "@/components/language-provider";

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function PolicySwitch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-[cubic-bezier(.16,1,.3,1)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(.16,1,.3,1)] ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function DaySelect({ id, value, onChange, disabled, label }: { id: string; value: number; onChange: (value: number) => void; disabled?: boolean; label: string }) {
  return (
    <Select value={String(value)} onValueChange={(next) => next && onChange(Number(next))} disabled={disabled}>
      <SelectTrigger id={id} className="w-full" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{DAYS.map((day) => <SelectItem key={day} value={String(day)}>{day}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export default function BillingPolicyPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("3");
  const [lateFeeRate, setLateFeeRate] = useState("5");
  const [autoInvoiceEnabled, setAutoInvoiceEnabled] = useState(true);
  const [invoiceDay, setInvoiceDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);
  const [autoRemindEnabled, setAutoRemindEnabled] = useState(true);
  const [remindDaysBeforeDue, setRemindDaysBeforeDue] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings/billing-policy").then(({ data }) => {
      if (!data) return;
      setLateFeeGraceDays(String(data.lateFeeGraceDays ?? 3));
      setLateFeeRate(String(data.lateFeeRate ?? 5));
      setAutoInvoiceEnabled(data.autoInvoiceEnabled !== false);
      setInvoiceDay(data.invoiceDay ?? 25);
      setDueDay(data.dueDay ?? 5);
      setAutoRemindEnabled(data.autoRemindEnabled !== false);
      setRemindDaysBeforeDue(data.remindDaysBeforeDue ?? 2);
    }).catch((error) => notification.error(getNotificationMessage(error, t("common.error"))));
  }, [notification, t]);

  const preview = useMemo(() => formatCurrency(Math.round(3_000_000 * Number(lateFeeRate || 0) / 100)), [lateFeeRate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings/billing-policy", {
        method: "PUT",
        body: JSON.stringify({
          lateFeeGraceDays: Number(lateFeeGraceDays),
          lateFeeRate: Number(lateFeeRate),
          autoInvoiceEnabled,
          invoiceDay,
          dueDay,
          autoRemindEnabled,
          remindDaysBeforeDue,
        }),
      });
      notification.success(t("settings.billing.saved"));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="text-sm font-bold text-primary">{t("nav.settings")}</p><h1 className="mt-1 text-3xl font-black tracking-[-0.025em] text-balance">{t("settings.billing.title")}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{t("settings.billing.subtitle")}</p></header>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3"><span className="grid size-11 place-items-center rounded-[14px] bg-primary/10 text-primary"><ReceiptText className="size-5" /></span><div><CardTitle>{t("settings.autoInvoice")}</CardTitle><CardDescription>{t("settings.autoInvoiceDescription")}</CardDescription></div><PolicySwitch checked={autoInvoiceEnabled} onChange={setAutoInvoiceEnabled} label={t("settings.autoInvoice")} /></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-day">{t("settings.invoiceDay")}</Label><DaySelect id="invoice-day" value={invoiceDay} onChange={setInvoiceDay} disabled={!autoInvoiceEnabled} label={t("settings.invoiceDay")} /></div><div className="space-y-2"><Label htmlFor="due-day">{t("settings.dueDay")}</Label><DaySelect id="due-day" value={dueDay} onChange={setDueDay} disabled={!autoInvoiceEnabled} label={t("settings.dueDay")} /></div><div className="col-span-full flex gap-3 rounded-[14px] bg-primary/8 p-4 text-sm"><CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-muted-foreground">{t("settings.invoiceScheduleHint", { invoiceDay, dueDay })}</p></div></CardContent>
          </Card>
          <Card>
            <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3"><span className="grid size-11 place-items-center rounded-[14px] bg-primary/10 text-primary"><BellRing className="size-5" /></span><div><CardTitle>{t("settings.autoRemind")}</CardTitle><CardDescription>{t("settings.autoRemindDescription")}</CardDescription></div><PolicySwitch checked={autoRemindEnabled} onChange={setAutoRemindEnabled} label={t("settings.autoRemind")} /></CardHeader>
            <CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="remind-days">{t("settings.remindDaysBeforeDue")}</Label><DaySelect id="remind-days" value={remindDaysBeforeDue} onChange={setRemindDaysBeforeDue} disabled={!autoRemindEnabled} label={t("settings.remindDaysBeforeDue")} /></div><div className="flex gap-3 rounded-[14px] bg-muted p-4 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-muted-foreground">{t("settings.reminderScheduleHint", { days: remindDaysBeforeDue })}</p></div></CardContent>
          </Card>
        </div>
        <Card><CardHeader><CardTitle>{t("invoices.penalty")}</CardTitle><CardDescription>{t("settings.billing.penaltyDescription")}</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="grace">{t("settings.billing.graceDays")}</Label><Input id="grace" type="number" min="0" max="90" value={lateFeeGraceDays} onChange={(event) => setLateFeeGraceDays(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="rate">{t("settings.billing.penaltyRate")}</Label><Input id="rate" type="number" min="0" max="100" step=".01" value={lateFeeRate} onChange={(event) => setLateFeeRate(event.target.value)} required /></div><p className="col-span-full rounded-[14px] bg-muted p-4 text-sm text-muted-foreground">{t("settings.billing.penaltyPreview", { amount: preview, days: lateFeeGraceDays || 0 })}</p></CardContent></Card>
        <Button className="min-w-56" disabled={saving}>{saving ? t("common.saving") : t("settings.saveAutomation")}</Button>
      </form>
    </div>
  );
}
