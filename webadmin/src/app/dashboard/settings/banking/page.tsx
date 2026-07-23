"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function BankingSettingsPage() {
  const notification = useNotification();
  const [form, setForm] = useState({ bankId: "", bankAccountNo: "", bankAccountName: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetchAPI("/settings").then(({ data }) => setForm({ bankId: data.bankId || "", bankAccountNo: data.bankAccountNo || "", bankAccountName: data.bankAccountName || "" })).catch((error) => notification.error(getNotificationMessage(error))); }, [notification]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try { setSaving(true); await fetchAPI("/settings", { method: "PUT", body: JSON.stringify(form) }); notification.success("Đã cập nhật thông tin ngân hàng."); }
    catch (error) { notification.error(getNotificationMessage(error, "Không thể cập nhật thông tin ngân hàng.")); } finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6"><header><h1 className="text-3xl font-black">Thông tin ngân hàng</h1><p className="mt-2 text-muted-foreground">Dùng để tạo VietQR và hiển thị hướng dẫn thanh toán.</p></header><form onSubmit={submit} className="space-y-5 rounded-[14px] border border-border bg-card p-6">{[["bankId","Mã ngân hàng"],["bankAccountNo","Số tài khoản"],["bankAccountName","Tên chủ tài khoản"]].map(([key,label]) => <div className="space-y-2" key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></div>)}<Button disabled={saving}>{saving ? "Đang lưu..." : "Lưu thông tin"}</Button></form></div>;
}
