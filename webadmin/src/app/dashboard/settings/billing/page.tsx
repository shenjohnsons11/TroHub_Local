"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { getNotificationMessage } from "@/lib/notification-messages";
import { useLanguage } from "@/components/language-provider";

const parseDays = (value: string) => [...new Set(
  value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite),
)].sort((a, b) => a - b);

export default function BillingPolicyPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("3");
  const [lateFeeRate, setLateFeeRate] = useState("5");
  const [automaticRemindersEnabled, setAutomaticRemindersEnabled] = useState(true);
  const [remindBeforeDueDays, setRemindBeforeDueDays] = useState("3");
  const [remindOnDueDate, setRemindOnDueDate] = useState(true);
  const [remindAfterOverdueDays, setRemindAfterOverdueDays] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings/billing-policy").then(({ data }) => {
      if (data) {
        setLateFeeGraceDays(String(data.lateFeeGraceDays || 3));
        setLateFeeRate(String(data.lateFeeRate || 5));
        setAutomaticRemindersEnabled(data.automaticRemindersEnabled !== false);
        setRemindBeforeDueDays((data.remindBeforeDueDays || [3]).join(", "));
        setRemindOnDueDate(data.remindOnDueDate !== false);
        setRemindAfterOverdueDays((data.remindAfterOverdueDays || [1]).join(", "));
      }
    }).catch((error) => notification.error(getNotificationMessage(error, t("common.error"))));
  }, [notification, t]);

  const preview = useMemo(
    () => formatCurrency(Math.round(3000000 * Number(lateFeeRate || 0) / 100)),
    [lateFeeRate],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const before = parseDays(remindBeforeDueDays);
    const after = parseDays(remindAfterOverdueDays);
    if ([...before, ...after].some((day) => !Number.isInteger(day) || day < 1 || day > 90)) {
      notification.warning(t("common.error"));
      return;
    }
    try {
      setSaving(true);
      await fetchAPI("/settings/billing-policy", {
        method: "PUT",
        body: JSON.stringify({
          lateFeeGraceDays: Number(lateFeeGraceDays),
          lateFeeRate: Number(lateFeeRate),
          automaticRemindersEnabled,
          remindBeforeDueDays: before,
          remindOnDueDate,
          remindAfterOverdueDays: after,
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
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-bold text-primary">{t("nav.settings")}</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.025em]">{t("settings.billing.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("settings.billing.subtitle")}</p>
      </header>
      <form onSubmit={submit} className="space-y-7 border border-border bg-card p-6">
        <section className="space-y-4">
          <h2 className="text-base font-black">{t("invoices.penalty")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="grace">{t("settings.billing.graceDays")}</Label><Input id="grace" type="number" min="0" max="90" value={lateFeeGraceDays} onChange={(e) => setLateFeeGraceDays(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="rate">{t("settings.billing.penaltyRate")}</Label><Input id="rate" type="number" min="0" max="100" step=".01" value={lateFeeRate} onChange={(e) => setLateFeeRate(e.target.value)} required /></div>
          </div>
          <div className="bg-primary/8 p-4 text-sm"><p className="font-bold">Preview</p><p className="mt-1 text-muted-foreground">3.000.000đ → +{preview} penalty ({lateFeeGraceDays || 0} grace days).</p></div>
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <label className="flex min-h-11 items-center justify-between gap-4">
            <span><span className="block font-black">{t("invoices.sendReminder")}</span><span className="text-sm text-muted-foreground">Push notifications enabled.</span></span>
            <input type="checkbox" checked={automaticRemindersEnabled} onChange={(e) => setAutomaticRemindersEnabled(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="before">{t("common.from")} (days)</Label><Input id="before" value={remindBeforeDueDays} onChange={(e) => setRemindBeforeDueDays(e.target.value)} placeholder="3, 7" disabled={!automaticRemindersEnabled} /></div>
            <div className="space-y-2"><Label htmlFor="after">{t("common.to")} (days)</Label><Input id="after" value={remindAfterOverdueDays} onChange={(e) => setRemindAfterOverdueDays(e.target.value)} placeholder="1, 3" disabled={!automaticRemindersEnabled} /></div>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={remindOnDueDate} onChange={(e) => setRemindOnDueDate(e.target.checked)} disabled={!automaticRemindersEnabled} className="h-5 w-5 accent-primary" />{t("invoices.dueDate")}</label>
        </section>
        <Button disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
      </form>
    </div>
  );
}
