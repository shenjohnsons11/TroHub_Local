"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrencyInput, parseFormattedNumber } from "@/lib/utils";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Form states
  const [roomCode, setRoomCode] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");

  const loadRooms = async () => {
    try {
      const data = await fetchAPI("/rooms");
      if (data.success) {
        setRooms(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const openAddModal = () => {
    setRoomCode("");
    setPrice("");
    setArea("");
    setEditingRoomId(null);
    setIsAddOpen(true);
  };

  const openEditModal = (room: any) => {
    setRoomCode(room.roomCode);
    setPrice(room.defaultRentPrice?.toString() || "");
    setArea(room.area?.toString() || "");
    setEditingRoomId(room._id || room.id);
    setIsEditOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        roomCode,
        rent: parseFormattedNumber(price),
        deposit: parseFormattedNumber(price), // Default deposit to price
        area: parseInt(area),
        landlordId: JSON.parse(localStorage.getItem("trohub_user") || "{}").id
      };
      
      if (editingRoomId) {
        await fetchAPI(`/rooms/${editingRoomId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setIsEditOpen(false);
      } else {
        await fetchAPI("/rooms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setIsAddOpen(false);
      }
      loadRooms();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa phòng này?")) {
      try {
        await fetchAPI(`/rooms/${id}`, { method: "DELETE" });
        loadRooms();
      } catch (err: any) {
        alert("Lỗi khi xóa: " + err.message);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đang thuê": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đang thuê</Badge>;
      case "Còn trống": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Còn trống</Badge>;
      case "Bảo trì": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Bảo trì</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRooms = rooms.filter(r => r.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm kiếm phòng..." 
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger onClick={openAddModal} className="bg-[#f37021] hover:bg-[#e85f12] text-white flex items-center h-10 px-4 rounded-md font-medium text-sm">
            <Plus className="w-4 h-4 mr-2" /> Thêm phòng mới
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Thêm phòng mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveRoom} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Mã phòng / Tên phòng</Label>
                <Input id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)} required placeholder="VD: P.101" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá thuê (VNĐ)</Label>
                <Input id="price" type="text" value={price} onChange={e => setPrice(formatCurrencyInput(e.target.value))} required placeholder="VD: 3.000.000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Diện tích (m2)</Label>
                <Input id="area" type="number" value={area} onChange={e => setArea(e.target.value)} required placeholder="VD: 25" />
              </div>
              <Button type="submit" className="w-full bg-[#f37021] hover:bg-[#e85f12] mt-4">Lưu phòng mới</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal (Hidden by default, triggered by state) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Sửa thông tin phòng</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveRoom} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editRoomCode">Mã phòng / Tên phòng</Label>
                <Input id="editRoomCode" value={roomCode} onChange={e => setRoomCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPrice">Giá thuê (VNĐ)</Label>
                <Input id="editPrice" type="text" value={price} onChange={e => setPrice(formatCurrencyInput(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editArea">Diện tích (m2)</Label>
                <Input id="editArea" type="number" value={area} onChange={e => setArea(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-[#f37021] hover:bg-[#e85f12] mt-4">Cập nhật</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Đang tải dữ liệu...</div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">Không tìm thấy phòng nào</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map(room => (
            <div key={room._id || room.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-xl text-slate-800">{room.roomCode}</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center">
                    <span className="inline-block w-4 h-4 mr-1">📐</span> {room.area} m²
                  </p>
                </div>
                {getStatusBadge(room.status === 0 ? "Còn trống" : room.status === 1 ? "Đang thuê" : "Bảo trì")}
              </div>
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200">
                  <span className="text-sm text-slate-500">Giá thuê</span>
                  <span className="font-bold text-[#f37021] text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.defaultRentPrice)}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Người thuê hiện tại</span>
                  <span className={`font-medium ${room.tenant ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                    {room.tenant || "Chưa có Người thuê"}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button onClick={() => openEditModal(room)} variant="outline" size="sm" className="h-9 px-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 shadow-sm">
                  <Edit className="h-4 w-4 mr-2" /> Sửa
                </Button>
                <Button onClick={() => handleDelete(room._id || room.id)} variant="outline" size="sm" className="h-9 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shadow-sm">
                  <Trash2 className="h-4 w-4 mr-2" /> Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
