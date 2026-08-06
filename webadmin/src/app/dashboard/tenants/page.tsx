"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Contact, Edit, KeyRound, Plus, Search, Trash2, UserRound, Send } from "lucide-react";
import { PageHeader } from "@/components/calm-ops/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCCCD, formatPhone, unformatDigits } from "@/lib/formatters";
import { TemporaryPasswordDialog } from "@/components/temporary-password-dialog";
import { issueTemporaryPassword } from "@/lib/password-reset";

const TENANT_STEPS = [
  { label: "Thông tin", icon: UserRound },
  { label: "Liên hệ", icon: Contact },
  { label: "Xác nhận", icon: BadgeCheck },
];

export default function TenantsPage() {
  const notification = useNotification();
  const addFormRef = useRef<HTMLFormElement>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteTenantName, setInviteTenantName] = useState("");
  const [tenantStep, setTenantStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [temporaryPasswordName, setTemporaryPasswordName] = useState("");

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([fetchAPI("/tenants"), fetchAPI("/rooms")]);
      if (tenantsData.success) setTenants(tenantsData.data);
      if (roomsData.success) setRooms(roomsData.data.filter((room: any) => room.status === 0));
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải danh sách người thuê."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setIdCard("");
    setRoomCode("");
    setEditingTenantId(null);
    setTenantStep(1);
    setIsAddOpen(true);
  };

  const openEditModal = (tenant: any) => {
    setFullName(tenant.fullName || tenant.name);
    setPhone(formatPhone(tenant.phone));
    setIdCard(formatCCCD(tenant.idCard));
    setEditingTenantId(tenant._id || tenant.id);
    setIsEditOpen(true);
  };

  const handleSaveTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        fullName,
        phone: unformatDigits(phone),
        email: email.trim().toLowerCase(),
        idCard: unformatDigits(idCard),
        roomCode,
      };
      if (editingTenantId) {
        await fetchAPI(`/tenants/${editingTenantId}`, { method: "PUT", body: JSON.stringify(payload) });
        setIsEditOpen(false);
      } else {
        await fetchAPI("/tenants", { method: "POST", body: JSON.stringify(payload) });
        setIsAddOpen(false);
      }
      notification.success(editingTenantId ? "Đã cập nhật người thuê." : "Đã thêm người thuê.");
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu người thuê."));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({
      title: "Xóa người thuê",
      message: "Bạn có chắc chắn muốn xóa người thuê này?",
      confirmText: "Xóa",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await fetchAPI(`/tenants/${id}`, { method: "DELETE" });
      notification.success("Đã xóa người thuê.");
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể xóa người thuê."));
    }
  };

  const handleTemporaryPassword = async (tenant: any) => {
    try {
      const result = await issueTemporaryPassword(tenant._id || tenant.id);
      setTemporaryPasswordName(tenant.fullName || tenant.name || "Người thuê");
      setTemporaryPassword(result.temporaryPassword);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tạo mật khẩu tạm."));
    }
  };

  const continueAdd = () => {
    if (!addFormRef.current?.reportValidity()) return;
    setTenantStep((current) => Math.min(3, current + 1));
  };

  const openInviteModal = (tenant: any) => {
    setInvitePhone(tenant.phone || "");
    setInviteTenantName(tenant.fullName || tenant.name || "");
    setInviteModalOpen(true);
  };

  const handleSendInvite = (type: "zalo" | "sms") => {
    if (!invitePhone) return;
    const cleanPhone = invitePhone.replace(/\D/g, "");
    if (type === "zalo") {
      window.open(`https://zalo.me/${cleanPhone}`, "_blank");
    } else {
      const message = encodeURIComponent(`Chào ${inviteTenantName}, mời bạn tham gia ứng dụng TroHub để theo dõi hóa đơn và hợp đồng.`);
      window.location.href = `sms:${cleanPhone}?body=${message}`;
    }
    notification.success(`Đã mở ứng dụng ${type === "zalo" ? "Zalo" : "SMS"} để gửi lời mời.`);
    setInviteModalOpen(false);
  };

  const filteredTenants = tenants.filter((tenant) =>
    tenant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || tenant.phone?.includes(searchTerm),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vận hành" title="Người thuê" description="Quản lý hồ sơ, phòng đang thuê và trạng thái liên kết ứng dụng." />
      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Tìm người thuê" placeholder="Tìm theo tên, SĐT..." className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger onClick={openAddModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="size-4" />Thêm người thuê
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Thêm người thuê</DialogTitle></DialogHeader>
            <ol aria-label="Tiến trình thêm người thuê" className="grid grid-cols-3 gap-2">
              {TENANT_STEPS.map(({ label, icon: Icon }, index) => {
                const itemStep = index + 1;
                return <li key={label} aria-current={itemStep === tenantStep ? "step" : undefined} className={`rounded-[16px] p-3 text-center transition ${itemStep === tenantStep ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]" : itemStep < tenantStep ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="mx-auto size-5" /><span className="mt-1 block text-xs font-bold sm:text-sm">{label}</span></li>;
              })}
            </ol>
            <form ref={addFormRef} onSubmit={handleSaveTenant} className="mt-2 space-y-5">
              {tenantStep === 1 && <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="fullName">Họ và tên</Label><Input id="fullName" autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Nguyễn Văn A" /></div>
                <div className="space-y-2"><Label htmlFor="idCard">CCCD</Label><Input id="idCard" value={idCard} onChange={(event) => setIdCard(formatCCCD(event.target.value))} placeholder="0123.4567.8901" /></div>
              </div>}
              {tenantStep === 2 && <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="phone">Số điện thoại</Label><Input id="phone" autoFocus value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="0901.234.567" required /></div>
                <div className="space-y-2"><Label htmlFor="email">Email đăng nhập</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nguyenvana@gmail.com" required /></div>
              </div>}
              {tenantStep === 3 && <div className="space-y-4">
                <div className="rounded-[20px] bg-primary/8 p-5"><p className="text-sm text-muted-foreground">Hồ sơ sắp tạo</p><p className="mt-1 text-xl font-black">{fullName}</p><p className="mt-1 text-sm">{phone || "Chưa có số điện thoại"} · {email || "Chưa có email"}</p></div>
                <div className="space-y-2"><Label htmlFor="roomCode">Gán phòng (Tạo hợp đồng nháp)</Label><select id="roomCode" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} className="flex h-10 w-full rounded-[16px] border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">-- Chưa gán phòng --</option>{rooms.map((room) => <option key={room._id || room.id} value={room.roomCode}>{room.roomCode}</option>)}</select></div>
              </div>}
              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" disabled={tenantStep === 1} onClick={() => setTenantStep((current) => Math.max(1, current - 1))}><ChevronLeft className="size-4" />Quay lại</Button>
                {tenantStep < 3 ? <Button type="button" onClick={continueAdd}>Tiếp tục<ChevronRight className="size-4" /></Button> : <Button type="submit"><BadgeCheck className="size-4" />Lưu người thuê</Button>}
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader><DialogTitle>Sửa thông tin người thuê</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveTenant} className="mt-4 space-y-4">
              <div className="space-y-2"><Label htmlFor="editFullName">Họ và tên</Label><Input id="editFullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="editPhone">Số điện thoại</Label><Input id="editPhone" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} required /></div>
              <div className="space-y-2"><Label htmlFor="editIdCard">CCCD</Label><Input id="editIdCard" value={idCard} onChange={(event) => setIdCard(formatCCCD(event.target.value))} required /></div>
              <Button type="submit" className="w-full"><UserRound className="size-4" />Cập nhật</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Gửi lời mời tham gia App</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="invitePhone">Số điện thoại nhận</Label>
                <Input id="invitePhone" value={invitePhone} onChange={(e) => setInvitePhone(formatPhone(e.target.value))} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="w-full bg-[#0068FF] hover:bg-[#0054cc] text-white" onClick={() => handleSendInvite("zalo")}>Gửi Zalo</Button>
                <Button className="w-full" variant="outline" onClick={() => handleSendInvite("sms")}>Gửi SMS</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <div className="calm-workbench">
        <Table>
          <TableHeader><TableRow><TableHead>Họ và tên</TableHead><TableHead>Số điện thoại</TableHead><TableHead>Phòng đang thuê</TableHead><TableHead>Trạng thái App</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground"><UserRound className="mx-auto mb-2 size-8 animate-pulse text-primary" />Đang tải hồ sơ…</TableCell></TableRow>
              : filteredTenants.length === 0 ? <TableRow><TableCell colSpan={5} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" /><p className="mt-3 font-black">Không tìm thấy người thuê nào</p></TableCell></TableRow>
                : filteredTenants.map((tenant) => <TableRow key={tenant._id || tenant.id}>
                  <TableCell className="font-bold">{tenant.fullName || tenant.name}{tenant.idCard && <span className="mt-1 block text-xs font-normal text-muted-foreground">CCCD {formatCCCD(tenant.idCard)}</span>}</TableCell>
                  <TableCell>{formatPhone(tenant.phone)}</TableCell>
                  <TableCell>{tenant.roomCode || "Chưa xếp phòng"}</TableCell>
                  <TableCell>{tenant.linkedAccountId ? <Badge className="border-0 bg-primary/10 text-primary">Đã liên kết</Badge> : <div className="flex flex-col items-start gap-1"><Badge variant="secondary">Chưa liên kết App</Badge><Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => openInviteModal(tenant)}><Send className="mr-1 size-3" /> Gửi lời mời</Button></div>}</TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Button aria-label={`Tạo mật khẩu tạm cho ${tenant.fullName || tenant.name}`} onClick={() => void handleTemporaryPassword(tenant)} variant="ghost" size="icon"><KeyRound className="size-4" /></Button><Button aria-label={`Sửa ${tenant.fullName || tenant.name}`} onClick={() => openEditModal(tenant)} variant="ghost" size="icon"><Edit className="size-4" /></Button><Button aria-label={`Xóa ${tenant.fullName || tenant.name}`} onClick={() => void handleDelete(tenant._id || tenant.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></Button></div></TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
      <TemporaryPasswordDialog open={Boolean(temporaryPassword)} nguoiThueName={temporaryPasswordName} temporaryPassword={temporaryPassword} onOpenChange={(open) => { if (!open) setTemporaryPassword(""); }} />
    </div>
  );
}
