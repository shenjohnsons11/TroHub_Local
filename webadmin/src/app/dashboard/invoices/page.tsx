"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Bell, CheckCircle, ChevronLeft, ChevronRight, Eye, Gauge, Loader2, Plus, ScanSearch, Search, Send, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatMeterReading, parseMeterReading, unformatNumber } from "@/lib/formatters";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useLanguage } from "@/components/language-provider";
import { InvoiceDetailDrawer } from "@/components/invoice-detail-drawer";
import { Skeleton } from "@/components/ui/skeleton";

const INVOICE_STEPS = [
  { label: "Chọn kỳ", icon: CalendarDays },
  { label: "Chốt điện/nước", icon: Gauge },
  { label: "Preview", icon: ScanSearch },
  { label: "Phát hành", icon: Send },
];

type InvoiceMeterField = "electricity" | "water";

const DEFAULT_ELECTRICITY_PRICE = 3500;
const DEFAULT_WATER_PRICE = 15000;

const utilityPriceOrDefault = (value: unknown, fallback: number) => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : fallback;
};

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Không thể đọc ảnh."));
  reader.onerror = () => reject(new Error("Không thể đọc ảnh."));
  reader.readAsDataURL(file);
});

export default function InvoicesPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const bulkFormRef = useRef<HTMLFormElement>(null);
  const meterImageInputRef = useRef<HTMLInputElement>(null);
  const pendingMeterRef = useRef<{ contractId: string; room: string; field: InvoiceMeterField } | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);
  const [manualMeter, setManualMeter] = useState<{ contractId: string; room: string; field: InvoiceMeterField } | null>(null);
  const [manualMeterValue, setManualMeterValue] = useState("");

  // Single invoice
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [singleRoomId, setSingleRoomId] = useState("");
  const [singlePeriod, setSinglePeriod] = useState(() => { const d = new Date(); return `${d.getMonth()+1}/${d.getFullYear()}`; });
  const [singleDueDate, setSingleDueDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [singleRooms, setSingleRooms] = useState<any[]>([]);
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Detail
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAddOpen) {
      fetchAPI("/invoices/bulk-preview").then(res => {
        if (res.success) {
          const mapped = res.data.map((p: any) => ({
            ...p,
            electricityOldInput: formatMeterReading(p.electricityOld),
            electricityNewInput: formatMeterReading(p.electricityDraft || p.electricityOld),
            electricityPrice: utilityPriceOrDefault(p.electricityPrice, DEFAULT_ELECTRICITY_PRICE),
            waterOldInput: formatMeterReading(p.waterOld),
            waterNewInput: formatMeterReading(p.waterDraft || p.waterOld),
            waterPrice: utilityPriceOrDefault(p.waterPrice, DEFAULT_WATER_PRICE),
            discountInput: "0",
            selected: true
          }));
          setBulkData(mapped);
        }
      });
      const d = new Date();
      setTitle(`Tháng ${d.getMonth() + 1}/${d.getFullYear()}`);
    }
  }, [isAddOpen]);

  const loadInvoices = async () => {
    try {
      const data = await fetchAPI("/invoices");
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    fetchAPI("/rooms").then(r => { if (r.success) setSingleRooms(r.data.filter((rm: any) => rm.status === 1)); }).catch(() => {});
  }, []);

  const handleCreateBulkInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedItems = bulkData.filter(x => x.selected);
      if (selectedItems.length === 0) throw new Error("Vui lòng chọn ít nhất 1 phòng để tạo hóa đơn");

      const payload = {
        invoices: selectedItems.map(item => ({
          contractId: item.contractId,
          room: item.room,
          tenant: item.tenant,
          electricityOld: parseMeterReading(item.electricityOldInput),
          electricityNew: parseMeterReading(item.electricityNewInput),
          electricityPrice: item.electricityPrice,
          waterOld: parseMeterReading(item.waterOldInput),
          waterNew: parseMeterReading(item.waterNewInput),
          waterPrice: item.waterPrice,
          roomAmount: item.roomAmount,
          services: item.services,
          parking: item.parking,
          internet: item.internet,
          garbage: item.garbage,
          discount: unformatNumber(item.discountInput)
        })),
        period: title,
        issuedAt,
      };
      if (payload.invoices.some((item: any) => item.electricityOld === null || item.electricityNew === null || item.waterOld === null || item.waterNew === null || item.electricityNew < item.electricityOld || item.waterNew < item.waterOld)) {
        throw new Error("Chỉ số điện nước kỳ này phải hợp lệ và không nhỏ hơn kỳ trước.");
      }
      await fetchAPI("/invoices/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notification.success("Tạo hóa đơn thành công.");
      setIsAddOpen(false);
      loadInvoices();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể tạo hóa đơn."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await fetchAPI(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Đã thanh toán" }),
      });
      notification.success("Đã xác nhận thu tiền.");
      loadInvoices();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể cập nhật hóa đơn."));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({
      title: "Xóa hóa đơn",
      message: "Bạn có chắc chắn muốn xóa hóa đơn này không?",
      confirmText: "Xóa",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await fetchAPI(`/invoices/${id}`, { method: "DELETE" });
      notification.success("Đã xóa hóa đơn.");
      loadInvoices();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể xóa hóa đơn."));
    }
  };

  const handleCreateSingleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleRoomId || !singlePeriod || !singleDueDate) { notification.error("Vui lòng điền đầy đủ thông tin!"); return; }
    setSingleSubmitting(true);
    try {
      await fetchAPI("/invoices", { method: "POST", body: JSON.stringify({ roomId: singleRoomId, period: singlePeriod, dueDate: singleDueDate, status: 1 }) });
      notification.success("Tạo hóa đơn lẻ thành công!");
      setIsSingleOpen(false);
      loadInvoices();
    } catch (err) {
      notification.error(getNotificationMessage(err, "Tạo hóa đơn thất bại."));
    } finally { setSingleSubmitting(false); }
  };

  const handleRemind = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRemindingId(invoiceId);
      await fetchAPI(`/invoices/${invoiceId}/remind`, { method: "POST" });
      notification.success("✅ Đã gửi thông báo nhắc nợ tới Khách thuê thành công!");
    } catch (err) {
      notification.error(getNotificationMessage(err, "Gửi nhắc nhở thất bại."));
    } finally {
      setRemindingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã thanh toán": return <Badge className="border-0 bg-primary/10 text-primary">Đã thanh toán</Badge>;
      case "Chưa thanh toán": return <Badge className="border-0 bg-[var(--warning-soft)] text-warning-foreground">Chưa thanh toán</Badge>;
      case "Quá hạn": return <Badge className="border-0 bg-destructive/10 text-destructive">Quá hạn</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(i => {
    const roomStr = i.contractId?.roomId?.roomCode || i.room || i.roomCode || "";
    return roomStr.toLowerCase().includes(searchTerm.toLowerCase());
  });
  const nextBulkStep = () => {
    if (!bulkFormRef.current?.reportValidity()) return;
    setBulkStep((current) => Math.min(4, current + 1));
  };

  const beginMeterCapture = (contractId: string, room: string, field: InvoiceMeterField) => {
    pendingMeterRef.current = { contractId, room, field };
    meterImageInputRef.current?.click();
  };

  const handleMeterImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = pendingMeterRef.current;
    pendingMeterRef.current = null;
    event.target.value = "";
    if (!file || !target) return;
    try {
      const image = await fileToDataUrl(file);
      const result = await fetchAPI("/ocr/meter", { method: "POST", body: JSON.stringify({ image }) });
      if (!result.data?.digits) throw new Error("Không đọc được chỉ số.");
      setBulkData((current) => current.map((item) => item.contractId === target.contractId
        ? { ...item, [target.field === "electricity" ? "electricityNewInput" : "waterNewInput"]: formatMeterReading(result.data.digits) }
        : item,
      ));
      notification.success(`Đã điền chỉ số ${target.field === "electricity" ? "điện" : "nước"} cho phòng ${target.room}.`);
    } catch {
      setManualMeter(target);
      setManualMeterValue("");
      notification.warning("Không thể đọc chỉ số từ ảnh. Vui lòng nhập tay.");
    }
  };

  const applyManualMeter = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualMeter || !manualMeterValue.trim()) return;
    setBulkData((current) => current.map((item) => item.contractId === manualMeter.contractId
      ? { ...item, [manualMeter.field === "electricity" ? "electricityNewInput" : "waterNewInput"]: formatMeterReading(manualMeterValue) }
      : item,
    ));
    setManualMeter(null);
    setManualMeterValue("");
  };

  return (
    <div className="space-y-6">
      <input ref={meterImageInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={handleMeterImage} tabIndex={-1} />
      <PageHeader eyebrow={t("finance")} title={t("invoices")} description={t("invoiceDescription")} />
      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t("searchRoom")}
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Single invoice */}
          <Dialog open={isSingleOpen} onOpenChange={setIsSingleOpen}>
            <DialogTrigger className="flex h-10 items-center gap-2 rounded-[16px] border border-border bg-card px-4 text-sm font-bold transition hover:bg-accent">
              <Plus className="size-4" /> Tạo đơn lẻ
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Tạo Hóa đơn lẻ</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateSingleInvoice} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="singleRoom">Chọn phòng *</Label>
                  <select id="singleRoom" value={singleRoomId} onChange={e => setSingleRoomId(e.target.value)} required
                    className="h-10 w-full rounded-[12px] border border-input bg-background px-3 text-sm">
                    <option value="">-- Chọn phòng --</option>
                    {singleRooms.map((r: any) => <option key={r._id} value={r._id}>{r.roomCode}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="singlePeriod">Kỳ thanh toán *</Label>
                  <Input id="singlePeriod" placeholder="VD: 7/2026" value={singlePeriod} onChange={e => setSinglePeriod(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="singleDue">Ngày hết hạn *</Label>
                  <Input id="singleDue" type="date" value={singleDueDate} onChange={e => setSingleDueDate(e.target.value)} required />
                </div>
                <button type="submit" disabled={singleSubmitting} className="flex h-10 w-full items-center justify-center gap-2 rounded-[16px] bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {singleSubmitting ? "Đang tạo..." : "Tạo hóa đơn"}
                </button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (open) setBulkStep(1); }}>
          <DialogTrigger className="flex h-10 items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Tạo hóa đơn mới
          </DialogTrigger>
          <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo hóa đơn hàng loạt</DialogTitle>
            </DialogHeader>
            <ol aria-label="Tiến trình tạo hóa đơn hàng loạt" className="mt-3 grid grid-cols-4 gap-2">
              {INVOICE_STEPS.map(({ label, icon: Icon }, index) => {
                const itemStep = index + 1;
                return <li key={label} aria-current={itemStep === bulkStep ? "step" : undefined} className={`rounded-[16px] p-3 text-center transition ${itemStep === bulkStep ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]" : itemStep < bulkStep ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="mx-auto size-5" /><span className="mt-1 block text-[11px] font-bold leading-tight sm:text-sm">{label}</span></li>;
              })}
            </ol>
            <form ref={bulkFormRef} onSubmit={handleCreateBulkInvoices} className="mt-5 space-y-5">
              {bulkStep === 1 && <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Kỳ thanh toán *</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="VD: Tháng 6/2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuedAt">Ngày phát hành *</Label>
                  <Input id="issuedAt" type="date" max={new Date().toLocaleDateString("en-CA")} value={issuedAt} onChange={e => setIssuedAt(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">Có thể chọn ngày quá khứ để demo trạng thái quá hạn.</p>
                </div>
              </div>}
              
              {bulkStep === 2 && <div className="calm-workbench">
                <Table>
                  <TableHeader className="bg-background">
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          aria-label="Chọn tất cả phòng"
                          type="checkbox" 
                          checked={bulkData.length > 0 && bulkData.every(x => x.selected)} 
                          onChange={e => setBulkData(bulkData.map(x => ({ ...x, selected: e.target.checked })))}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-semibold">Phòng</TableHead>
                      <TableHead className="whitespace-nowrap font-semibold">Số điện cũ</TableHead>
                      <TableHead className="whitespace-nowrap font-semibold">Số điện mới</TableHead>
                      <TableHead className="whitespace-nowrap font-semibold">Số nước cũ</TableHead>
                      <TableHead className="whitespace-nowrap font-semibold">Số nước mới</TableHead>
                      <TableHead className="whitespace-nowrap font-semibold text-right">Tổng (Dự kiến)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-4">Không có hợp đồng nào đang hiệu lực để tạo hóa đơn.</TableCell></TableRow>
                    ) : (
                      bulkData.map((item, index) => {
                        const eOld = parseMeterReading(item.electricityOldInput) ?? 0;
                        const eNew = parseMeterReading(item.electricityNewInput) ?? eOld;
                        const eUsage = Math.max(0, eNew - eOld);
                        const eAmt = Math.round(eUsage * (item.electricityPrice || 0));
                        const wOld = parseMeterReading(item.waterOldInput) ?? 0;
                        const wNew = parseMeterReading(item.waterNewInput) ?? wOld;
                        const wUsage = Math.max(0, wNew - wOld);
                        const wAmt = Math.round(wUsage * (item.waterPrice || 0));
                        const dsc = unformatNumber(item.discountInput);
                        const total = (item.roomAmount || 0) + eAmt + wAmt + (item.services || 0) + (item.parking || 0) + (item.internet || 0) + (item.garbage || 0) - dsc;
                        return (
                          <TableRow key={item.contractId} className={!item.selected ? "opacity-50" : ""}>
                            <TableCell>
                              <input 
                                aria-label={`Chọn phòng ${item.room}`}
                                type="checkbox" 
                                checked={item.selected} 
                                onChange={e => {
                                  const updated = [...bulkData];
                                  updated[index].selected = e.target.checked;
                                  setBulkData(updated);
                                }}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.room}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Input className="h-10 w-24 px-2 text-sm bg-card" inputMode="decimal" value={item.electricityOldInput} onChange={e => { const u=[...bulkData]; const value=e.target.value; u[index].electricityOldInput=parseMeterReading(value) === null ? value : formatMeterReading(value); setBulkData(u); }} />
                                <Button type="button" variant="outline" size="sm" className="h-11 whitespace-nowrap px-2 text-xs" aria-label={`Chụp ảnh đồng hồ điện phòng ${item.room}`} onClick={() => beginMeterCapture(item.contractId, item.room, "electricity")}>📷 Chụp ảnh</Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input className="h-10 w-24 px-2 text-sm bg-card" inputMode="decimal" value={item.electricityNewInput} onChange={e => { const u=[...bulkData]; const value=e.target.value; u[index].electricityNewInput=parseMeterReading(value) === null ? value : formatMeterReading(value); setBulkData(u); }} />
                              <Label className="mt-1 block text-[10px] text-muted-foreground" htmlFor={`electricity-price-${item.contractId}`}>Đơn giá · {formatCurrency(item.electricityPrice)}</Label>
                              <Input id={`electricity-price-${item.contractId}`} className="mt-1 h-10 w-24 px-2 text-xs bg-card" inputMode="numeric" value={item.electricityPrice} onChange={e => { const u=[...bulkData]; u[index].electricityPrice=utilityPriceOrDefault(unformatNumber(e.target.value), DEFAULT_ELECTRICITY_PRICE); setBulkData(u); }} aria-label={`Đơn giá điện phòng ${item.room}`} />
                              <p className="mt-1 text-[10px] font-semibold text-primary">{formatMeterReading(eUsage)} kWh · {formatCurrency(eAmt)}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Input className="h-10 w-24 px-2 text-sm bg-card" inputMode="decimal" value={item.waterOldInput} onChange={e => { const u=[...bulkData]; const value=e.target.value; u[index].waterOldInput=parseMeterReading(value) === null ? value : formatMeterReading(value); setBulkData(u); }} />
                                <Button type="button" variant="outline" size="sm" className="h-11 whitespace-nowrap px-2 text-xs" aria-label={`Chụp ảnh đồng hồ nước phòng ${item.room}`} onClick={() => beginMeterCapture(item.contractId, item.room, "water")}>📷 Chụp ảnh</Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input className="h-10 w-24 px-2 text-sm bg-card" inputMode="decimal" value={item.waterNewInput} onChange={e => { const u=[...bulkData]; const value=e.target.value; u[index].waterNewInput=parseMeterReading(value) === null ? value : formatMeterReading(value); setBulkData(u); }} />
                              <Label className="mt-1 block text-[10px] text-muted-foreground" htmlFor={`water-price-${item.contractId}`}>Đơn giá · {formatCurrency(item.waterPrice)}</Label>
                              <Input id={`water-price-${item.contractId}`} className="mt-1 h-10 w-24 px-2 text-xs bg-card" inputMode="numeric" value={item.waterPrice} onChange={e => { const u=[...bulkData]; u[index].waterPrice=utilityPriceOrDefault(unformatNumber(e.target.value), DEFAULT_WATER_PRICE); setBulkData(u); }} aria-label={`Đơn giá nước phòng ${item.room}`} />
                              <p className="mt-1 text-[10px] font-semibold text-primary">{formatMeterReading(wUsage)} m³ · {formatCurrency(wAmt)}</p>
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">{formatCurrency(total)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>}
              {bulkStep === 3 && <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[20px] bg-primary/10 p-5"><p className="text-sm text-muted-foreground">Kỳ thanh toán</p><p className="mt-1 text-xl font-black">{title}</p></div>
                <div className="rounded-[20px] bg-muted p-5"><p className="text-sm text-muted-foreground">Ngày phát hành</p><p className="mt-1 text-xl font-black">{new Date(issuedAt).toLocaleDateString("vi-VN")}</p></div>
                <div className="rounded-[20px] bg-[var(--warning-soft)] p-5"><p className="text-sm text-muted-foreground">Hóa đơn đã chọn</p><p className="mt-1 text-3xl font-black">{bulkData.filter((item) => item.selected).length}</p></div>
              </div>}
              {bulkStep === 4 && <div className="calm-surface bg-primary/8 p-6 text-center"><Send className="mx-auto size-9 text-primary" /><h3 className="mt-3 text-xl font-black">Sẵn sàng phát hành</h3><p className="mt-1 text-muted-foreground">{bulkData.filter((item) => item.selected).length} hóa đơn cho {title}</p></div>}
              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" disabled={bulkStep === 1} onClick={() => setBulkStep((current) => Math.max(1, current - 1))}><ChevronLeft className="size-4" />Quay lại</Button>
                {bulkStep < 4
                  ? <Button type="button" onClick={nextBulkStep}>Tiếp tục<ChevronRight className="size-4" /></Button>
                  : <Button type="submit" disabled={isSubmitting}><Send className="size-4" />{isSubmitting ? "Đang xử lý..." : `Phát hành ${bulkData.filter((item) => item.selected).length} hóa đơn`}</Button>}
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </section>

      <div className="calm-workbench">
        <Table>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="font-semibold text-foreground">Mã HD</TableHead>
              <TableHead className="font-semibold text-foreground">Kỳ thanh toán</TableHead>
              <TableHead className="font-semibold text-foreground">Phòng</TableHead>
              <TableHead className="font-semibold text-foreground">Tổng tiền</TableHead>
              <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="p-4"><div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div></TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-left" /><p className="mt-3 font-black">Không tìm thấy hóa đơn nào</p></TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map(invoice => (
                <TableRow key={invoice._id || invoice.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setDetailInvoice(invoice)}>
                  <TableCell className="font-medium text-foreground">
                    {invoice.invoiceCode}
                  </TableCell>
                  <TableCell>{invoice.period}</TableCell>
                  <TableCell><span className="font-semibold">{invoice.roomCode || "N/A"}</span><span className="block text-xs text-muted-foreground">{invoice.nguoiThue || "Chưa cập nhật"}</span></TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.statusLabel)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button aria-label="Xem chi tiết hóa đơn" onClick={e => { e.stopPropagation(); setDetailInvoice(invoice); }} variant="ghost" size="icon" title="Xem chi tiết" className="text-muted-foreground hover:text-foreground">
                        <Eye className="size-4" />
                      </Button>
                      {invoice.statusLabel !== "Đã thanh toán" && invoice.statusLabel !== "Đã gộp quyết toán" && (
                        <>
                          <Button
                            aria-label="Gửi nhắc thanh toán"
                            disabled={remindingId === (invoice._id || invoice.id)}
                            onClick={e => handleRemind(invoice._id || invoice.id, e)}
                            variant="ghost"
                            size="icon"
                            title="Gửi nhắc thanh toán"
                            className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          >
                            {remindingId === (invoice._id || invoice.id) ? (
                              <Loader2 className="size-4 animate-spin text-amber-600" />
                            ) : (
                              <Bell className="size-4" />
                            )}
                          </Button>
                          <Button aria-label="Đánh dấu hóa đơn đã thu" onClick={e => { e.stopPropagation(); handleMarkPaid(invoice._id || invoice.id); }} variant="ghost" size="icon" title="Đánh dấu đã thu" className="text-primary hover:bg-primary/10 hover:text-primary">
                            <CheckCircle className="size-4" />
                          </Button>
                        </>
                      )}
                      <Button aria-label="Xóa hóa đơn" onClick={e => { e.stopPropagation(); handleDelete(invoice._id || invoice.id); }} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(manualMeter)} onOpenChange={(open) => { if (!open) setManualMeter(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nhập chỉ số · Phòng {manualMeter?.room}</DialogTitle></DialogHeader>
          <form onSubmit={applyManualMeter} className="space-y-4">
            <p className="text-sm text-muted-foreground">Không thể đọc chỉ số từ ảnh. Nhập số {manualMeter?.field === "electricity" ? "điện" : "nước"} để điền vào chỉ số mới của phòng này.</p>
            <Input autoFocus inputMode="decimal" aria-label={`Chỉ số ${manualMeter?.field === "electricity" ? "điện" : "nước"} mới phòng ${manualMeter?.room || ""}`} value={manualMeterValue} onChange={(event) => { const value = event.target.value; setManualMeterValue(parseMeterReading(value) === null ? value : formatMeterReading(value)); }} placeholder="Nhập chỉ số" required />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setManualMeter(null)}>Hủy</Button><Button type="submit">Áp dụng</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <InvoiceDetailDrawer invoice={detailInvoice} onClose={() => setDetailInvoice(null)} />
    </div>
  );
}
