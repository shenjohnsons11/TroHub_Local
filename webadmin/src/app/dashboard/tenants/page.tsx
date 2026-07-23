"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatPhoneInput, formatIdCardInput, parseFormattedString } from "@/lib/utils";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [roomCode, setRoomCode] = useState("");
  
  const [rooms, setRooms] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([
        fetchAPI("/tenants"),
        fetchAPI("/rooms")
      ]);
      if (tenantsData.success) {
        setTenants(tenantsData.data);
      }
      if (roomsData.success) {
        // Lọc các phòng trống (status = 0)
        setRooms(roomsData.data.filter((r: any) => r.status === 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setIdCard("");
    setRoomCode("");
    setEditingTenantId(null);
    setIsAddOpen(true);
  };

  const openEditModal = (tenant: any) => {
    setFullName(tenant.fullName || tenant.name);
    setPhone(tenant.phone);
    setIdCard(tenant.idCard || "");
    setEditingTenantId(tenant._id || tenant.id);
    setIsEditOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        fullName, 
        phone: parseFormattedString(phone),
        email,
        idCard: parseFormattedString(idCard),
        roomCode
      };
      if (editingTenantId) {
        await fetchAPI(`/tenants/${editingTenantId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setIsEditOpen(false);
      } else {
        await fetchAPI("/tenants", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setIsAddOpen(false);
      }
      loadData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa người thuê này?")) {
      try {
        await fetchAPI(`/tenants/${id}`, { method: "DELETE" });
        loadData();
      } catch (err: any) {
        alert("Lỗi khi xóa: " + err.message);
      }
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo tên, SĐT..." 
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger onClick={openAddModal} className="bg-[#f37021] hover:bg-[#e85f12] text-white flex items-center h-10 px-4 rounded-md font-medium text-sm">
            <Plus className="w-4 h-4 mr-2" /> Thêm người thuê
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Thêm người thuê</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveTenant} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(formatPhoneInput(e.target.value))} placeholder="090.123.4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email đăng nhập</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nguyenvanA@gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idCard">CCCD</Label>
                <Input id="idCard" value={idCard} onChange={e => setIdCard(formatIdCardInput(e.target.value))} placeholder="079.012.345.678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomCode">Gán phòng (Tạo hợp đồng nháp)</Label>
                <select 
                  id="roomCode" 
                  value={roomCode} 
                  onChange={e => setRoomCode(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f37021]"
                >
                  <option value="">-- Chưa gán phòng --</option>
                  {rooms.map(r => <option key={r._id || r.id} value={r.roomCode}>{r.roomCode}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full bg-[#f37021] hover:bg-[#e85f12] mt-4">Lưu người thuê</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Sửa thông tin người thuê</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveTenant} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Họ và tên</Label>
                <Input id="editFullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Số điện thoại</Label>
                <Input id="editPhone" value={phone} onChange={e => setPhone(formatPhoneInput(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIdCard">CCCD</Label>
                <Input id="editIdCard" value={idCard} onChange={e => setIdCard(formatIdCardInput(e.target.value))} required />
              </div>
              <Button type="submit" className="w-full bg-[#f37021] hover:bg-[#e85f12] mt-4">Cập nhật</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Họ và tên</TableHead>
              <TableHead className="font-semibold text-slate-800">Số điện thoại</TableHead>
              <TableHead className="font-semibold text-slate-800">Phòng đang thuê</TableHead>
              <TableHead className="font-semibold text-slate-800">Trạng thái App</TableHead>
              <TableHead className="text-right font-semibold text-slate-800">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Không tìm thấy người thuê nào</TableCell>
              </TableRow>
            ) : (
              filteredTenants.map(tenant => (
                <TableRow key={tenant._id || tenant.id}>
                  <TableCell className="font-medium text-slate-900">{tenant.fullName || tenant.name}</TableCell>
                  <TableCell>{tenant.phone}</TableCell>
                  <TableCell>{tenant.roomCode || "Chưa xếp phòng"}</TableCell>
                  <TableCell>
                    {tenant.linkedAccountId ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đã liên kết</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none">Chưa liên kết App</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEditModal(tenant)} variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => handleDelete(tenant._id || tenant.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
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
