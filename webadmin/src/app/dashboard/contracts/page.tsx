"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Edit, FileSignature, Plus, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrencyInput, parseFormattedNumber } from "@/lib/utils";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatPhone } from "@/lib/formatters";
import { PageHeader } from "@/components/calm-ops/page-header";
import { addWebNotification } from "@/components/notification-bell";

export default function ContractsPage() {
  const notification = useNotification();
  const [contracts, setContracts] = useState<any[]>([]);
  const [draftContracts, setDraftContracts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutContractId, setCheckoutContractId] = useState("");
  const [finalElectricity, setFinalElectricity] = useState("");
  const [finalWater, setFinalWater] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editContractId, setEditContractId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [initialElectricity, setInitialElectricity] = useState("");
  const [initialWater, setInitialWater] = useState("");
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<{serviceId: string, fixedPrice: string}[]>([]);

  const computedStatus = (() => {
    if (!startDate) return "Đang hiệu lực";
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start > today ? "Chờ hiệu lực" : "Đang hiệu lực";
  })();

  const loadData = async () => {
    try {
      const [contractsData, roomsData, tenantsData, servicesData] = await Promise.all([
        fetchAPI("/contracts"),
        fetchAPI("/rooms"),
        fetchAPI("/tenants"),
        fetchAPI("/services")
      ]);
      
      if (contractsData.success) setContracts(contractsData.data);
      if (roomsData.success) setRooms(roomsData.data);
      if (tenantsData.success) setTenants(tenantsData.data);
      if (servicesData.success) setAvailableServices(servicesData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    try {
      const drafts = JSON.parse(localStorage.getItem("@trohub_draft_contracts") || "[]");
      setDraftContracts(Array.isArray(drafts) ? drafts : []);
    } catch (e) {
      console.error("Failed to load drafts", e);
    }
  }, []);

  const handleDeleteDraft = (id: string) => {
    const newDrafts = draftContracts.filter(d => d.id !== id);
    setDraftContracts(newDrafts);
    localStorage.setItem("@trohub_draft_contracts", JSON.stringify(newDrafts));
  };

  const openCheckoutModal = (id: string) => {
    setCheckoutContractId(id);
    setFinalElectricity("");
    setFinalWater("");
    setDeductionAmount("");
    setCheckoutNote("");
    setCheckoutModalOpen(true);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchAPI(`/contracts/${checkoutContractId}/checkout`, {
        method: "PUT",
        body: JSON.stringify({
          finalElectricity: Number(finalElectricity),
          finalWater: Number(finalWater),
          deductionAmount: parseFormattedNumber(deductionAmount),
          note: checkoutNote
        })
      });
      notification.success("Đã duyệt trả phòng thành công.");
      setCheckoutModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      notification.success("Đã duyệt trả phòng thành công.");
      setCheckoutModalOpen(false);
      await loadData();
    }
  };

  const openEditModal = (contract: any) => {
    setEditContractId(contract._id || contract.id);
    setRoomId(contract.roomId?._id || contract.roomId?.id || contract.roomId);
    setTenantId(contract.tenantId?._id || contract.tenantId?.id || contract.tenantId);
    setStartDate(contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "");
    setEndDate(contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "");
    setRent(formatCurrencyInput(contract.fixedRentPrice?.toString() || "0"));
    setDeposit(formatCurrencyInput(contract.fixedDeposit?.toString() || "0"));

    const room = rooms.find(item => (item._id || item.id) === (contract.roomId?._id || contract.roomId?.id || contract.roomId));
    setInitialElectricity(room?.draftElectricity?.toString() || "");
    setInitialWater(room?.draftWater?.toString() || "");

    const preselectedServices = (contract.services || []).map((s: any) => ({
      serviceId: s.serviceId?._id || s.serviceId?.id || s.serviceId,
      fixedPrice: formatCurrencyInput(s.fixedPrice?.toString() || "0")
    }));
    setSelectedServices(preselectedServices);
    setIsAddOpen(true);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedRoom = rooms.find(r => (r._id || r.id) === roomId);
      const selectedTenant = tenants.find(t => (t._id || t.id) === tenantId);
      
      if (!selectedRoom) throw new Error("Vui lòng chọn phòng");
      if (!selectedTenant) throw new Error("Vui lòng chọn người thuê");
      const payload = { 
        roomId: selectedRoom._id || selectedRoom.id, 
        tenantId: selectedTenant._id || selectedTenant.id, 
        startDate,
        endDate,
        fixedRentPrice: parseFormattedNumber(rent),
        fixedDeposit: parseFormattedNumber(deposit),
        services: selectedServices.map(s => ({
          serviceId: s.serviceId,
          fixedPrice: parseFormattedNumber(s.fixedPrice)
        })),
        initialElectricity: initialElectricity ? Number(initialElectricity) : undefined,
        initialWater: initialWater ? Number(initialWater) : undefined,
        status: computedStatus === "Đang hiệu lực" ? 1 : 0 // 0 means waiting/pending
      };
      
      const endpoint = editContractId ? `/contracts/${editContractId}` : "/contracts";
      const method = editContractId ? "PUT" : "POST";

      await fetchAPI(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      setIsAddOpen(false);
      notification.success("Đã cập nhật hợp đồng.");
      addWebNotification("contract", "Hợp đồng mới", "Vừa tạo hoặc cập nhật 1 hợp đồng.");
      loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể lưu hợp đồng."));
    }
  };

  const handleConfirmContract = async (id: string) => {
    const confirmed = await notification.confirm({ title: "Duyệt hợp đồng", message: "Xác nhận duyệt hợp đồng này để nó có hiệu lực?", confirmText: "Duyệt" });
    if (!confirmed) return;
    try {
      const res = await fetchAPI(`/contracts/${id}/confirm`, {
        method: "PUT"
      });
      if (res.success) {
        notification.success("Đã duyệt hợp đồng thành công.");
        await loadData();
      } else {
        notification.error(res.message || "Không thể duyệt hợp đồng.");
      }
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể duyệt hợp đồng."));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({ title: "Xóa hợp đồng", message: "Bạn có chắc chắn muốn xóa hợp đồng này?", confirmText: "Xóa", destructive: true });
    if (!confirmed) return;
    try {
      await fetchAPI(`/contracts/${id}`, { method: "DELETE" });
      notification.success("Đã xóa hợp đồng.");
      await loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể xóa hợp đồng."));
    }
  };

  const filteredContracts = contracts.filter(c => {
    const roomCode = c.roomId?.roomCode || "";
    const tenantName = c.tenantId?.fullName || c.tenantId?.name || "";
    const matchesSearch = roomCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "pending") return c.status === 0 || c.status === 4;
    if (activeFilter === "active") return c.status === 1;
    if (activeFilter === "checkout") return c.status === 2 || c.status === 5;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vận hành" title="Hợp đồng" description="Theo dõi vòng đời hợp đồng từ khởi tạo, chờ ký đến hết hiệu lực." />
      <section className="calm-surface flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt/ký" },
            { id: "active", label: "Hiệu lực" },
            { id: "checkout", label: "Trả phòng" },
            { id: "draft", label: "Bản nháp" },
          ].map(tab => (
            <Button 
              key={tab.id}
              variant={activeFilter === tab.id ? "default" : "outline"}
              onClick={() => setActiveFilter(tab.id)}
              size="sm"
              className="rounded-full"
            >
              {tab.label}
            </Button>
          ))}
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm theo mã phòng, tên Người thuê..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

        <div className="flex gap-2">
          <Link href="/dashboard/contracts/new" className="flex h-10 items-center rounded-[16px] bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Tạo hợp đồng mới
          </Link>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editContractId ? "Sửa hợp đồng thuê phòng" : "Tạo hợp đồng thuê phòng"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateContract} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomSelect">Chọn phòng *</Label>
                  <select 
                    id="roomSelect" 
                    value={roomId} 
                    onChange={e => {
                      setRoomId(e.target.value);
                      const r = rooms.find(x => (x._id || x.id) === e.target.value);
                      if (r) {
                        setRent(formatCurrencyInput(r.defaultRentPrice?.toString() || "0"));
                        setDeposit(formatCurrencyInput(r.defaultDeposit?.toString() || r.defaultRentPrice?.toString() || "0"));
                        setInitialElectricity(r.draftElectricity?.toString() || "");
                        setInitialWater(r.draftWater?.toString() || "");
                      }
                    }}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>-- Chọn phòng --</option>
                    {rooms.map(r => <option key={r._id || r.id} value={r._id || r.id}>{r.roomCode}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantSelect">Người thuê *</Label>
                  <select 
                    id="tenantSelect" 
                    value={tenantId} 
                    onChange={e => setTenantId(e.target.value)}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>-- Chọn Người thuê --</option>
                    {tenants.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.fullName || t.name} ({formatPhone(t.phone)})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={startDate} 
                    onChange={e => {
                      const newDateStr = e.target.value;
                      setStartDate(newDateStr);
                      if (newDateStr) {
                        const dateObj = new Date(newDateStr);
                        dateObj.setFullYear(dateObj.getFullYear() + 1);
                        setEndDate(dateObj.toISOString().split("T")[0]);
                      }
                    }} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">Tiền thuê / tháng *</Label>
                  <Input 
                    id="rent" 
                    type="text" 
                    value={rent} 
                    onChange={e => setRent(formatCurrencyInput(e.target.value))} 
                    required 
                    placeholder="VD: 3.000.000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Tiền cọc *</Label>
                  <Input 
                    id="deposit" 
                    type="text" 
                    value={deposit} 
                    onChange={e => setDeposit(formatCurrencyInput(e.target.value))} 
                    required 
                    placeholder="VD: 3.000.000" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialElectricity">Chỉ số điện đầu</Label>
                  <Input
                    id="initialElectricity"
                    type="number"
                    value={initialElectricity}
                    onChange={e => setInitialElectricity(e.target.value)}
                    placeholder="VD: 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialWater">Chỉ số nước đầu</Label>
                  <Input
                    id="initialWater"
                    type="number"
                    value={initialWater}
                    onChange={e => setInitialWater(e.target.value)}
                    placeholder="VD: 50"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <Label className="text-base font-semibold text-foreground">Giá Điện, Nước</Label>
                {availableServices.filter(s => s.type === 1).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa cài đặt dịch vụ Điện, Nước trong phần Quản lý Dịch vụ.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {availableServices.filter(s => s.type === 1).map(srv => {
                      const srvId = srv._id || srv.id;
                      const isSelected = selectedServices.some(s => s.serviceId === srvId);
                      const svcData = selectedServices.find(s => s.serviceId === srvId);
                      return (
                        <div key={srvId} className="space-y-2 rounded-[16px] bg-background p-3 shadow-[var(--calm-shadow)]">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, { serviceId: srvId, fixedPrice: formatCurrencyInput(srv.defaultPrice?.toString() || "0") }]);
                                } else {
                                  setSelectedServices(selectedServices.filter(s => s.serviceId !== srvId));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            {srv.name} <span className="font-normal text-muted-foreground">({srv.unit})</span>
                          </label>
                          {isSelected && (
                            <Input
                              className="h-10 bg-card text-sm"
                              value={svcData?.fixedPrice || ""}
                              onChange={e => {
                                const updated = selectedServices.map(s => s.serviceId === srvId ? { ...s, fixedPrice: formatCurrencyInput(e.target.value) } : s);
                                setSelectedServices(updated);
                              }}
                              placeholder="Đơn giá..."
                              required
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 mt-4 pt-4 border-t border-border">
                <Label className="text-base font-semibold text-foreground">Dịch vụ khác</Label>
                {availableServices.filter(s => s.type !== 1).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có dịch vụ khác.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableServices.filter(s => s.type !== 1).map(srv => {
                      const srvId = srv._id || srv.id;
                      const isSelected = selectedServices.some(s => s.serviceId === srvId);
                      const svcData = selectedServices.find(s => s.serviceId === srvId);
                      return (
                        <div key={srvId} className={`flex flex-col gap-2 rounded-[16px] p-3 shadow-[var(--calm-shadow)] transition-colors ${isSelected ? 'bg-primary/10' : 'bg-background'}`}>
                          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-foreground">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, { serviceId: srvId, fixedPrice: formatCurrencyInput(srv.defaultPrice?.toString() || "0") }]);
                                } else {
                                  setSelectedServices(selectedServices.filter(s => s.serviceId !== srvId));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            {srv.name} <span className="text-muted-foreground font-normal">({srv.unit})</span>
                          </label>
                          {isSelected && (
                            <div className="pl-6">
                              <Input 
                                className="h-8 text-sm bg-card"
                                value={svcData?.fixedPrice || ""}
                                onChange={e => {
                                  const updated = selectedServices.map(s => s.serviceId === srvId ? { ...s, fixedPrice: formatCurrencyInput(e.target.value) } : s);
                                  setSelectedServices(updated);
                                }}
                                placeholder="Đơn giá..."
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Input 
                    id="status" 
                    value={computedStatus} 
                    disabled 
                    className={`cursor-not-allowed font-semibold ${computedStatus === 'Chờ hiệu lực' ? 'bg-[var(--warning-soft)] text-warning-foreground' : 'bg-primary/10 text-primary'}`}
                  />
              </div>

              <Button type="submit" className="mt-4 w-full"><FileSignature className="size-4" />{editContractId ? "Lưu thay đổi" : "Tạo hợp đồng"}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Quyết toán Trả phòng</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCheckout} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="finalElectricity">Chỉ số điện cuối cùng</Label>
                <Input
                  id="finalElectricity"
                  type="number"
                  value={finalElectricity}
                  onChange={e => setFinalElectricity(e.target.value)}
                  placeholder="VD: 120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalWater">Chỉ số nước cuối cùng</Label>
                <Input
                  id="finalWater"
                  type="number"
                  value={finalWater}
                  onChange={e => setFinalWater(e.target.value)}
                  placeholder="VD: 65"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductionAmount">Khấu trừ tiền cọc (VNĐ)</Label>
                <Input
                  id="deductionAmount"
                  type="text"
                  value={deductionAmount}
                  onChange={e => setDeductionAmount(formatCurrencyInput(e.target.value))}
                  placeholder="VD: 500.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkoutNote">Ghi chú</Label>
                <textarea
                  id="checkoutNote"
                  className="flex min-h-[80px] w-full rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={checkoutNote}
                  onChange={e => setCheckoutNote(e.target.value)}
                  placeholder="Nhập ghi chú (nếu có)..."
                />
              </div>
              <Button type="submit" className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Duyệt trả phòng
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        </div>
      </section>

      {activeFilter === "draft" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {draftContracts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground calm-surface rounded-xl border border-border">
               Không có bản nháp nào.
            </div>
          ) : (
            draftContracts.map((draft, i) => (
              <div key={draft.id || i} className="calm-surface p-4 rounded-[20px] border border-border shadow-[var(--calm-shadow)] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">Bản nháp #{draft.id || i+1}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Đã dừng ở Bước {draft.step || 1}</p>
                    {draft.lastSaved && <p className="text-xs text-muted-foreground mt-1">Lưu lúc: {new Date(draft.lastSaved).toLocaleString("vi-VN")}</p>}
                  </div>
                  <Button onClick={() => handleDeleteDraft(draft.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-auto pt-4 border-t border-border">
                  <Link href={`/dashboard/contracts/new`} className="w-full flex items-center justify-center">
                    <Button className="w-full font-bold shadow-[var(--calm-shadow)]" variant="secondary">
                      📋 Tiếp tục tạo
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="calm-workbench">
        <Table>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="font-semibold text-foreground">Phòng</TableHead>
              <TableHead className="font-semibold text-foreground">Người thuê</TableHead>
              <TableHead className="font-semibold text-foreground">Ngày bắt đầu</TableHead>
              <TableHead className="font-semibold text-foreground">Tiền cọc</TableHead>
              <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground"><FileSignature className="mx-auto mb-2 size-8 animate-pulse text-primary" />Đang tải hợp đồng…</TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" /><p className="mt-3 font-black">Không tìm thấy hợp đồng nào</p></TableCell>
              </TableRow>
            ) : (
              filteredContracts.map(contract => (
                <TableRow key={contract._id || contract.id}>
                  <TableCell className="font-medium text-foreground">{contract.roomId?.roomCode || "-"}</TableCell>
                  <TableCell>{contract.tenantId?.fullName || contract.tenantId?.name || "-"}</TableCell>
                  <TableCell>{contract.startDate ? new Date(contract.startDate).toLocaleDateString("vi-VN") : "-"}</TableCell>
                  <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.fixedDeposit || contract.deposit || 0)}</TableCell>
                  <TableCell>
                    {(() => {
                      const start = new Date(contract.startDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const displayStatus = contract.status === 5 ? "Chờ duyệt trả phòng" : contract.status === 4 ? "Chờ duyệt" : (contract.status === 1 && start > today) ? "Chờ hiệu lực" : contract.status === 1 ? "Đang hiệu lực" : contract.status === 0 ? "Chờ ký" : "Đã hủy";
                      return (
                        <Badge className={
                          displayStatus === "Đang hiệu lực" ? "border-0 bg-primary/10 text-primary" :
                          (displayStatus === "Chờ hiệu lực" || displayStatus === "Chờ duyệt" || displayStatus === "Chờ duyệt trả phòng") ? "border-0 bg-[var(--warning-soft)] text-warning-foreground" :
                          "border-0 bg-muted text-muted-foreground"
                        }>
                          {displayStatus}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    {contract.status === 4 && (
                      <Button onClick={() => handleConfirmContract(contract._id || contract.id)} variant="secondary" size="sm" className="mr-2 text-primary">
                        <CheckCircle2 className="size-4" />Duyệt
                      </Button>
                    )}
                    {(contract.status === 1 || contract.status === 5) && (
                      <Button onClick={() => openCheckoutModal(contract._id || contract.id)} variant="outline" size="sm" className="mr-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                        Duyệt trả phòng
                      </Button>
                    )}
                    <Button onClick={() => openEditModal(contract)} variant="ghost" size="sm" className="mr-2">
                      <Edit className="size-4" />Sửa
                    </Button>
                    <Button aria-label="Xóa hợp đồng" onClick={() => handleDelete(contract._id || contract.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
