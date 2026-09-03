"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Brush,
  Check,
  Compass,
  FileSignature,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/calm-ops/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatPhone, unformatDigits } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";

export default function AccountSettingsPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    idCard: "",
    propertyAddress: "",
    password: "",
  });
  const [landlordSignature, setLandlordSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Modal vẽ chữ ký
  const [signModalOpen, setSignModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSettings = async () => {
    try {
      const { data } = await fetchAPI("/settings");
      setForm({
        name: data?.name || "",
        phone: formatPhone(data?.phone),
        email: data?.email || "",
        idCard: data?.idCard || "",
        propertyAddress: data?.propertyAddress || "",
        password: "",
      });
      setLandlordSignature(data?.landlordSignature || "");
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  // Lấy vị trí GPS hiện tại
  const handleGetLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      notification.error("Trình duyệt không hỗ trợ định vị vị trí.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const response = await fetchAPI(`/auth/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (response.data?.address) {
            setForm((prev) => ({ ...prev, propertyAddress: response.data.address }));
            notification.success("Đã tự động lấy địa chỉ từ GPS hiện tại!");
          }
        } catch (error) {
          notification.error(getNotificationMessage(error, "Không thể lấy địa chỉ từ vị trí hiện tại."));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        notification.error("Không thể truy cập vị trí hiện tại. Vui lòng cấp quyền định vị.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Lưu thông tin form
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          phone: unformatDigits(form.phone),
          landlordSignature,
        }),
      });
      notification.success(t("settings.account.saved"));
      setForm((value) => ({ ...value, password: "" }));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Lưu chữ ký từ Canvas (Auto-save lên server)
  const saveSignatureFromCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const base64 = canvas.toDataURL("image/png");
    setLandlordSignature(base64);
    setSignModalOpen(false);

    try {
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          phone: unformatDigits(form.phone),
          landlordSignature: base64,
        }),
      });
      notification.success("Đã tự động lưu chữ ký mẫu của Chủ trọ!");
    } catch {
      notification.error("Lỗi khi lưu chữ ký lên máy chủ.");
    }
  };

  // Tải ảnh chữ ký từ máy
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLandlordSignature(base64);
        try {
          await fetchAPI("/settings", {
            method: "PUT",
            body: JSON.stringify({
              ...form,
              phone: unformatDigits(form.phone),
              landlordSignature: base64,
            }),
          });
          notification.success("Đã tải lên và lưu chữ ký mẫu thành công!");
        } catch {
          notification.error("Lỗi khi lưu chữ ký lên máy chủ.");
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Xóa chữ ký
  const handleDeleteSignature = async () => {
    setLandlordSignature("");
    try {
      await fetchAPI("/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          phone: unformatDigits(form.phone),
          landlordSignature: "",
        }),
      });
      notification.success("Đã xóa chữ ký mẫu!");
    } catch {
      notification.error("Không thể cập nhật.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={t("nav.settings")}
        title={t("settings.account.title")}
        description={t("settings.account.subtitle")}
      />

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside className="calm-surface flex flex-col items-center justify-center bg-accent/45 p-6 text-center h-fit">
          <span className="grid size-20 place-items-center rounded-[24px] bg-primary text-primary-foreground shadow-[var(--calm-shadow)]">
            <UserRound aria-hidden="true" className="size-9" />
          </span>
          <p className="mt-4 font-black text-base">{form.name || t("settings.account.title")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{form.phone || t("settings.account.subtitle")}</p>
        </aside>

        <div className="space-y-6">
          {/* Form thông tin cá nhân */}
          <form onSubmit={submit} className="calm-surface space-y-5 p-6 sm:p-7">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              Thông tin định danh & Liên hệ
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="0901.234.567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idCard">Số CCCD / CMND (12 số)</Label>
                <Input
                  id="idCard"
                  value={form.idCard}
                  onChange={(e) => setForm({ ...form, idCard: unformatDigits(e.target.value) })}
                  placeholder="012345678901"
                  maxLength={12}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Ô Địa chỉ với nút Định vị GPS hiện tại */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="propertyAddress">{t("auth.propertyAddress")}</Label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Compass className="size-3.5" />
                  )}
                  <span>{isLocating ? "Đang định vị..." : "Lấy vị trí hiện tại"}</span>
                </button>
              </div>
              <div className="relative">
                <Input
                  id="propertyAddress"
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  placeholder="123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội"
                  className="pr-10"
                />
                <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("settings.account.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Để trống nếu không muốn đổi mật khẩu"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="size-4 text-primary" /> TroHub Security Protected
              </p>
              <Button disabled={saving}>
                <Save aria-hidden="true" />
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>

          {/* Card Quản lý Chữ ký mẫu Chủ trọ (Bên A) */}
          <div className="calm-surface space-y-5 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <FileSignature className="size-5 text-primary" />
                  Chữ ký mẫu Chủ trọ (Bên A)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tự động đóng dấu chữ ký vào hợp đồng thuê và bản PDF điện tử
                </p>
              </div>
              {landlordSignature ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> Đã sẵn sàng
                </span>
              ) : null}
            </div>

            {landlordSignature ? (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-primary/30 bg-white p-5 shadow-sm">
                <img
                  src={
                    landlordSignature.startsWith("data:")
                      ? landlordSignature
                      : `data:image/png;base64,${landlordSignature}`
                  }
                  alt="Chữ ký mẫu Bên A"
                  className="max-h-28 object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border bg-muted/20 p-8 text-center">
                <Brush className="size-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-bold text-muted-foreground">Chưa thiết lập chữ ký mẫu</p>
                <p className="text-xs text-muted-foreground/75 mt-1 max-w-sm">
                  Vẽ chữ ký tay hoặc tải ảnh chữ ký lên để hệ thống tự động điền vào Hợp đồng
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <Button
                type="button"
                variant={landlordSignature ? "outline" : "default"}
                onClick={() => {
                  setSignModalOpen(true);
                  setTimeout(() => clearCanvas(), 50);
                }}
              >
                <Brush className="size-4" />
                {landlordSignature ? "Ký lại / Đổi chữ ký" : "Vẽ chữ ký tay"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Tải ảnh chữ ký
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadSignature}
                className="hidden"
              />

              {landlordSignature ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDeleteSignature}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Xóa
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Modal vẽ chữ ký tay trên Web */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brush className="size-5 text-primary" />
              Vẽ chữ ký mẫu Chủ trọ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Dùng chuột hoặc cảm ứng để ký tên vào khung trắng bên dưới:
            </p>

            <div className="relative rounded-2xl border-2 border-primary/40 bg-white overflow-hidden shadow-inner touch-none">
              <canvas
                ref={canvasRef}
                width={450}
                height={200}
                className="w-full h-[200px] cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn ? (
                <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-slate-400 select-none">
                  Ký tên tại đây
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={clearCanvas}>
                <RefreshCw className="size-4" />
                Xóa nét
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSignModalOpen(false)}>
                  <X className="size-4" />
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!hasDrawn}
                  onClick={saveSignatureFromCanvas}
                >
                  <Check className="size-4" />
                  Lưu chữ ký
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
