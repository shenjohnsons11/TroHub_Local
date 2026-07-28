"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";

import { AppLoading } from "@/components/app-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";

type Service = {
  _id: string;
  name: string;
  code: string;
  type: 1 | 2;
  unit: string;
  defaultPrice: number;
  isActive: boolean;
};

type ServiceForm = {
  name: string;
  code: string;
  type: "1" | "2";
  unit: string;
  defaultPrice: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  code: "",
  type: "2",
  unit: "tháng",
  defaultPrice: "",
  isActive: true,
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function ServicesPage() {
  const notification = useNotification();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchAPI("/services");
      setServices(response.data ?? []);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải danh sách dịch vụ."));
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("vi");
    if (!query) return services;
    return services.filter(
      (service) =>
        service.name.toLocaleLowerCase("vi").includes(query) ||
        service.code.toLocaleLowerCase("vi").includes(query),
    );
  }, [searchTerm, services]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      code: service.code,
      type: String(service.type) as "1" | "2",
      unit: service.unit,
      defaultPrice: String(service.defaultPrice),
      isActive: service.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(form.defaultPrice);
    if (!form.name.trim() || !form.code.trim() || !form.unit.trim()) {
      notification.warning("Vui lòng nhập đầy đủ tên, mã và đơn vị dịch vụ.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      notification.warning("Đơn giá phải là số không âm.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = editingId ? `/services/${editingId}` : "/services";
      await fetchAPI(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          type: Number(form.type),
          unit: form.unit.trim(),
          defaultPrice: price,
          isActive: form.isActive,
        }),
      });
      notification.success(editingId ? "Cập nhật dịch vụ thành công." : "Tạo dịch vụ thành công.");
      setDialogOpen(false);
      await loadServices();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu dịch vụ."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (service: Service) => {
    const confirmed = await notification.confirm({
      title: "Xóa dịch vụ",
      message: `Bạn có chắc chắn muốn xóa dịch vụ “${service.name}”? Dịch vụ đang được sử dụng sẽ được chuyển sang ngừng hoạt động.`,
      confirmText: "Xóa dịch vụ",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetchAPI(`/services/${service._id}`, { method: "DELETE" });
      notification.success(
        response.data?.removalMode === "archived"
          ? "Dịch vụ đang được sử dụng và đã chuyển sang ngừng hoạt động."
          : "Xóa dịch vụ thành công.",
      );
      await loadServices();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể xóa dịch vụ."));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Danh mục vận hành"
        title="Quản lý dịch vụ"
        description="Thiết lập đơn giá và cách tính cho điện, nước cùng các dịch vụ cộng thêm."
        action={<Button onClick={openCreate}><Plus aria-hidden="true" /> Thêm dịch vụ</Button>}
      />

      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm dịch vụ"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên hoặc mã dịch vụ"
              className="h-11 pl-9"
            />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">{services.length} dịch vụ</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dịch vụ</TableHead>
                <TableHead>Cách tính</TableHead>
                <TableHead>Đơn giá</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-8"><AppLoading message="Đang tải danh mục dịch vụ" /></TableCell></TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-[center_72%]" />
                    <p className="font-extrabold text-foreground">Chưa có dịch vụ phù hợp</p>
                    <p className="mt-1 text-sm text-muted-foreground">Thêm dịch vụ mới hoặc thay đổi từ khóa tìm kiếm.</p>
                  </TableCell>
                </TableRow>
              ) : filteredServices.map((service) => (
                <TableRow key={service._id}>
                  <TableCell>
                    <p className="font-extrabold text-foreground">{service.name}</p>
                    <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">{service.code}</p>
                  </TableCell>
                  <TableCell>{service.type === 1 ? "Theo chỉ số" : "Tính khoán"} · {service.unit}</TableCell>
                  <TableCell className="text-base font-black">{currencyFormatter.format(service.defaultPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(service)} aria-label={`Sửa ${service.name}`}>
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void handleDelete(service)} aria-label={`Xóa ${service.name}`} className="text-destructive">
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[20px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-name">Tên dịch vụ</Label>
                <Input id="service-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ví dụ: Internet" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-code">Mã dịch vụ</Label>
                <Input id="service-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="INTERNET" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-type">Cách tính</Label>
                <select id="service-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as "1" | "2" })} className="flex h-10 w-full rounded-[16px] border border-input bg-background px-3 text-sm">
                  <option value="1">Theo chỉ số</option>
                  <option value="2">Tính khoán</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-unit">Đơn vị</Label>
                <Input id="service-unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="kWh, m³, tháng" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">Đơn giá mặc định</Label>
              <Input id="service-price" type="number" min="0" step="1" value={form.defaultPrice} onChange={(event) => setForm({ ...form, defaultPrice: event.target.value })} placeholder="0" />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-[16px] bg-muted/55 p-3">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-semibold text-foreground">Dịch vụ đang hoạt động</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}><X aria-hidden="true" /> Hủy</Button>
              <Button type="submit" disabled={submitting}><Save aria-hidden="true" />{submitting ? "Đang lưu..." : "Lưu dịch vụ"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
