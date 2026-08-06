"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { getNotificationMessage } from "@/lib/notification-messages";

const parseDays = (value: string) => [...new Set(
  value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite),
)].sort((a, b) => a - b);

export default function BillingPolicyPage() {
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
      setLateFeeGraceDays(String(data.lateFeeGraceDays));
      setLateFeeRate(String(data.lateFeeRate));
      setAutomaticRemindersEnabled(data.automaticRemindersEnabled !== false);
      setRemindBeforeDueDays((data.remindBeforeDueDays || [3]).join(", "));
      setRemindOnDueDate(data.remindOnDueDate !== false);
      setRemindAfterOverdueDays((data.remindAfterOverdueDays || [1]).join(", "));
    }).catch((error) => notification.error(getNotificationMessage(error)));
  }, [notification]);

  const preview = useMemo(
    () => formatCurrency(Math.round(3000000 * Number(lateFeeRate || 0) / 100)),
    [lateFeeRate],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const before = parseDays(remindBeforeDueDays);
    const after = parseDays(remindAfterOverdueDays);
    if ([...before, ...after].some((day) => !Number.isInteger(day) || day < 1 || day > 90)) {
      notification.warning("Ngày nhắc phải là số nguyên từ 1 đến 90.");
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
      notification.success("Đã lưu chính sách hóa đơn và lịch nhắc.");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu chính sách hóa đơn."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-bold text-primary">Cài đặt hóa đơn</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.025em]">Chính sách và lịch nhắc</h1>
        <p className="mt-2 text-muted-foreground">Điều chỉnh tiền phạt và thời điểm nhắc Người thuê thanh toán.</p>
      </header>
      <form onSubmit={submit} className="space-y-7 border border-border bg-card p-6">
        <section className="space-y-4">
          <h2 className="text-base font-black">Tiền phạt quá hạn</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="grace">Số ngày ân hạn</Label><Input id="grace" type="number" min="0" max="90" value={lateFeeGraceDays} onChange={(e) => setLateFeeGraceDays(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="rate">Tỷ lệ phạt một lần (%)</Label><Input id="rate" type="number" min="0" max="100" step=".01" value={lateFeeRate} onChange={(e) => setLateFeeRate(e.target.value)} required /></div>
          </div>
          <div className="bg-primary/8 p-4 text-sm"><p className="font-bold">Xem trước</p><p className="mt-1 text-muted-foreground">Hóa đơn 3.000.000đ sẽ phạt {preview}đ sau {lateFeeGraceDays || 0} ngày ân hạn.</p></div>
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <label className="flex min-h-11 items-center justify-between gap-4">
            <span><span className="block font-black">Nhắc thanh toán tự động</span><span className="text-sm text-muted-foreground">Thông báo được lưu trong app và gửi push.</span></span>
            <input type="checkbox" checked={automaticRemindersEnabled} onChange={(e) => setAutomaticRemindersEnabled(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="before">Nhắc trước hạn (ngày)</Label><Input id="before" value={remindBeforeDueDays} onChange={(e) => setRemindBeforeDueDays(e.target.value)} placeholder="3, 7" disabled={!automaticRemindersEnabled} /><p className="text-xs text-muted-foreground">Phân cách nhiều mốc bằng dấu phẩy.</p></div>
            <div className="space-y-2"><Label htmlFor="after">Nhắc sau quá hạn (ngày)</Label><Input id="after" value={remindAfterOverdueDays} onChange={(e) => setRemindAfterOverdueDays(e.target.value)} placeholder="1, 3" disabled={!automaticRemindersEnabled} /></div>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={remindOnDueDate} onChange={(e) => setRemindOnDueDate(e.target.checked)} disabled={!automaticRemindersEnabled} className="h-5 w-5 accent-primary" />Gửi thông báo đúng ngày đến hạn</label>
        </section>
        <Button disabled={saving}>{saving ? "Đang lưu..." : "Lưu chính sách"}</Button>
      </form>
    </div>
  );
}
