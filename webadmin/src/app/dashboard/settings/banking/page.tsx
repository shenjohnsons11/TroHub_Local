"use client";

import { FormEvent, useEffect, useState } from "react";
import { Landmark, QrCode, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function BankingSettingsPage() {
  const notification = useNotification();
  const [form, setForm] = useState({ bankId: "", bankAccountNo: "", bankAccountName: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings")
      .then(({ data }) => setForm({ bankId: data.bankId || "", bankAccountNo: data.bankAccountNo || "", bankAccountName: data.bankAccountName || "" }))
      .catch((error) => notification.error(getNotificationMessage(error)));
  }, [notification]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings", { method: "PUT", body: JSON.stringify(form) });
      notification.success("Đã cập nhật thông tin ngân hàng.");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể cập nhật thông tin ngân hàng."));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["bankId", "Mã ngân hàng"],
    ["bankAccountNo", "Số tài khoản"],
    ["bankAccountName", "Tên chủ tài khoản"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Thanh toán" title="Thông tin ngân hàng" description="Dùng để tạo VietQR và hiển thị hướng dẫn thanh toán." />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <aside className="calm-surface flex flex-col justify-between bg-primary p-5 text-primary-foreground">
          <Landmark aria-hidden="true" className="size-8" />
          <div>
            <p className="text-lg font-black">VietQR</p>
            <p className="mt-1 text-xs leading-5 opacity-75">Thông tin này xuất hiện trong hướng dẫn thanh toán.</p>
          </div>
          <QrCode aria-hidden="true" className="size-12 self-end opacity-60" />
        </aside>
        <form onSubmit={submit} className="calm-surface space-y-5 p-6">
          {fields.map(([key, label]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required />
            </div>
          ))}
          <Button disabled={saving} className="w-full sm:w-auto"><Save aria-hidden="true" />{saving ? "Đang lưu..." : "Lưu thông tin"}</Button>
        </form>
      </div>
    </div>
  );
}
