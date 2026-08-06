"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatNumberInput, unformatNumber } from "@/lib/formatters";
import { getNotificationMessage } from "@/lib/notification-messages";

type Service = {
  _id: string;
  name: string;
  code: string;
  type: 1 | 2;
  billingMode?: "FIXED" | "QUANTITY" | "METER";
  unit: string;
  defaultPrice: number;
  defaultQuantity?: number;
  isActive: boolean;
};

type ServiceForm = {
  name: string;
  code: string;
  billingMode: "FIXED" | "QUANTITY" | "METER";
  unit: string;
  defaultPrice: string;
  defaultQuantity: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  code: "",
  billingMode: "FIXED",
  unit: "tháng",
  defaultPrice: "",
  defaultQuantity: "1",
  isActive: true,
};

type PriceImpact = {
  serviceId: string;
  currentPrice: number;
  newPrice: number;
  contracts: Array<{
    contractId: string;
    roomCode: string;
    currentPrice: number;
    newPrice: number;
  }>;
};

export default function ServicesPage() {
  const notification = useNotification();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [priceImpact, setPriceImpact] = useState<PriceImpact | null>(null);
  const [priceScope, setPriceScope] = useState<"NEW_CONTRACTS_ONLY" | "SELECTED_ACTIVE_CONTRACTS">("NEW_CONTRACTS_ONLY");
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);

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
    setEditingService(null);
    setPriceImpact(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingId(service._id);
    setEditingService(service);
    setPriceImpact(null);
    setForm({
      name: service.name,
      code: service.code,
      billingMode: service.billingMode || (service.type === 1 ? "METER" : "FIXED"),
      unit: service.unit,
      defaultPrice: formatNumberInput(service.defaultPrice),
      defaultQuantity: String(service.defaultQuantity ?? 1),
      isActive: service.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = unformatNumber(form.defaultPrice);
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
      const priceChanged = Boolean(editingService) && price !== editingService?.defaultPrice;
      await fetchAPI(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          billingMode: form.billingMode,
          unit: form.unit.trim(),
          ...(!editingId || !priceChanged ? { defaultPrice: price } : {}),
          defaultQuantity: Number(form.defaultQuantity),
          isActive: form.isActive,
        }),
      });
      if (editingId && priceChanged) {
        const impactResponse = await fetchAPI(`/services/${editingId}/price-impact`, {
          method: "POST",
          body: JSON.stringify({ newPrice: price }),
        });
        setPriceImpact(impactResponse.data);
        setPriceScope("NEW_CONTRACTS_ONLY");
        setSelectedContractIds([]);
        notification.info("Hãy chọn phạm vi áp dụng đơn giá mới.");
        await loadServices();
        return;
      }
      notification.success(editingId ? "Cập nhật dịch vụ thành công." : "Tạo dịch vụ thành công.");
      setDialogOpen(false);
      await loadServices();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể lưu dịch vụ."));
    } finally {
      setSubmitting(false);
    }
  };

  const applyPriceChange = async () => {
    if (!editingId || !priceImpact) return;
    if (priceScope === "SELECTED_ACTIVE_CONTRACTS" && selectedContractIds.length === 0) {
      notification.warning("Vui lòng chọn ít nhất một hợp đồng đang hiệu lực.");
      return;
    }
    try {
      setSubmitting(true);
      await fetchAPI(`/services/${editingId}/price`, {
        method: "PUT",
        body: JSON.stringify({
          newPrice: priceImpact.newPrice,
          scope: priceScope,
          contractIds: priceScope === "SELECTED_ACTIVE_CONTRACTS" ? selectedContractIds : [],
        }),
      });
      notification.success(
        priceScope === "NEW_CONTRACTS_ONLY"
          ? "Đơn giá mới sẽ áp dụng cho hợp đồng tạo sau thời điểm này."
          : `Đã cập nhật ${selectedContractIds.length} hợp đồng được chọn.`,
      );
      setDialogOpen(false);
      setPriceImpact(null);
      await loadServices();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể áp dụng đơn giá mới."));
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Danh mục vận hành</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.025em] text-foreground">Quản lý dịch vụ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Thiết lập đơn giá và cách tính cho điện, nước cùng các dịch vụ cộng thêm.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11 rounded-[10px] font-bold">
          <Plus className="mr-2 h-4 w-4" /> Thêm dịch vụ
        </Button>
      </header>

      <section className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên hoặc mã dịch vụ"
              className="h-11 rounded-[10px] pl-9"
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
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Đang tải dịch vụ...</TableCell></TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Wrench className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                    <p className="font-bold text-foreground">Chưa có dịch vụ phù hợp</p>
                    <p className="mt-1 text-sm text-muted-foreground">Thêm dịch vụ mới hoặc thay đổi từ khóa tìm kiếm.</p>
                  </TableCell>
                </TableRow>
              ) : filteredServices.map((service) => (
                <TableRow key={service._id}>
                  <TableCell>
                    <p className="font-bold text-foreground">{service.name}</p>
                    <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">{service.code}</p>
                  </TableCell>
                  <TableCell>
                    {service.billingMode === "QUANTITY"
                      ? "Theo số lượng"
                      : service.billingMode === "METER" || service.type === 1
                        ? "Theo chỉ số"
                        : "Cố định"} · {service.unit}
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(service.defaultPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(service)} aria-label={`Sửa ${service.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void handleDelete(service)} aria-label={`Xóa ${service.name}`} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
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
        <DialogContent className="rounded-[14px] sm:max-w-lg">
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
                <select id="service-type" value={form.billingMode} onChange={(event) => setForm({ ...form, billingMode: event.target.value as ServiceForm["billingMode"] })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="FIXED">Cố định theo kỳ</option>
                  <option value="QUANTITY">Theo số lượng</option>
                  <option value="METER">Theo chỉ số</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-unit">Đơn vị</Label>
                <Input id="service-unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="kWh, m³, tháng" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">Đơn giá mặc định</Label>
              <Input id="service-price" inputMode="numeric" value={form.defaultPrice} onChange={(event) => setForm({ ...form, defaultPrice: formatNumberInput(event.target.value) })} placeholder="0" />
            </div>
            {form.billingMode === "QUANTITY" && (
              <div className="space-y-2">
                <Label htmlFor="service-quantity">Số lượng mặc định</Label>
                <Input id="service-quantity" type="number" min="0" step="1" value={form.defaultQuantity} onChange={(event) => setForm({ ...form, defaultQuantity: event.target.value })} />
              </div>
            )}
            {priceImpact && (
              <section className="space-y-4 rounded-[12px] bg-muted p-4" aria-label="Phạm vi áp dụng giá mới">
                <div>
                  <h3 className="font-bold text-foreground">Phạm vi áp dụng đơn giá mới</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    {formatCurrency(priceImpact.currentPrice)}
                    <ArrowRight className="h-4 w-4" />
                    <strong className="text-foreground">{formatCurrency(priceImpact.newPrice)}</strong>
                  </p>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="radio" checked={priceScope === "NEW_CONTRACTS_ONLY"} onChange={() => setPriceScope("NEW_CONTRACTS_ONLY")} />
                  <span className="text-sm font-semibold">Chỉ hợp đồng tạo mới</span>
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="radio" checked={priceScope === "SELECTED_ACTIVE_CONTRACTS"} onChange={() => setPriceScope("SELECTED_ACTIVE_CONTRACTS")} />
                  <span className="text-sm font-semibold">Hợp đồng đang hiệu lực được chọn</span>
                </label>
                {priceScope === "SELECTED_ACTIVE_CONTRACTS" && (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {priceImpact.contracts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Không có hợp đồng phù hợp.</p>
                    ) : priceImpact.contracts.map((contract) => (
                      <label key={contract.contractId} className="flex min-h-11 cursor-pointer items-center justify-between rounded-[10px] bg-card px-3">
                        <span className="text-sm font-semibold">Phòng {contract.roomCode}</span>
                        <input
                          type="checkbox"
                          checked={selectedContractIds.includes(contract.contractId)}
                          onChange={(event) => setSelectedContractIds((current) =>
                            event.target.checked
                              ? [...current, contract.contractId]
                              : current.filter((id) => id !== contract.contractId)
                          )}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border p-3">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-semibold text-foreground">Dịch vụ đang hoạt động</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              {priceImpact ? (
                <Button type="button" onClick={() => void applyPriceChange()} disabled={submitting}>
                  {submitting ? "Đang áp dụng..." : "Áp dụng đơn giá"}
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>{submitting ? "Đang lưu..." : "Lưu dịch vụ"}</Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
