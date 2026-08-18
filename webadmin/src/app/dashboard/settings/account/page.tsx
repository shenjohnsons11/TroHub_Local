"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatPhone, unformatDigits } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";

export default function AccountSettingsPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings")
      .then(({ data }) => setForm({ name: data?.name || "", phone: formatPhone(data?.phone), email: data?.email || "", password: "" }))
      .catch((error) => notification.error(getNotificationMessage(error, t("common.error"))));
  }, [notification, t]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify({ ...form, phone: unformatDigits(form.phone) }),
      });
      notification.success(t("settings.account.saved"));
      setForm((value) => ({ ...value, password: "" }));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["name", t("auth.fullName"), "text"],
    ["phone", t("auth.phone"), "tel"],
    ["email", t("auth.email"), "email"],
    ["password", t("settings.account.newPassword"), "password"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={t("nav.settings")} title={t("settings.account.title")} description={t("settings.account.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <aside className="calm-surface flex flex-col items-center justify-center bg-accent/45 p-5 text-center">
          <span className="grid size-16 place-items-center rounded-[20px] bg-primary text-primary-foreground">
            <UserRound aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-4 font-extrabold">{t("settings.account.title")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("settings.account.subtitle")}</p>
        </aside>
        <form onSubmit={submit} className="calm-surface space-y-5 p-6">
          {fields.map(([key, label, type]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} type={type} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: key === "phone" ? formatPhone(event.target.value) : event.target.value })} />
            </div>
          ))}
          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4 text-primary" /> TroHub Security</p>
            <Button disabled={saving}><Save aria-hidden="true" />{saving ? t("common.saving") : t("common.save")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
