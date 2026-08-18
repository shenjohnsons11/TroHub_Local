"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Search } from "lucide-react";
import { AppLoading } from "@/components/app-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/calm-ops/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";
import { getStatusText } from "@/lib/status-helpers";

export default function RepairsPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const loadRepairs = async () => {
    try {
      const data = await fetchAPI("/repairs");
      if (data.success) setRepairs(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRepairs();
  }, []);

  const openUpdateModal = (repair: any, status: string) => {
    setSelectedRepair(repair);
    setAssignedTo(repair.assignedTo || "");
    setNewStatus(status);
    setUpdateModalOpen(true);
  };

  const submitUpdateStatus = async () => {
    if (!selectedRepair) return;
    try {
      await fetchAPI(`/repairs/${selectedRepair._id || selectedRepair.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus, assignedTo }),
      });
      notification.success(t("repairs.updatedSuccess"));
      setUpdateModalOpen(false);
      void loadRepairs();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, t("common.error")));
    }
  };

  const getStatusBadge = (status: string) => {
    const label = getStatusText("repair", status, t);
    const normalized = String(status).toLowerCase();
    if (normalized.includes("completed") || normalized.includes("hoàn thành") || normalized.includes("done")) {
      return <Badge className="bg-primary/12 text-primary">{label}</Badge>;
    }
    if (normalized.includes("processing") || normalized.includes("xử lý") || normalized.includes("sửa")) {
      return <Badge variant="secondary">{label}</Badge>;
    }
    return <Badge className="bg-warning-soft text-warning-foreground">{label}</Badge>;
  };

  const filteredRepairs = repairs.filter((repair) =>
    repair.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.content?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.overview")} title={t("repairs.title")} description={t("repairs.subtitle")} />
      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("common.search")}
              placeholder={t("common.search")}
              className="h-11 pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-sm font-bold text-muted-foreground">{repairs.length} {t("repairs.title")}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoices.issuedAt")}</TableHead>
              <TableHead>{t("common.room")}</TableHead>
              <TableHead>{t("repairs.description")}</TableHead>
              <TableHead>{t("common.amount")}</TableHead>
              <TableHead>{t("tenants.fullName")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8"><AppLoading message={t("common.loading")} /></TableCell></TableRow>
            ) : filteredRepairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" />
                  <p className="font-extrabold">{t("common.noData")}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRepairs.map((repair) => (
                <TableRow key={repair._id || repair.id}>
                  <TableCell className="font-medium">{repair.date || "-"}</TableCell>
                  <TableCell className="font-extrabold">{repair.roomCode}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{repair.content}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(repair.cost)}</TableCell>
                  <TableCell>{repair.assignedTo || "—"}</TableCell>
                  <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  <TableCell className="text-right">
                    {String(repair.status).includes("Chờ tiếp nhận") && (
                      <Button onClick={() => openUpdateModal(repair, "Đang xử lý")} variant="ghost" size="icon" aria-label={t("common.edit")}>
                        <CheckCircle2 aria-hidden="true" />
                      </Button>
                    )}
                    {String(repair.status).includes("Đang xử lý") && (
                      <Button onClick={() => openUpdateModal(repair, "Đã hoàn thành")} variant="ghost" size="icon" aria-label={t("common.confirm")}>
                        <CheckCircle2 aria-hidden="true" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("common.update")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">{t("tenants.fullName")}</Label>
              <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="..." />
            </div>
            <Button className="w-full" onClick={() => void submitUpdateStatus()}>{t("common.confirm")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
