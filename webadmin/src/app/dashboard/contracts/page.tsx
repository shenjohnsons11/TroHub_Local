"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Send, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrencyInput, parseFormattedNumber } from "@/lib/utils";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function ContractsPage() {
  const notification = useNotification();
  const [contracts, setContracts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
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
  }, []);

  const openEditModal = (contract: any) => {
    setEditContractId(contract._id || contract.id);
    setRoomId(contract.roomId?._id || contract.roomId?.id || contract.roomId);
    setTenantId(contract.tenantId?._id || contract.tenantId?.id || contract.tenantId);
    setStartDate(contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "");
    setEndDate(contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "");
    setRent(formatCurrencyInput(contract.fixedRentPrice?.toString() || "0"));
    setDeposit(formatCurrencyInput(contract.fixedDeposit?.toString() || "0"));
    
    const r = rooms.find(x => (x._id || x.id) === (contract.roomId?._id || contract.roomId?.id || contract.roomId));
    setInitialElectricity(r?.draftElectricity?.toString() || "");
    setInitialWater(r?.draftWater?.toString() || "");

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
      await loadData();
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

  const handleSendContract = async (contract: any) => {
    const id = contract._id || contract.id;
    if (contract.lastSentAt) {
      const confirmed = await notification.confirm({
        title: "Gửi lại hợp đồng",
        message: "Gửi lại thông báo hợp đồng này cho Người thuê?",
        confirmText: "Gửi lại",
      });
      if (!confirmed) return;
    }
    try {
      const response = await fetchAPI(`/contracts/${id}/send`, { method: "POST" });
      const sent = response.data?.delivery?.sent || 0;
      notification.success(`Đã lưu thông báo và gửi push tới ${sent} thiết bị.`);
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể gửi hợp đồng."));
    }
  };

  const filteredContracts = contracts.filter(c => {
    const roomCode = c.roomId?.roomCode || "";
    const tenantName = c.tenantId?.fullName || c.tenantId?.name || "";
    return roomCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
           tenantName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo mã phòng, tên Người thuê..."
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Link href="/dashboard/contracts/new" className="bg-[#f37021] hover:bg-[#e85f12] text-white flex items-center h-10 px-4 rounded-md font-medium text-sm">
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
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f37021]"
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
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f37021]"
                  >
                    <option value="" disabled>-- Chọn Người thuê --</option>
                    {tenants.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.fullName || t.name} ({t.phone})</option>)}
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

              <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                <Label className="text-base font-semibold text-slate-800">Giá Điện, Nước</Label>
                {availableServices.filter(s => s.type === 1).length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa cài đặt dịch vụ Điện, Nước trong phần Quản lý Dịch vụ.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {availableServices.filter(s => s.type === 1).map(srv => {
                      const srvId = srv._id || srv.id;
                      const isSelected = selectedServices.some(s => s.serviceId === srvId);
                      const svcData = selectedServices.find(s => s.serviceId === srvId);
                      return (
                        <div key={srvId} className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-800">
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
                              className="rounded border-slate-300 text-[#f37021] focus:ring-[#f37021]"
                            />
                            {srv.name} <span className="text-slate-500 font-normal">({srv.unit})</span>
                          </label>
                          {isSelected && (
                            <Input 
                              className="h-10 text-sm bg-white"
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

              <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
                <Label className="text-base font-semibold text-slate-800">Dịch vụ khác</Label>
                {availableServices.filter(s => s.type !== 1).length === 0 ? (
                  <p className="text-sm text-slate-500">Không có dịch vụ khác.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableServices.filter(s => s.type !== 1).map(srv => {
                      const srvId = srv._id || srv.id;
                      const isSelected = selectedServices.some(s => s.serviceId === srvId);
                      const svcData = selectedServices.find(s => s.serviceId === srvId);
                      return (
                        <div key={srvId} className={`flex flex-col gap-2 p-3 border rounded-md transition-colors ${isSelected ? 'border-[#f37021] bg-orange-50/30' : 'border-slate-200 bg-slate-50'}`}>
                          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-800">
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
                              className="rounded border-slate-300 text-[#f37021] focus:ring-[#f37021]"
                            />
                            {srv.name} <span className="text-slate-500 font-normal">({srv.unit})</span>
                          </label>
                          {isSelected && (
                            <div className="pl-6">
                              <Input 
                                className="h-8 text-sm bg-white"
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

              <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Input 
                    id="status" 
                    value={computedStatus} 
                    disabled 
                    className={`font-semibold cursor-not-allowed ${computedStatus === 'Chờ hiệu lực' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200'}`}
                  />
              </div>

              <Button type="submit" className="w-full bg-[#f37021] hover:bg-[#e85f12] mt-4">{editContractId ? "Lưu thay đổi" : "Tạo hợp đồng"}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Phòng</TableHead>
              <TableHead className="font-semibold text-slate-800">Người thuê</TableHead>
              <TableHead className="font-semibold text-slate-800">Ngày bắt đầu</TableHead>
              <TableHead className="font-semibold text-slate-800">Tiền cọc</TableHead>
              <TableHead className="font-semibold text-slate-800">Trạng thái</TableHead>
              <TableHead className="text-right font-semibold text-slate-800">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Không tìm thấy hợp đồng nào</TableCell>
              </TableRow>
            ) : (
              filteredContracts.map(contract => (
                <TableRow key={contract._id || contract.id}>
                  <TableCell className="font-medium text-slate-900">{contract.roomId?.roomCode || "-"}</TableCell>
                  <TableCell>{contract.tenantId?.fullName || contract.tenantId?.name || "-"}</TableCell>
                  <TableCell>{contract.startDate ? new Date(contract.startDate).toLocaleDateString("vi-VN") : "-"}</TableCell>
                  <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.fixedDeposit || contract.deposit || 0)}</TableCell>
                  <TableCell>
                    {(() => {
                      const start = new Date(contract.startDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const displayStatus = contract.status === 4 ? "Chờ duyệt" : (contract.status === 1 && start > today) ? "Chờ hiệu lực" : contract.status === 1 ? "Đang hiệu lực" : contract.status === 0 ? "Chờ ký" : "Đã hủy";
                      return (
                        <Badge variant="outline" className={
                          displayStatus === "Đang hiệu lực" ? "bg-green-50 text-green-700 border-green-200" : 
                          (displayStatus === "Chờ hiệu lực" || displayStatus === "Chờ duyệt") ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          "bg-slate-50 text-slate-700 border-slate-200"
                        }>
                          {displayStatus}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleSendContract(contract)} variant="outline" size="sm" className="mr-2 h-8">
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {contract.lastSentAt ? "Gửi lại" : "Gửi cho Người thuê"}
                    </Button>
                    {contract.status === 4 && (
                      <Button onClick={() => handleConfirmContract(contract._id || contract.id)} variant="outline" size="sm" className="mr-2 h-8 text-green-600 border-green-200 hover:bg-green-50">
                        Duyệt
                      </Button>
                    )}
                    <Button onClick={() => openEditModal(contract)} variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 mr-2">
                      Sửa
                    </Button>
                    <Button onClick={() => handleDelete(contract._id || contract.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
