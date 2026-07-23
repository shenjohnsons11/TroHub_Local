"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function AccountSettingsPage() {
  const notification = useNotification();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetchAPI("/settings").then(({ data }) => setForm({ name: data.name || "", phone: data.phone || "", email: data.email || "", password: "" })).catch((error) => notification.error(getNotificationMessage(error))); }, [notification]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try { setSaving(true); await fetchAPI("/settings", { method: "PUT", body: JSON.stringify(form) }); notification.success("Đã cập nhật tài khoản."); setForm((value) => ({ ...value, password: "" })); }
    catch (error) { notification.error(getNotificationMessage(error, "Không thể cập nhật tài khoản.")); } finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6"><header><h1 className="text-3xl font-black">Cài đặt tài khoản</h1><p className="mt-2 text-muted-foreground">Thông tin Chủ trọ/Admin dùng trong hệ thống.</p></header><form onSubmit={submit} className="space-y-5 rounded-[14px] border border-border bg-card p-6">{[["name","Họ và tên","text"],["phone","Số điện thoại","tel"],["email","Email","email"],["password","Mật khẩu mới","password"]].map(([key,label,type]) => <div className="space-y-2" key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type={type} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}<Button disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></form></div>;
}
