"use client";

import { useEffect, useState } from "react";
import { Flashlight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI } from "@/lib/api";
import type { BillingAutomationPolicy } from "@/lib/dashboard";
import { useNotification } from "@/hooks/use-notification";

const DEFAULTS: BillingAutomationPolicy = { autoInvoiceEnabled: false, invoiceDay: 25, dueDay: 5, autoRemindEnabled: true, remindDaysBeforeDue: 2 };

export function AutomationStatusCard({ initialPolicy, compact = false }: { initialPolicy?: BillingAutomationPolicy; compact?: boolean }) {
  const notification = useNotification();
  const [policy, setPolicy] = useState(initialPolicy || DEFAULTS);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (initialPolicy) setPolicy(initialPolicy); else void fetchAPI("/settings/billing-policy").then((response) => setPolicy({ ...DEFAULTS, ...response.data })).catch(() => undefined); }, [initialPolicy]);
  const save = async () => {
    if ([policy.invoiceDay, policy.dueDay, policy.remindDaysBeforeDue].some((day) => day < 1 || day > 31)) return notification.warning("Ngày cấu hình phải nằm trong khoảng 1–31.");
    try { setSaving(true); const response = await fetchAPI("/settings/billing-policy", { method: "PUT", body: JSON.stringify(policy) }); setPolicy({ ...policy, ...response.data }); setOpen(false); notification.success("Đã cập nhật tự động hóa hóa đơn."); } catch { notification.error("Không thể lưu cấu hình."); } finally { setSaving(false); }
  };
  const reminderDay = policy.invoiceDay === 1 ? "ngày cuối tháng trước" : `ngày ${policy.invoiceDay - 1}`;
  return <>
    <button type="button" onClick={() => setOpen(true)} className={`flex w-full items-center gap-4 rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${policy.autoInvoiceEnabled ? "border-primary/30 bg-primary/8" : "border-border bg-card"} ${compact ? "min-h-20" : "min-h-24"}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${policy.autoInvoiceEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Flashlight className="size-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-black uppercase tracking-wider">Tự động hóa: {policy.autoInvoiceEnabled ? "Đang bật" : "Đang tắt"}</span><span className="mt-1 block text-sm text-muted-foreground">{policy.autoInvoiceEnabled ? `Nhắc quét ${reminderDay} · Phát hành 07:00 ngày ${policy.invoiceDay}` : "Bật tự động xuất hóa đơn hàng tháng để tiết kiệm thời gian chốt số."}</span></span>
      <span className="hidden items-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-xs font-black text-primary sm:flex"><Settings2 className="size-4" />{policy.autoInvoiceEnabled ? "Đổi ngày chốt" : "Kích hoạt"}</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Tự động hóa hóa đơn</DialogTitle></DialogHeader><div className="flex items-center justify-between rounded-xl bg-muted p-4"><div><p className="font-black">Tự động phát hành</p><p className="text-xs text-muted-foreground">Nhắc N-1, xuất lúc 07:00 ngày chốt</p></div><button type="button" role="switch" aria-checked={policy.autoInvoiceEnabled} onClick={() => setPolicy({ ...policy, autoInvoiceEnabled: !policy.autoInvoiceEnabled })} className={`h-7 w-12 rounded-full p-1 ${policy.autoInvoiceEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}><span className={`block size-5 rounded-full bg-white transition-transform ${policy.autoInvoiceEnabled ? "translate-x-5" : ""}`} /></button></div><div className="grid grid-cols-3 gap-3">{([['invoiceDay','Ngày chốt'],['dueDay','Hạn nộp'],['remindDaysBeforeDue','Nhắc trước']] as const).map(([field, label]) => <div key={field} className="space-y-2"><Label htmlFor={field}>{label}</Label><Input id={field} type="number" min="1" max="31" value={policy[field]} onChange={(event) => setPolicy({ ...policy, [field]: Number(event.target.value) })} /></div>)}</div><DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Hủy</Button><Button disabled={saving} onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu cấu hình"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
