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

export default function AccountSettingsPage() {
  const notification = useNotification();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings")
      .then(({ data }) => setForm({ name: data.name || "", phone: data.phone || "", email: data.email || "", password: "" }))
      .catch((error) => notification.error(getNotificationMessage(error)));
  }, [notification]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings", { method: "PUT", body: JSON.stringify(form) });
      notification.success("Đã cập nhật tài khoản.");
      setForm((value) => ({ ...value, password: "" }));
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể cập nhật tài khoản."));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["name", "Họ và tên", "text"],
    ["phone", "Số điện thoại", "tel"],
    ["email", "Email", "email"],
    ["password", "Mật khẩu mới", "password"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Hồ sơ quản trị" title="Cài đặt tài khoản" description="Thông tin Chủ trọ/Admin dùng trong hệ thống." />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <aside className="calm-surface flex flex-col items-center justify-center bg-accent/45 p-5 text-center">
          <span className="grid size-16 place-items-center rounded-[20px] bg-primary text-primary-foreground">
            <UserRound aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-4 font-extrabold">Hồ sơ quản trị</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Thông tin được bảo vệ trong hệ thống.</p>
        </aside>
        <form onSubmit={submit} className="calm-surface space-y-5 p-6">
          {fields.map(([key, label, type]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            </div>
          ))}
          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4 text-primary" /> Dữ liệu chỉ dùng cho tài khoản này.</p>
            <Button disabled={saving}><Save aria-hidden="true" />{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
