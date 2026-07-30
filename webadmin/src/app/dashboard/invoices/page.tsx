"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Bell, CheckCircle, ChevronLeft, ChevronRight, Eye, FileText, Gauge, Plus, Printer, ScanSearch, Search, Send, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatNumberInput, unformatNumber } from "@/lib/formatters";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";
import { addWebNotification } from "@/components/notification-bell";

const INVOICE_STEPS = [
  { label: "Chọn kỳ", icon: CalendarDays },
  { label: "Chốt điện/nước", icon: Gauge },
  { label: "Preview", icon: ScanSearch },
  { label: "Phát hành", icon: Send },
];

export default function InvoicesPage() {
  const notification = useNotification();
  const bulkFormRef = useRef<HTMLFormElement>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);

  // Single invoice
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [singleRoomId, setSingleRoomId] = useState("");
  const [singlePeriod, setSinglePeriod] = useState(() => { const d = new Date(); return `${d.getMonth()+1}/${d.getFullYear()}`; });
  const [singleDueDate, setSingleDueDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [singleRooms, setSingleRooms] = useState<any[]>([]);
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Detail
  const [detailInvoice, setDetailInvoice] = useState<any>(null);

  useEffect(() => {
    if (isAddOpen) {
      fetchAPI("/invoices/bulk-preview").then(res => {
        if (res.success) {
          const mapped = res.data.map((p: any) => ({
            ...p,
            electricityOldInput: formatNumberInput(p.electricityOld),
            electricityNewInput: formatNumberInput(p.electricityDraft || p.electricityOld),
            waterOldInput: formatNumberInput(p.waterOld),
            waterNewInput: formatNumberInput(p.waterDraft || p.waterOld),
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
          electricityOld: unformatNumber(item.electricityOldInput),
          electricityNew: unformatNumber(item.electricityNewInput),
          electricityPrice: item.electricityPrice,
          waterOld: unformatNumber(item.waterOldInput),
          waterNew: unformatNumber(item.waterNewInput),
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
      await fetchAPI("/invoices/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notification.success("Tạo hóa đơn thành công.");
      addWebNotification("invoice", "Phát hành hóa đơn", `Đã tạo ${selectedItems.length} hóa đơn cho kỳ ${title}`);
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
      addWebNotification("invoice", "Tạo hóa đơn", `Đã tạo hóa đơn lẻ cho kỳ ${singlePeriod}`);
      setIsSingleOpen(false);
      loadInvoices();
    } catch (err) {
      notification.error(getNotificationMessage(err, "Tạo hóa đơn thất bại."));
    } finally { setSingleSubmitting(false); }
  };

  const handleRemind = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetchAPI(`/invoices/${invoiceId}/remind`, { method: "POST" });
      notification.success("Đã gửi nhắc nhở thành công!");
    } catch (err) {
      notification.error(getNotificationMessage(err, "Gửi nhắc nhở thất bại."));
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

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tài chính" title="Hóa đơn" description="Lập hóa đơn, kiểm tra chỉ số và theo dõi trạng thái thanh toán." />
      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo mã phòng..." 
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
                        const eOld = unformatNumber(item.electricityOldInput);
                        const eNew = unformatNumber(item.electricityNewInput);
                        const eAmt = Math.max(0, eNew - eOld) * (item.electricityPrice || 0);
                        const wOld = unformatNumber(item.waterOldInput);
                        const wNew = unformatNumber(item.waterNewInput);
                        const wAmt = Math.max(0, wNew - wOld) * (item.waterPrice || 0);
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
                            <TableCell><Input className="w-20 h-8 px-2 text-sm bg-card" inputMode="numeric" value={item.electricityOldInput} onChange={e => { const u=[...bulkData]; u[index].electricityOldInput=formatNumberInput(e.target.value); setBulkData(u); }} /></TableCell>
                            <TableCell>
                              <Input className="w-20 h-8 px-2 text-sm bg-card" inputMode="numeric" value={item.electricityNewInput} onChange={e => { const u=[...bulkData]; u[index].electricityNewInput=formatNumberInput(e.target.value); setBulkData(u); }} />
                              {!item.electricityPrice && <span className="block text-[10px] text-destructive">Thiếu giá Điện</span>}
                            </TableCell>
                            <TableCell><Input className="w-20 h-8 px-2 text-sm bg-card" inputMode="numeric" value={item.waterOldInput} onChange={e => { const u=[...bulkData]; u[index].waterOldInput=formatNumberInput(e.target.value); setBulkData(u); }} /></TableCell>
                            <TableCell>
                              <Input className="w-20 h-8 px-2 text-sm bg-card" inputMode="numeric" value={item.waterNewInput} onChange={e => { const u=[...bulkData]; u[index].waterNewInput=formatNumberInput(e.target.value); setBulkData(u); }} />
                              {!item.waterPrice && <span className="block text-[10px] text-destructive">Thiếu giá Nước</span>}
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
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground"><FileText className="mx-auto mb-2 size-8 animate-pulse text-primary" />Đang tải hóa đơn…</TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-left" /><p className="mt-3 font-black">Không tìm thấy hóa đơn nào</p></TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map(invoice => (
                <TableRow key={invoice._id || invoice.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setDetailInvoice(invoice)}>
                  <TableCell className="font-medium text-foreground">
                    {`HD-${(invoice.period || "").replace("/", "")}-${(invoice._id || invoice.id || "000").substring(0, 3).toUpperCase()}`}
                  </TableCell>
                  <TableCell>{invoice.period}</TableCell>
                  <TableCell>{invoice.room || invoice.contractId?.roomId?.roomCode || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button aria-label="Xem chi tiết hóa đơn" onClick={e => { e.stopPropagation(); setDetailInvoice(invoice); }} variant="ghost" size="icon" title="Xem chi tiết" className="text-muted-foreground hover:text-foreground">
                        <Eye className="size-4" />
                      </Button>
                      {invoice.status !== "Đã thanh toán" && (
                        <>
                          <Button aria-label="Nhắc nhở thanh toán" onClick={e => handleRemind(invoice._id || invoice.id, e)} variant="ghost" size="icon" title="Nhắc nợ" className="text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                            <Bell className="size-4" />
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

      {/* Invoice Detail Modal */}
      <Dialog open={!!detailInvoice} onOpenChange={open => { if (!open) setDetailInvoice(null); }}>
        <DialogContent className="max-w-lg print:shadow-none">
          <div id="invoice-print-area">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Chi tiết Hóa đơn</DialogTitle>
            </DialogHeader>
            {detailInvoice && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mã hóa đơn</p>
                    <p className="font-black">{`HD-${(detailInvoice.period || "").replace("/", "")}-${(detailInvoice._id || "000").substring(0, 3).toUpperCase()}`}</p>
                  </div>
                  {getStatusBadge(detailInvoice.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[16px] bg-muted p-4 text-sm">
                  <div><p className="text-muted-foreground">Phòng</p><p className="font-bold">{detailInvoice.room || detailInvoice.contractId?.roomId?.roomCode || "N/A"}</p></div>
                  <div><p className="text-muted-foreground">Kỳ thanh toán</p><p className="font-bold">{detailInvoice.period || "-"}</p></div>
                  <div><p className="text-muted-foreground">Tiền thuê</p><p className="font-bold">{formatCurrency(detailInvoice.rent)}</p></div>
                  <div><p className="text-muted-foreground">Điện</p><p className="font-bold">{formatCurrency(detailInvoice.electricity)}</p></div>
                  <div><p className="text-muted-foreground">Nước</p><p className="font-bold">{formatCurrency(detailInvoice.water)}</p></div>
                  <div><p className="text-muted-foreground">Dịch vụ khác</p><p className="font-bold">{formatCurrency(detailInvoice.services)}</p></div>
                </div>
                <div className="flex items-center justify-between rounded-[16px] bg-primary/10 px-5 py-4">
                  <p className="font-black text-foreground">Tổng cộng</p>
                  <p className="text-2xl font-black text-primary">{formatCurrency(detailInvoice.totalAmount)}</p>
                </div>
                <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-border bg-card py-2.5 text-sm font-bold transition hover:bg-accent">
                  <Printer className="size-4" /> In hóa đơn
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
