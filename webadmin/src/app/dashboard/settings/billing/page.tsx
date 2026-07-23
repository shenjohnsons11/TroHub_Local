"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function BillingPolicyPage() {
  const notification = useNotification();
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("3");
  const [lateFeeRate, setLateFeeRate] = useState("5");
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetchAPI("/settings/billing-policy").then(({ data }) => { setLateFeeGraceDays(String(data.lateFeeGraceDays)); setLateFeeRate(String(data.lateFeeRate)); }).catch((error) => notification.error(getNotificationMessage(error))); }, [notification]);
  const preview = useMemo(() => Math.round(3000000 * Number(lateFeeRate || 0) / 100).toLocaleString("vi-VN"), [lateFeeRate]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try { setSaving(true); await fetchAPI("/settings/billing-policy", { method: "PUT", body: JSON.stringify({ lateFeeGraceDays: Number(lateFeeGraceDays), lateFeeRate: Number(lateFeeRate) }) }); notification.success("Đã lưu chính sách hóa đơn."); }
    catch (error) { notification.error(getNotificationMessage(error, "Không thể lưu chính sách hóa đơn.")); } finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6"><header><p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Áp dụng cho hóa đơn mới</p><h1 className="mt-1 text-3xl font-black">Chính sách hóa đơn</h1><p className="mt-2 text-muted-foreground">Hóa đơn đã phát hành giữ nguyên chính sách tại thời điểm tạo.</p></header><form onSubmit={submit} className="space-y-5 rounded-[14px] border border-border bg-card p-6"><div className="space-y-2"><Label htmlFor="grace">Số ngày ân hạn</Label><Input id="grace" type="number" min="0" max="90" value={lateFeeGraceDays} onChange={(e) => setLateFeeGraceDays(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="rate">Tỷ lệ phạt một lần (%)</Label><Input id="rate" type="number" min="0" max="100" step=".01" value={lateFeeRate} onChange={(e) => setLateFeeRate(e.target.value)} required /></div><div className="rounded-[12px] bg-primary/8 p-4 text-sm"><p className="font-bold">Xem trước</p><p className="mt-1 text-muted-foreground">Hóa đơn 3.000.000đ sẽ phạt {preview}đ sau {lateFeeGraceDays || 0} ngày ân hạn.</p></div><Button disabled={saving}>{saving ? "Đang lưu..." : "Lưu chính sách"}</Button></form></div>;
}
