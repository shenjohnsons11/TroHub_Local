"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, CheckCircle, BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { parseFormattedNumber } from "@/lib/utils";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function InvoicesPage() {
  const notification = useNotification();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAddOpen) {
      fetchAPI("/invoices/bulk-preview").then(res => {
        if (res.success) {
          const mapped = res.data.map((p: any) => ({
            ...p,
            electricityOldInput: p.electricityOld?.toString() || "0",
            electricityNewInput: p.electricityDraft || p.electricityOld?.toString() || "0",
            waterOldInput: p.waterOld?.toString() || "0",
            waterNewInput: p.waterDraft || p.waterOld?.toString() || "0",
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
          electricityOld: Number(item.electricityOldInput),
          electricityNew: Number(item.electricityNewInput),
          electricityPrice: item.electricityPrice,
          waterOld: Number(item.waterOldInput),
          waterNew: Number(item.waterNewInput),
          waterPrice: item.waterPrice,
          roomAmount: item.roomAmount,
          services: item.services,
          parking: item.parking,
          internet: item.internet,
          garbage: item.garbage,
          discount: parseFormattedNumber(item.discountInput)
        })),
        period: title,
        issuedAt,
      };
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

  const handleRemind = async (id: string) => {
    try {
      const response = await fetchAPI(`/invoices/${id}/remind`, { method: "PUT" });
      const sent = response.data?.delivery?.sent || 0;
      notification.success(`Đã lưu thông báo và gửi push tới ${sent} thiết bị.`);
      await loadInvoices();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể gửi nhắc thanh toán."));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã thanh toán": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đã thanh toán</Badge>;
      case "Chưa thanh toán": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Chưa thanh toán</Badge>;
      case "Quá hạn": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Quá hạn</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(i => {
    const roomStr = i.contractId?.roomId?.roomCode || i.room || i.roomCode || "";
    return roomStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo mã phòng..." 
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className="bg-[#f37021] hover:bg-[#e85f12] text-white flex items-center h-10 px-4 rounded-md font-medium text-sm">
            <Plus className="w-4 h-4 mr-2" /> Tạo hóa đơn mới
          </DialogTrigger>
          <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo hóa đơn hàng loạt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Kỳ thanh toán *</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="VD: Tháng 6/2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuedAt">Ngày phát hành *</Label>
                  <Input id="issuedAt" type="date" max={new Date().toLocaleDateString("en-CA")} value={issuedAt} onChange={e => setIssuedAt(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">Có thể chọn ngày quá khứ để demo trạng thái quá hạn.</p>
                </div>
              </div>
              
              <div className="border rounded-md overflow-x-auto bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          checked={bulkData.length > 0 && bulkData.every(x => x.selected)} 
                          onChange={e => setBulkData(bulkData.map(x => ({ ...x, selected: e.target.checked })))}
                          className="rounded border-slate-300 text-[#f37021] focus:ring-[#f37021]"
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
                        const eOld = Number(item.electricityOldInput) || 0;
                        const eNew = Number(item.electricityNewInput) || 0;
                        const eAmt = Math.max(0, eNew - eOld) * (item.electricityPrice || 0);
                        const wOld = Number(item.waterOldInput) || 0;
                        const wNew = Number(item.waterNewInput) || 0;
                        const wAmt = Math.max(0, wNew - wOld) * (item.waterPrice || 0);
                        const dsc = parseFormattedNumber(item.discountInput) || 0;
                        const total = (item.roomAmount || 0) + eAmt + wAmt + (item.services || 0) + (item.parking || 0) + (item.internet || 0) + (item.garbage || 0) - dsc;
                        return (
                          <TableRow key={item.contractId} className={!item.selected ? "opacity-50" : ""}>
                            <TableCell>
                              <input 
                                type="checkbox" 
                                checked={item.selected} 
                                onChange={e => {
                                  const updated = [...bulkData];
                                  updated[index].selected = e.target.checked;
                                  setBulkData(updated);
                                }}
                                className="rounded border-slate-300 text-[#f37021] focus:ring-[#f37021]"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.room}</TableCell>
                            <TableCell><Input className="w-20 h-8 px-2 text-sm bg-white" type="number" value={item.electricityOldInput} onChange={e => { const u=[...bulkData]; u[index].electricityOldInput=e.target.value; setBulkData(u); }} /></TableCell>
                            <TableCell>
                              <Input className="w-20 h-8 px-2 text-sm bg-white" type="number" value={item.electricityNewInput} onChange={e => { const u=[...bulkData]; u[index].electricityNewInput=e.target.value; setBulkData(u); }} />
                              {!item.electricityPrice && <span className="text-[10px] text-red-500 block">Thiếu giá Điện</span>}
                            </TableCell>
                            <TableCell><Input className="w-20 h-8 px-2 text-sm bg-white" type="number" value={item.waterOldInput} onChange={e => { const u=[...bulkData]; u[index].waterOldInput=e.target.value; setBulkData(u); }} /></TableCell>
                            <TableCell>
                              <Input className="w-20 h-8 px-2 text-sm bg-white" type="number" value={item.waterNewInput} onChange={e => { const u=[...bulkData]; u[index].waterNewInput=e.target.value; setBulkData(u); }} />
                              {!item.waterPrice && <span className="text-[10px] text-red-500 block">Thiếu giá Nước</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700">{total.toLocaleString("vi-VN")} đ</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleCreateBulkInvoices} disabled={isSubmitting} className="w-full bg-[#f37021] hover:bg-[#e85f12]">
                {isSubmitting ? "Đang xử lý..." : `Tạo ${bulkData.filter(x => x.selected).length} hóa đơn`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Mã HD</TableHead>
              <TableHead className="font-semibold text-slate-800">Kỳ thanh toán</TableHead>
              <TableHead className="font-semibold text-slate-800">Phòng</TableHead>
              <TableHead className="font-semibold text-slate-800">Tổng tiền</TableHead>
              <TableHead className="font-semibold text-slate-800">Trạng thái</TableHead>
              <TableHead className="text-right font-semibold text-slate-800">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Không tìm thấy hóa đơn nào</TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map(invoice => (
                <TableRow key={invoice._id || invoice.id}>
                  <TableCell className="font-medium text-slate-900">{invoice.id?.substring(0, 8) || "HD"}</TableCell>
                  <TableCell>{invoice.title}</TableCell>
                  <TableCell>{invoice.roomCode}</TableCell>
                  <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.status !== "Đã thanh toán" && (
                        <>
                          <Button onClick={() => handleRemind(invoice._id || invoice.id)} variant="outline" size="sm" className="h-8">
                            <BellRing className="mr-1.5 h-3.5 w-3.5" /> Gửi nhắc thanh toán
                          </Button>
                          <Button onClick={() => handleMarkPaid(invoice._id || invoice.id)} variant="ghost" size="icon" title="Đánh dấu đã thu" className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button onClick={() => handleDelete(invoice._id || invoice.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
