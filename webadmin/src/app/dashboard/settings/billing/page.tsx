"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, ReceiptText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function BillingPolicyPage() {
  const notification = useNotification();
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("3");
  const [lateFeeRate, setLateFeeRate] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAPI("/settings/billing-policy")
      .then(({ data }) => {
        setLateFeeGraceDays(String(data.lateFeeGraceDays));
        setLateFeeRate(String(data.lateFeeRate));
      })
      .catch((error) => notification.error(getNotificationMessage(error)));
  }, [notification]);

  const preview = useMemo(() => Math.round(3000000 * Number(lateFeeRate || 0) / 100).toLocaleString("vi-VN"), [lateFeeRate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings/billing-policy", {
        method: "PUT",
        body: JSON.stringify({ lateFeeGraceDays: Number(lateFeeGraceDays), lateFeeRate: Number(lateFeeRate) }),
      });
      notification.success("Đã lưu chính sách hóa đơn.");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu chính sách hóa đơn."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Áp dụng cho hóa đơn mới" title="Chính sách hóa đơn" description="Hóa đơn đã phát hành giữ nguyên chính sách tại thời điểm tạo." />
      <form onSubmit={submit} className="calm-surface overflow-hidden">
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="grace">Số ngày ân hạn</Label>
            <Input id="grace" type="number" min="0" max="90" value={lateFeeGraceDays} onChange={(event) => setLateFeeGraceDays(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Tỷ lệ phạt một lần (%)</Label>
            <Input id="rate" type="number" min="0" max="100" step=".01" value={lateFeeRate} onChange={(event) => setLateFeeRate(event.target.value)} required />
          </div>
        </div>
        <div className="m-6 mt-0 rounded-[20px] bg-accent p-5 text-accent-foreground">
          <p className="flex items-center gap-2 text-sm font-extrabold"><ReceiptText aria-hidden="true" className="size-4 text-primary" /> Xem trước chính sách</p>
          <p className="mt-3 text-lg font-black">Phạt {preview}đ</p>
          <p className="mt-1 flex items-center gap-2 text-sm opacity-75"><CalendarClock aria-hidden="true" className="size-4" /> Hóa đơn 3.000.000đ sau {lateFeeGraceDays || 0} ngày ân hạn.</p>
        </div>
        <div className="flex justify-end bg-muted/45 p-5">
          <Button disabled={saving}><Save aria-hidden="true" />{saving ? "Đang lưu..." : "Lưu chính sách"}</Button>
        </div>
      </form>
    </div>
  );
}
