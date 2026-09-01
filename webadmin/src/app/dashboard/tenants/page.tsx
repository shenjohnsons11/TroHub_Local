"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Edit, KeyRound, Plus, Search, Trash2, UserRound, Send } from "lucide-react";
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
import { issueTemporaryPassword } from "@/lib/password-reset";
import { TemporaryPasswordDialog } from "@/components/temporary-password-dialog";
import { useLanguage } from "@/components/language-provider";

export default function TenantsPage() {
  const notification = useNotification();
  const { t } = useLanguage();
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [lookupIdentifier, setLookupIdentifier] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "new" | "error">("idle");
  const [existingTenantId, setExistingTenantId] = useState<string | null>(null);
  const [savingTenant, setSavingTenant] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{ value: string; name: string } | null>(null);

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([fetchAPI("/tenants"), fetchAPI("/rooms")]);
      if (tenantsData.success) setTenants(tenantsData.data);
      if (roomsData.success) setRooms(roomsData.data.filter((room: any) => room.status === 0));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
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
    setLookupIdentifier("");
    setLookupStatus("idle");
    setExistingTenantId(null);
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
      setSavingTenant(true);
      if (editingTenantId) {
        await fetchAPI(`/tenants/${editingTenantId}`, { method: "PUT", body: JSON.stringify({ fullName, phone: unformatDigits(phone), idCard: unformatDigits(idCard) }) });
        setIsEditOpen(false);
      } else {
        const payload = { fullName, phone: unformatDigits(phone), email: email.trim().toLowerCase(), idCard: unformatDigits(idCard), roomCode };
        await fetchAPI("/tenants", { method: "POST", body: JSON.stringify(payload) });
        setIsAddOpen(false);
      }
      notification.success(editingTenantId ? t("tenants.updatedSuccess") : t("tenants.createdSuccess"));
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setSavingTenant(false);
    }
  };

  useEffect(() => {
    if (!isAddOpen || !lookupIdentifier) return;
    const digits = unformatDigits(lookupIdentifier);
    const ready = digits.length === 10 || digits.length === 12 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lookupIdentifier.trim());
    if (!ready) { setLookupStatus("idle"); return; }
    let active = true;
    setLookupStatus("loading");
    const timer = setTimeout(() => {
      fetchAPI(`/tenants/lookup?identifier=${encodeURIComponent(lookupIdentifier)}`).then((result) => {
        if (!active) return;
        if (result.found && result.data) {
          setExistingTenantId(result.data._id);
          setFullName(result.data.fullName || "");
          setPhone(formatPhone(result.data.phone));
          setEmail(result.data.email || "");
          setIdCard(formatCCCD(result.data.idCard));
          setLookupStatus("found");
        } else {
          setExistingTenantId(null);
          setLookupStatus("new");
        }
      }).catch(() => { if (active) setLookupStatus("error"); });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [isAddOpen, lookupIdentifier]);

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({
      title: t("common.delete"),
      message: t("tenants.deleteConfirm"),
      confirmText: t("common.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await fetchAPI(`/tenants/${id}`, { method: "DELETE" });
      notification.success(t("tenants.deletedSuccess"));
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    }
  };

  const handleTemporaryPassword = async (tenant: any) => {
    try {
      const response = await issueTemporaryPassword(tenant._id || tenant.id);
      setTemporaryPassword({ value: response.temporaryPassword, name: tenant.fullName || tenant.name || t("common.tenant") });
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    }
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
      const message = encodeURIComponent(`Hello ${inviteTenantName}, please join TroHub to manage your rental lease: https://trohub.app/download`);
      window.location.href = `sms:${cleanPhone}?body=${message}`;
    }
    notification.success(t("common.success"));
    setInviteModalOpen(false);
  };

  const filteredTenants = tenants.filter((tenant) =>
    tenant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || tenant.phone?.includes(searchTerm),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.overview")} title={t("tenants.title")} description={t("tenants.subtitle")} />
      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={t("common.search")} placeholder={t("tenants.phone") + ", " + t("tenants.fullName") + "..."} className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger onClick={openAddModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="size-4" />{t("tenants.addTenant")}
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader><DialogTitle>{t("tenants.addTenant")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveTenant} className="mt-2 space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">{t("tenants.lookupHint")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="phone">{t("tenants.phone")}</Label><Input id="phone" autoFocus value={phone} onChange={(event) => { const value = formatPhone(event.target.value); setPhone(value); setLookupIdentifier(value); }} placeholder="0901.234.567" required readOnly={Boolean(existingTenantId)} /></div>
                <div className="space-y-2"><Label htmlFor="idCard">{t("tenants.idCard")}</Label><Input id="idCard" value={idCard} onChange={(event) => { const value = formatCCCD(event.target.value); setIdCard(value); setLookupIdentifier(value); }} placeholder="0790.1234.5678" required readOnly={Boolean(existingTenantId)} /></div>
                <div className="space-y-2"><Label htmlFor="email">{t("tenants.email")}</Label><Input id="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLookupIdentifier(event.target.value); }} placeholder="tenant@gmail.com" required readOnly={Boolean(existingTenantId)} /></div>
                <div className="space-y-2"><Label htmlFor="fullName">{t("tenants.fullName")}</Label><Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Nguyen Van A" readOnly={Boolean(existingTenantId)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="roomCode">{t("tenants.currentRoom")}</Label><select id="roomCode" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} className="flex h-10 w-full rounded-[16px] border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">{t("tenants.unassigned")}</option>{rooms.map((room) => <option key={room._id || room.id} value={room.roomCode}>{room.roomCode}</option>)}</select></div>
              {lookupStatus !== "idle" && <div aria-live="polite" className="flex items-center gap-3 rounded-[16px] bg-primary/10 p-3 text-sm"><Search className={`size-4 shrink-0 text-primary ${lookupStatus === "loading" ? "animate-pulse" : ""}`} /><p className="flex-1">{lookupStatus === "loading" ? t("common.loading") : lookupStatus === "found" ? t("tenants.lookupFound") : lookupStatus === "error" ? t("common.error") : t("common.new")}</p>{existingTenantId && <Button type="button" variant="link" className="h-auto p-0" onClick={openAddModal}>{t("common.edit")}</Button>}</div>}
              <Button type="submit" className="w-full" disabled={savingTenant || lookupStatus === "loading"}><UserRound className="size-4" />{existingTenantId ? t("common.save") : t("tenants.addTenant")}</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader><DialogTitle>{t("tenants.editTenant")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveTenant} className="mt-4 space-y-4">
              <div className="space-y-2"><Label htmlFor="editFullName">{t("tenants.fullName")}</Label><Input id="editFullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="editPhone">{t("tenants.phone")}</Label><Input id="editPhone" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} required /></div>
              <div className="space-y-2"><Label htmlFor="editIdCard">{t("tenants.idCard")}</Label><Input id="editIdCard" value={idCard} onChange={(event) => setIdCard(formatCCCD(event.target.value))} required /></div>
              <Button type="submit" className="w-full"><UserRound className="size-4" />{t("common.update")}</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>{t("common.send")}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="invitePhone">{t("tenants.phone")}</Label>
                <Input id="invitePhone" value={invitePhone} onChange={(e) => setInvitePhone(formatPhone(e.target.value))} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="w-full bg-[#0068FF] hover:bg-[#0054cc] text-white" onClick={() => handleSendInvite("zalo")}>Zalo</Button>
                <Button className="w-full" variant="outline" onClick={() => handleSendInvite("sms")}>SMS</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <div className="calm-workbench">
        <Table>
          <TableHeader><TableRow><TableHead>{t("tenants.fullName")}</TableHead><TableHead>{t("tenants.phone")}</TableHead><TableHead>{t("tenants.currentRoom")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="text-right">{t("common.action")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground"><UserRound className="mx-auto mb-2 size-8 animate-pulse text-primary" />{t("common.loading")}</TableCell></TableRow>
              : filteredTenants.length === 0 ? <TableRow><TableCell colSpan={5} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" /><p className="mt-3 font-black">{t("tenants.emptyTenants")}</p></TableCell></TableRow>
                : filteredTenants.map((tenant) => <TableRow key={tenant._id || tenant.id}>
                  <TableCell className="font-bold">{tenant.fullName || tenant.name}{tenant.idCard && <span className="mt-1 block text-xs font-normal text-muted-foreground">{t("tenants.idCard")} {formatCCCD(tenant.idCard)}</span>}</TableCell>
                  <TableCell>{formatPhone(tenant.phone)}</TableCell>
                  <TableCell>{tenant.roomCode || t("tenants.unassigned")}</TableCell>
                  <TableCell>{tenant.linkedAccountId ? <Badge className="border-0 bg-primary/10 text-primary">{t("tenants.assigned")}</Badge> : <div className="flex flex-col items-start gap-1"><Badge variant="secondary">{t("tenants.unassigned")}</Badge><Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => openInviteModal(tenant)}><Send className="mr-1 size-3" /> {t("common.send")}</Button></div>}</TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Button aria-label={t("common.edit")} onClick={() => void handleTemporaryPassword(tenant)} variant="ghost" size="icon"><KeyRound className="size-4" /></Button><Button aria-label={t("common.edit")} onClick={() => openEditModal(tenant)} variant="ghost" size="icon"><Edit className="size-4" /></Button><Button aria-label={t("common.delete")} onClick={() => void handleDelete(tenant._id || tenant.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></Button></div></TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
      <TemporaryPasswordDialog open={Boolean(temporaryPassword)} nguoiThueName={temporaryPassword?.name || ""} temporaryPassword={temporaryPassword?.value || ""} onOpenChange={(open) => { if (!open) setTemporaryPassword(null); }} />
    </div>
  );
}
