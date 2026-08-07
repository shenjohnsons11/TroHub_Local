"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DoorOpen, Edit, Plus, Search, Trash2, Settings } from "lucide-react";
import { PageHeader } from "@/components/calm-ops/page-header";
import { safeJsonParse } from "@/lib/client-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency, formatNumberInput, unformatNumber } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";

export default function RoomsPage() {
  const notification = useNotification();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [floor, setFloor] = useState("1");
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all");

  const loadRooms = async () => {
    try {
      const data = await fetchAPI("/rooms");
      if (data.success) setRooms(data.data);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải danh sách phòng."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRooms(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setRoomCode("");
    setPrice("");
    setArea("");
    setFloor("1");
    setEditingRoomId(null);
    setIsAddOpen(true);
  };

  const openEditModal = (room: any) => {
    setRoomCode(room.roomCode);
    setPrice(formatNumberInput(room.defaultRentPrice));
    setArea(room.area?.toString() || "");
    setFloor(String(room.floor || 1));
    setEditingRoomId(room._id || room.id);
    setIsEditOpen(true);
  };

  const handleSaveRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const storedUser = safeJsonParse<{ id?: string }>(localStorage.getItem("trohub_user"), {});
      const payload = {
        roomCode,
        rent: unformatNumber(price),
        deposit: unformatNumber(price),
        area: parseInt(area),
        floor: Number(floor),
        landlordId: storedUser.id,
      };
      if (editingRoomId) {
        await fetchAPI(`/rooms/${editingRoomId}`, { method: "PUT", body: JSON.stringify(payload) });
        setIsEditOpen(false);
      } else {
        await fetchAPI("/rooms", { method: "POST", body: JSON.stringify(payload) });
        setIsAddOpen(false);
      }
      notification.success(editingRoomId ? "Đã cập nhật phòng." : "Đã thêm phòng mới.");
      await loadRooms();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu phòng."));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({
      title: "Xóa phòng",
      message: "Bạn có chắc chắn muốn xóa phòng này?",
      confirmText: "Xóa",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await fetchAPI(`/rooms/${id}`, { method: "DELETE" });
      notification.success("Đã xóa phòng.");
      await loadRooms();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể xóa phòng."));
    }
  };

  const floorOptions = useMemo(() => Array.from(new Set(rooms.map((room) => Number(room.floor) || 1))).sort((a, b) => a - b), [rooms]);
  const filteredRooms = useMemo(() => rooms
    .filter((room) => room.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((room) => selectedFloor === "all" || (Number(room.floor) || 1) === selectedFloor)
    .sort((a, b) => (Number(a.floor) || 1) - (Number(b.floor) || 1) || String(a.roomCode).localeCompare(String(b.roomCode))), [rooms, searchTerm, selectedFloor]);
  const roomsByFloor = useMemo(() => filteredRooms.reduce<Record<number, any[]>>((groups, room) => {
    const roomFloor = Number(room.floor) || 1;
    (groups[roomFloor] ||= []).push(room);
    return groups;
  }, {}), [filteredRooms]);

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await fetchAPI(`/rooms/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      notification.success("Đã cập nhật trạng thái phòng.");
      setStatusDropdown(null);
      await loadRooms();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể cập nhật trạng thái."));
    }
  };

  const statusBadge = (room: any) => {
    const status = room.status;
    return (
      <div className="flex items-center gap-2">
        {status === 0
          ? <Badge className="border-0 bg-primary/10 text-primary">Còn trống</Badge>
          : status === 1
            ? <Badge className="border-0 bg-accent text-accent-foreground">Đang thuê</Badge>
            : <Badge className="border-0 bg-[var(--warning-soft)] text-warning-foreground">Bảo trì</Badge>}
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setStatusDropdown(statusDropdown === (room._id || room.id) ? null : (room._id || room.id))} className="size-6 rounded-full"><Settings className="size-3" /></Button>
          {statusDropdown === (room._id || room.id) && (
            <div className="absolute right-0 top-8 z-10 w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <button onClick={() => void handleStatusChange(room._id || room.id, 0)} className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent">✅ Còn trống</button>
              <button onClick={() => void handleStatusChange(room._id || room.id, 1)} className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent">🏠 Đang thuê</button>
              <button onClick={() => void handleStatusChange(room._id || room.id, 2)} className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent">🔧 Bảo trì</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const roomForm = (edit = false) => (
    <form onSubmit={handleSaveRoom} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor={edit ? "editRoomCode" : "roomCode"}>Mã phòng / Tên phòng</Label>
        <Input id={edit ? "editRoomCode" : "roomCode"} value={roomCode} onChange={(event) => setRoomCode(event.target.value)} required placeholder="VD: P.101" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={edit ? "editPrice" : "price"}>Giá thuê (VNĐ)</Label>
        <Input id={edit ? "editPrice" : "price"} inputMode="numeric" value={price} onChange={(event) => setPrice(formatNumberInput(event.target.value))} required placeholder="VD: 3.000.000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={edit ? "editArea" : "area"}>Diện tích (m²)</Label>
        <Input id={edit ? "editArea" : "area"} type="number" value={area} onChange={(event) => setArea(event.target.value)} required placeholder="VD: 25" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={edit ? "editFloor" : "floor"}>{t("floor")}</Label>
        <Input id={edit ? "editFloor" : "floor"} type="number" min="1" step="1" value={floor} onChange={(event) => setFloor(event.target.value)} required />
      </div>
      <Button type="submit" className="w-full"><DoorOpen className="size-4" />{edit ? "Cập nhật phòng" : "Lưu phòng mới"}</Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vận hành" title="Quản lý Phòng" description="Theo dõi trạng thái, giá thuê và Người thuê hiện tại của từng phòng." />
      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Tìm kiếm phòng" placeholder="Tìm kiếm phòng..." className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger onClick={openAddModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="size-4" />Thêm phòng mới
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]"><DialogHeader><DialogTitle>Thêm phòng mới</DialogTitle></DialogHeader>{roomForm()}</DialogContent>
        </Dialog>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[440px]"><DialogHeader><DialogTitle>Sửa thông tin phòng</DialogTitle></DialogHeader>{roomForm(true)}</DialogContent>
        </Dialog>
      </section>

      <div className="flex flex-wrap gap-2" aria-label={t("floor")}>
        <Button type="button" variant={selectedFloor === "all" ? "default" : "outline"} onClick={() => setSelectedFloor("all")}>{t("all")}</Button>
        {floorOptions.map((option) => <Button type="button" key={option} variant={selectedFloor === option ? "default" : "outline"} onClick={() => setSelectedFloor(option)}>{t("floor")} {option}</Button>)}
      </div>

      {loading ? (
        <div className="calm-surface grid min-h-64 place-items-center p-8 text-center"><div><DoorOpen className="mx-auto size-9 animate-pulse text-primary" /><p className="mt-3 font-bold">Đang mở danh mục phòng…</p></div></div>
      ) : filteredRooms.length === 0 ? (
        <div className="calm-surface grid min-h-72 place-items-center overflow-hidden p-8 text-center">
          <div><Image src="/trohub-empty-states.png" alt="" width={190} height={120} className="mx-auto h-28 w-44 rounded-[20px] object-cover object-left" /><h2 className="mt-4 text-xl font-black">Không tìm thấy phòng nào</h2><p className="mt-1 text-sm text-muted-foreground">Thử từ khóa khác hoặc thêm phòng đầu tiên.</p></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(roomsByFloor).map(([floorNumber, floorRooms]) => <section key={floorNumber} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-black">{t("floor").toUpperCase()} {floorNumber}</h2><span className="text-sm font-bold text-muted-foreground">{floorRooms.length} {t("rooms")}</span></div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {floorRooms.map((room) => (
            <article key={room._id || room.id} className="calm-surface group overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Căn hộ</p><h2 className="mt-1 text-2xl font-black">{room.roomCode}</h2></div>
                {statusBadge(room)}
              </div>
              <div className="mt-6 rounded-[20px] bg-primary/8 p-4">
                <p className="text-sm text-muted-foreground">Giá thuê mỗi tháng</p>
                <p className="mt-1 text-2xl font-black tracking-[-.04em] text-primary">{formatCurrency(room.defaultRentPrice)}</p>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">{t("floor")}</dt><dd className="mt-1 font-bold">{t("floor")} {room.floor || 1}</dd></div>
                <div><dt className="text-muted-foreground">Diện tích · Người thuê</dt><dd className="mt-1 truncate font-bold">{room.area} m² · {room.tenant || "Chưa có"}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button onClick={() => openEditModal(room)} variant="secondary" size="sm"><Edit className="size-4" />Sửa</Button>
                <Button onClick={() => void handleDelete(room._id || room.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" />Xóa</Button>
              </div>
            </article>
          ))}
            </div>
          </section>)}
        </div>
      )}
    </div>
  );
}
