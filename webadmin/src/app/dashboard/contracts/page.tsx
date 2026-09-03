"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI, fetchBlob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Edit, Eye, FileSignature, Plus, Search, Send, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency, formatMeterReading, formatNumberInput, formatPhone, parseMeterReading, unformatNumber } from "@/lib/formatters";
import { PageHeader } from "@/components/calm-ops/page-header";
import { safeJsonParse } from "@/lib/client-storage";
import { Skeleton } from "@/components/ui/skeleton";
import { MeterLedger } from "@/components/meter-ledger";
import { useLanguage } from "@/components/language-provider";
import { getStatusText } from "@/lib/status-helpers";

type CheckoutPreview = {
  roomCode: string;
  depositAmount: number;
  unpaidAmount: number;
  electricityOld: number;
  waterOld: number;
  electricityPrice: number;
  waterPrice: number;
};

export default function ContractsPage() {
  const notification = useNotification();
  const { t } = useLanguage();
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
  const [damageAmount, setDamageAmount] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutPreviewLoading, setCheckoutPreviewLoading] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutPreview | null>(null);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverContractId, setHandoverContractId] = useState("");
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [handoverElectricity, setHandoverElectricity] = useState("");
  const [handoverWater, setHandoverWater] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  
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
  const [electricityPrice, setElectricityPrice] = useState(formatNumberInput(3500));
  const [waterPrice, setWaterPrice] = useState(formatNumberInput(15000));
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<{serviceId: string, fixedPrice: string}[]>([]);

  const computedStatus = (() => {
    if (!startDate) return t("contracts.status.active");
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start > today ? t("statusMap.contract.pendingTenant") : t("contracts.status.active");
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
      const drafts = safeJsonParse<unknown>(localStorage.getItem("@trohub_draft_contracts"), []);
      const user = safeJsonParse<{ id?: string; _id?: string }>(localStorage.getItem("trohub_user"), {});
      const adminId = user.id || user._id;
      const localDraft = adminId
        ? safeJsonParse<Record<string, unknown> | null>(localStorage.getItem(`trohub:contract-draft:${adminId}`), null)
        : null;
      setDraftContracts(localDraft ? [{ ...localDraft, id: "local" }] : (Array.isArray(drafts) ? drafts : []));
    } catch (e) {
      console.error("Failed to load drafts", e);
    }
  }, []);

  const handleDeleteDraft = (id: string) => {
    const newDrafts = draftContracts.filter(d => d.id !== id);
    setDraftContracts(newDrafts);
    localStorage.setItem("@trohub_draft_contracts", JSON.stringify(newDrafts));
    const user = safeJsonParse<{ id?: string; _id?: string }>(localStorage.getItem("trohub_user"), {});
    const adminId = user.id || user._id;
    if (id === "local" && adminId) localStorage.removeItem(`trohub:contract-draft:${adminId}`);
  };

  const openCheckoutModal = async (id: string) => {
    setCheckoutContractId(id);
    setFinalElectricity("");
    setFinalWater("");
    setDamageAmount("");
    setCheckoutNote("");
    setCheckoutPreview(null);
    setCheckoutModalOpen(true);
    setCheckoutPreviewLoading(true);
    try {
      const response = await fetchAPI(`/contracts/${id}/checkout-preview`);
      setCheckoutPreview(response.data);
      setFinalElectricity(formatMeterReading(response.data.electricityOld));
      setFinalWater(formatMeterReading(response.data.waterOld));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
      setCheckoutModalOpen(false);
    } finally {
      setCheckoutPreviewLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const openViewer = async (id: string) => {
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerError(null);
    try {
      const blob = await fetchBlob(`/contracts/${id}/pdf`);
      setViewerUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : "Không thể tải tài liệu hợp đồng.");
    } finally {
      setViewerLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const electricity = parseMeterReading(finalElectricity);
    const water = parseMeterReading(finalWater);
    if (!checkoutPreview || electricity === null || water === null || electricity < checkoutPreview.electricityOld || water < checkoutPreview.waterOld) {
      notification.error(t("common.error"));
      return;
    }
    try {
      setCheckoutSubmitting(true);
      const response = await fetchAPI(`/contracts/${checkoutContractId}/checkout`, {
        method: "PUT",
        body: JSON.stringify({
          finalElectricity: electricity,
          finalWater: water,
          damageAmount: unformatNumber(damageAmount),
          note: checkoutNote
        })
      });
      notification.success(t("contracts.checkoutSuccess"));
      setCheckoutModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const openEditModal = (contract: any) => {
    setEditContractId(contract._id || contract.id);
    setRoomId(contract.roomId?._id || contract.roomId?.id || contract.roomId);
    setTenantId(contract.tenantId?._id || contract.tenantId?.id || contract.tenantId);
    setStartDate(contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "");
    setEndDate(contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "");
    setRent(formatNumberInput(contract.fixedRentPrice));
    setDeposit(formatNumberInput(contract.fixedDeposit));
    setElectricityPrice(formatNumberInput(contract.electricityPrice ?? 3500));
    setWaterPrice(formatNumberInput(contract.waterPrice ?? 15000));

    const room = rooms.find(item => (item._id || item.id) === (contract.roomId?._id || contract.roomId?.id || contract.roomId));
    setInitialElectricity(
      formatMeterReading(
        contract.initialElectricity ?? room?.lastElectricityReading ?? room?.draftElectricity,
      )
    );
    setInitialWater(
      formatMeterReading(
        contract.initialWater ?? room?.lastWaterReading ?? room?.draftWater,
      )
    );

    const preselectedServices = (contract.services || []).map((s: any) => ({
      serviceId: s.serviceId?._id || s.serviceId?.id || s.serviceId,
      fixedPrice: formatNumberInput(s.fixedPrice)
    }));
    setSelectedServices(preselectedServices);
    setIsAddOpen(true);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedRoom = rooms.find(r => (r._id || r.id) === roomId);
      const selectedTenant = tenants.find(t => (t._id || t.id) === tenantId);
      
      if (!selectedRoom || !selectedTenant) throw new Error(t("common.error"));
      const payload = { 
        roomId: selectedRoom._id || selectedRoom.id, 
        tenantId: selectedTenant._id || selectedTenant.id, 
        startDate,
        endDate,
        fixedRentPrice: unformatNumber(rent),
        fixedDeposit: unformatNumber(deposit),
        electricityPrice: unformatNumber(electricityPrice || "3500"),
        waterPrice: unformatNumber(waterPrice || "15000"),
        services: selectedServices.map(s => ({
          serviceId: s.serviceId,
          fixedPrice: unformatNumber(s.fixedPrice)
        })),
        initialElectricity: initialElectricity ? parseMeterReading(initialElectricity) ?? undefined : undefined,
        initialWater: initialWater ? parseMeterReading(initialWater) ?? undefined : undefined,
        status: 1
      };
      
      const endpoint = editContractId ? `/contracts/${editContractId}` : "/contracts";
      const method = editContractId ? "PUT" : "POST";

      await fetchAPI(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      setIsAddOpen(false);
      notification.success(t("contracts.createdSuccess"));
      loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    }
  };

  const openHandoverModal = (contract: any) => {
    setHandoverContractId(contract._id || contract.id);
    setHandoverDate(new Date().toISOString().slice(0, 10));
    setHandoverElectricity(formatMeterReading(contract.initialElectricity ?? contract.roomId?.lastElectricityReading));
    setHandoverWater(formatMeterReading(contract.initialWater ?? contract.roomId?.lastWaterReading));
    setHandoverModalOpen(true);
  };

  const handleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const electricity = parseMeterReading(handoverElectricity);
    const water = parseMeterReading(handoverWater);
    if (electricity === null || water === null || !handoverDate) {
      notification.error(t("contracts.handoverRequired"));
      return;
    }
    try {
      setHandoverSubmitting(true);
      await fetchAPI(`/contracts/${handoverContractId}/handover`, {
        method: "PUT",
        body: JSON.stringify({ initialElectricity: electricity, initialWater: water, handoverDate }),
      });
      notification.success(t("contracts.handoverSuccess"));
      setHandoverModalOpen(false);
      await loadData();
    } catch (error) {
      notification.error(getNotificationMessage(error, t("contracts.handoverFailed")));
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handleSendContract = async (id: string) => {
    try {
      await fetchAPI(`/contracts/${id}/send`, { method: "POST" });
      notification.success(t("common.success"));
      await loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({ title: t("common.delete"), message: t("contracts.deleteConfirm"), confirmText: t("common.delete"), destructive: true });
    if (!confirmed) return;
    try {
      await fetchAPI(`/contracts/${id}`, { method: "DELETE" });
      notification.success(t("common.success"));
      loadData();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const roomMatches = contract.roomId?.roomCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const tenantMatches = (contract.tenantId?.fullName || contract.tenantId?.name)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSearch = roomMatches || tenantMatches;
    if (!matchSearch) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return contract.status === 0 || contract.status === 5;
    if (activeFilter === "reserved") return contract.status === 4;
    if (activeFilter === "active") return contract.status === 1;
    if (activeFilter === "checkout") return Boolean(contract.checkoutRequestedAt) || contract.status === 2;
    return true;
  });

  const checkoutCalculation = (() => {
    if (!checkoutPreview) return null;
    const finalElec = parseMeterReading(finalElectricity) ?? checkoutPreview.electricityOld;
    const finalWat = parseMeterReading(finalWater) ?? checkoutPreview.waterOld;
    const elecUsage = Math.max(0, finalElec - checkoutPreview.electricityOld);
    const watUsage = Math.max(0, finalWat - checkoutPreview.waterOld);
    const utilitiesAmount = (elecUsage * checkoutPreview.electricityPrice) + (watUsage * checkoutPreview.waterPrice);
    const totalDebt = checkoutPreview.unpaidAmount + utilitiesAmount + unformatNumber(damageAmount);
    const balance = checkoutPreview.depositAmount - totalDebt;
    return {
      utilitiesAmount,
      totalDebt,
      refundAmount: Math.max(0, balance),
      amountDue: Math.max(0, -balance),
    };
  })();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.overview")} title={t("contracts.title")} description={t("contracts.subtitle")} />
      <section className="calm-surface flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: t("common.all") },
            { id: "pending", label: t("statusMap.contract.pendingTenant") },
            { id: "reserved", label: t("statusMap.contract.reserved") },
            { id: "active", label: t("contracts.status.active") },
            { id: "checkout", label: t("contracts.checkout") },
            { id: "draft", label: t("contracts.draft") },
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
              placeholder={t("common.search")}
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

        <div className="flex gap-2">
          <Link href="/dashboard/contracts/new" className="flex h-10 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> {t("contracts.createContract")}
          </Link>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editContractId ? t("common.edit") : t("contracts.createContract")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateContract} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomSelect">{t("contracts.room")} *</Label>
                  <select 
                    id="roomSelect" 
                    value={roomId} 
                    onChange={e => {
                      setRoomId(e.target.value);
                      const r = rooms.find(x => (x._id || x.id) === e.target.value);
                      if (r) {
                        setRent(formatNumberInput(r.defaultRentPrice));
                        setDeposit(formatNumberInput(r.defaultDeposit || r.defaultRentPrice));
                        setInitialElectricity(formatMeterReading(r.lastElectricityReading ?? r.draftElectricity));
                        setInitialWater(formatMeterReading(r.lastWaterReading ?? r.draftWater));
                      }
                    }}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>-- {t("contracts.room")} --</option>
                    {rooms.map(r => <option key={r._id || r.id} value={r._id || r.id}>{r.roomCode}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantSelect">{t("contracts.tenant")} *</Label>
                  <select 
                    id="tenantSelect" 
                    value={tenantId} 
                    onChange={e => setTenantId(e.target.value)}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>-- {t("contracts.tenant")} --</option>
                    {tenants.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.fullName || t.name} ({formatPhone(t.phone)})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("contracts.startDate")} *</Label>
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
                  <Label htmlFor="endDate">{t("contracts.endDate")}</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">{t("contracts.rentalPrice")} *</Label>
                  <Input 
                    id="rent" 
                    type="text" 
                    value={rent} 
                    onChange={e => setRent(formatNumberInput(e.target.value))}
                    required 
                    placeholder="VD: 3.000.000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">{t("contracts.depositAmount")} *</Label>
                  <Input 
                    id="deposit" 
                    type="text" 
                    value={deposit} 
                    onChange={e => setDeposit(formatNumberInput(e.target.value))}
                    required 
                    placeholder="VD: 3.000.000" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="electricityPrice">{t("contracts.electricityPrice")} (đ/kWh) *</Label>
                  <Input
                    id="electricityPrice"
                    inputMode="decimal"
                    value={electricityPrice}
                    onChange={e => setElectricityPrice(formatNumberInput(e.target.value))}
                    placeholder="VD: 3.500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waterPrice">{t("contracts.waterPrice")} (đ/m³) *</Label>
                  <Input
                    id="waterPrice"
                    inputMode="decimal"
                    value={waterPrice}
                    onChange={e => setWaterPrice(formatNumberInput(e.target.value))}
                    placeholder="VD: 15.000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialElectricity">{t("contracts.initialElec")}</Label>
                  <Input
                    id="initialElectricity"
                    inputMode="decimal"
                    value={initialElectricity}
                    onChange={e => { const value = e.target.value; setInitialElectricity(parseMeterReading(value) === null ? value : formatMeterReading(value)); }}
                    placeholder="VD: 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialWater">{t("contracts.initialWater")}</Label>
                  <Input
                    id="initialWater"
                    inputMode="decimal"
                    value={initialWater}
                    onChange={e => { const value = e.target.value; setInitialWater(parseMeterReading(value) === null ? value : formatMeterReading(value)); }}
                    placeholder="VD: 50"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <Label htmlFor="status">{t("common.status")}</Label>
                  <Input 
                    id="status" 
                    value={computedStatus} 
                    disabled 
                    className="cursor-not-allowed font-semibold bg-primary/10 text-primary"
                  />
              </div>

              <Button type="submit" className="mt-4 w-full"><FileSignature className="size-4" />{editContractId ? t("common.save") : t("contracts.createContract")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={viewerOpen} onOpenChange={(open) => open ? setViewerOpen(true) : closeViewer()}>
          <DialogContent className="w-[min(96vw,1100px)] max-w-none h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="size-5 text-primary" />
                Xem trước toàn bộ hợp đồng
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 rounded-xl border border-border bg-muted/20 overflow-hidden">
              {viewerLoading ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : viewerError ? (
                <div className="h-full grid place-items-center text-sm text-destructive">{viewerError}</div>
              ) : viewerUrl ? (
                <iframe title={t("contracts.detail")} src={viewerUrl} className="h-full w-full border-0" />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>{t("contracts.handover")}</DialogTitle></DialogHeader>
            <form onSubmit={handleHandover} className="space-y-4 mt-4">
              <p className="rounded-2xl bg-primary/10 p-3 text-sm text-muted-foreground">{t("contracts.handoverHint")}</p>
              <div className="space-y-2"><Label htmlFor="handoverDate">{t("contracts.handoverDate")}</Label><Input id="handoverDate" type="date" value={handoverDate} onChange={e => setHandoverDate(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="handoverElectricity">{t("contracts.initialElec")}</Label><Input id="handoverElectricity" inputMode="decimal" value={handoverElectricity} onChange={e => setHandoverElectricity(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="handoverWater">{t("contracts.initialWater")}</Label><Input id="handoverWater" inputMode="decimal" value={handoverWater} onChange={e => setHandoverWater(e.target.value)} required /></div>
              <Button type="submit" disabled={handoverSubmitting} className="w-full">{handoverSubmitting ? t("common.loading") : t("contracts.confirmHandover")}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("contracts.settleDeposit")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCheckout} className="space-y-4 mt-4">
              {checkoutPreviewLoading ? (
                <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : checkoutPreview && checkoutCalculation ? (
                <div className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
                  <div className="flex justify-between"><span>{t("contracts.depositAmount")}</span><strong>{formatCurrency(checkoutPreview.depositAmount)}</strong></div>
                  <div className="flex justify-between"><span>(−) {t("invoices.status.unpaid")}</span><strong>{formatCurrency(checkoutPreview.unpaidAmount)}</strong></div>
                  <div className="flex justify-between"><span>(−) {t("utilities.title")}</span><strong>{formatCurrency(checkoutCalculation.utilitiesAmount)}</strong></div>
                  <div className="flex justify-between"><span>(−) {t("common.amount")}</span><strong>{formatCurrency(unformatNumber(damageAmount))}</strong></div>
                  <div className="flex justify-between border-t border-border pt-2"><span>{t("debts.totalDebt")}</span><strong>{formatCurrency(checkoutCalculation.totalDebt)}</strong></div>
                  <div className={`rounded-xl p-3 text-center font-black ${checkoutCalculation.amountDue > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {checkoutCalculation.amountDue > 0
                      ? `${t("debts.totalDebt")}: ${formatCurrency(checkoutCalculation.amountDue)}`
                      : `${t("contracts.settleDeposit")}: ${formatCurrency(checkoutCalculation.refundAmount)}`}
                  </div>
                </div>
              ) : null}
              {checkoutPreview ? <div className="space-y-3"><MeterLedger label={t("nav.utilities")} unit="kWh" previous={checkoutPreview.electricityOld} current={finalElectricity} unitPrice={checkoutPreview.electricityPrice} onChange={setFinalElectricity} /><MeterLedger label={t("nav.utilities")} unit="m³" previous={checkoutPreview.waterOld} current={finalWater} unitPrice={checkoutPreview.waterPrice} onChange={setFinalWater} /></div> : null}
              <div className="space-y-2">
                <Label htmlFor="damageAmount">{t("common.amount")} (VNĐ)</Label>
                <Input
                  id="damageAmount"
                  type="text"
                  value={damageAmount}
                  onChange={e => setDamageAmount(formatNumberInput(e.target.value))}
                  placeholder="VD: 500.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkoutNote">{t("common.note")}</Label>
                <textarea
                  id="checkoutNote"
                  className="flex min-h-[80px] w-full rounded-[16px] border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={checkoutNote}
                  onChange={e => setCheckoutNote(e.target.value)}
                  placeholder="..."
                />
              </div>
              <Button type="submit" disabled={checkoutSubmitting || checkoutPreviewLoading || !checkoutPreview} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {checkoutSubmitting ? t("common.loading") : t("contracts.checkout")}
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
               {t("common.noData")}
            </div>
          ) : (
            draftContracts.map((draft, i) => (
              <div key={draft.id || i} className="calm-surface p-4 rounded-[20px] border border-border shadow-[var(--calm-shadow)] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">{t("contracts.draft")} #{draft.id || i+1}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Step {draft.step || 1}</p>
                  </div>
                  <Button aria-label={t("contracts.deleteDraft")} onClick={() => handleDeleteDraft(draft.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <Trash2 className="size-4" /> {t("contracts.deleteDraft")}
                  </Button>
                </div>
                <div className="mt-auto pt-4 border-t border-border">
                  <Link href={`/dashboard/contracts/new`} className="w-full flex items-center justify-center">
                    <Button className="w-full font-bold shadow-[var(--calm-shadow)]" variant="secondary">
                      ✏️ {t("contracts.resumeDraft")}
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
              <TableHead className="min-w-48 font-semibold text-foreground">{t("contracts.room")} / {t("contracts.tenant")}</TableHead>
              <TableHead className="font-semibold text-foreground">{t("contracts.startDate")}</TableHead>
              <TableHead className="font-semibold text-foreground">{t("contracts.depositAmount")}</TableHead>
              <TableHead className="font-semibold text-foreground">{t("common.status")}</TableHead>
              <TableHead className="text-right font-semibold text-foreground">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-4"><div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div></TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center"><Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" /><p className="mt-3 font-black">{t("common.noData")}</p></TableCell>
              </TableRow>
            ) : (
              filteredContracts.map(contract => (
                <TableRow key={contract._id || contract.id}>
                  <TableCell className="min-w-48 whitespace-normal">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">{contract.roomId?.roomCode || "-"}</span>
                      <span className="text-xs text-muted-foreground">{contract.tenantId?.fullName || contract.tenantId?.name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{formatCurrency(contract.fixedDeposit || contract.deposit)}</TableCell>
                  <TableCell>
                    {(() => {
                      const displayStatus = getStatusText("contract", contract.status, t);
                      return (
                        <Badge className="border-0 bg-primary/10 text-primary">
                          {displayStatus}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => void openViewer(contract._id || contract.id)} variant="outline" size="sm" className="mr-2">
                      <Eye className="size-4" /> {t("contracts.viewContract")}
                    </Button>
                    {contract.status === 0 && (
                      <Button onClick={() => void handleSendContract(contract._id || contract.id)} variant="outline" size="sm" className="mr-2">
                        <Send className="size-4" />{t("common.send")}
                      </Button>
                    )}
                    {contract.status === 4 && (
                      <Button onClick={() => openHandoverModal(contract)} variant="secondary" size="sm" className="mr-2 text-primary">
                        <CheckCircle2 className="size-4" />{t("contracts.handover")}
                      </Button>
                    )}
                    {(contract.checkoutRequestedAt || contract.status === 2) && (
                      <Button onClick={() => void openCheckoutModal(contract._id || contract.id)} variant="outline" size="sm" className="mr-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                        {t("contracts.checkout")}
                      </Button>
                    )}
                    {contract.status === 0 && (
                      <Button onClick={() => openEditModal(contract)} variant="ghost" size="sm" className="mr-2">
                        <Edit className="size-4" />{t("common.edit")}
                      </Button>
                    )}
                    <Button aria-label={t("common.delete")} onClick={() => handleDelete(contract._id || contract.id)} variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
