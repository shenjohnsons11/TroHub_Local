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

export default function RepairsPage() {
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
      notification.success("Đã cập nhật trạng thái sửa chữa.");
      setUpdateModalOpen(false);
      void loadRepairs();
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể cập nhật trạng thái sửa chữa."));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã hoàn thành": return <Badge className="bg-primary/12 text-primary">Đã hoàn thành</Badge>;
      case "Đang xử lý": return <Badge variant="secondary">Đang xử lý</Badge>;
      case "Chờ tiếp nhận": return <Badge className="bg-warning-soft text-warning-foreground">Chờ tiếp nhận</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRepairs = repairs.filter((repair) =>
    repair.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.content?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hỗ trợ" title="Yêu cầu sửa chữa" description="Tiếp nhận, phản hồi và cập nhật tiến độ cho Người thuê." />
      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm yêu cầu sửa chữa"
              placeholder="Tìm theo phòng, nội dung..."
              className="h-11 pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-sm font-bold text-muted-foreground">{repairs.length} yêu cầu</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày báo</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Chi phí dự kiến</TableHead>
              <TableHead>Người phụ trách</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8"><AppLoading message="Đang tải yêu cầu sửa chữa" /></TableCell></TableRow>
            ) : filteredRepairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center" />
                  <p className="font-extrabold">Chưa có sự cố</p>
                  <p className="mt-1 text-sm text-muted-foreground">Các yêu cầu mới sẽ xuất hiện tại đây.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRepairs.map((repair) => (
                <TableRow key={repair._id || repair.id}>
                  <TableCell className="font-medium">{repair.date || "Chưa cập nhật"}</TableCell>
                  <TableCell className="font-extrabold">{repair.roomCode}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{repair.content}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(repair.cost)}</TableCell>
                  <TableCell>{repair.assignedTo || "—"}</TableCell>
                  <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  <TableCell className="text-right">
                    {repair.status === "Chờ tiếp nhận" && (
                      <Button onClick={() => openUpdateModal(repair, "Đang xử lý")} variant="ghost" size="icon" aria-label={`Tiếp nhận sửa chữa phòng ${repair.roomCode}`}>
                        <CheckCircle2 aria-hidden="true" />
                      </Button>
                    )}
                    {repair.status === "Đang xử lý" && (
                      <Button onClick={() => openUpdateModal(repair, "Đã hoàn thành")} variant="ghost" size="icon" aria-label={`Xác nhận hoàn thành sửa chữa phòng ${repair.roomCode}`}>
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
            <DialogTitle>{newStatus === "Đang xử lý" ? "Tiếp nhận sửa chữa" : "Cập nhật hoàn thành"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Người phụ trách</Label>
              <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Nhập tên người phụ trách..." />
            </div>
            <Button className="w-full" onClick={() => void submitUpdateStatus()}>Xác nhận</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
