"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  CreditCard,
  FileSignature,
  FileText,
  Globe,
  Info,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  QrCode,
  ScanLine,
  Settings2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Tag,
  User,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { FEATURE_ICONS } from "@/constants/feature-icons";
import { FeatureIconBox } from "@/components/ui/feature-icon-box";
import { AutomationStatusCard } from "@/components/AutomationStatusCard";
import { TermsAndPoliciesModal } from "@/components/TermsAndPoliciesModal";
import { formatCCCD, formatPhone } from "@/lib/formatters";
import { fetchAPI } from "@/lib/api";
import { safeJsonParse, type WebAdminUser } from "@/lib/client-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked ? "bg-emerald-500" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { themeMode, toggleTheme } = useTheme();

  const [user, setUser] = useState<WebAdminUser | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    idCard: "",
    propertyAddress: "",
    bankId: "",
    bankAccountNo: "",
    bankAccountName: "",
    landlordSignature: "",
  });

  const [pushEnabled, setPushEnabled] = useState(true);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    // 1. Stored user
    const stored = safeJsonParse<WebAdminUser | null>(
      localStorage.getItem("trohub_user"),
      null
    );
    if (stored) {
      setUser(stored);
    }

    // 2. Fetch full settings
    void fetchAPI("/settings")
      .then((res) => {
        if (res?.data) {
          setProfile({
            name: res.data.name || stored?.fullName || "",
            phone: res.data.phone || (typeof stored?.phone === "string" ? stored.phone : ""),
            email: res.data.email || (typeof stored?.email === "string" ? stored.email : ""),
            idCard: res.data.idCard || (typeof stored?.idCard === "string" ? stored.idCard : ""),
            propertyAddress:
              res.data.propertyAddress || stored?.propertyAddress || "",
            bankId: res.data.bankId || "",
            bankAccountNo: res.data.bankAccountNo || "",
            bankAccountName: res.data.bankAccountName || "",
            landlordSignature: res.data.landlordSignature || "",
          });
        }
      })
      .catch(() => undefined);

    // 3. Notification preference
    try {
      const storedPush = localStorage.getItem("trohub_push_notifications");
      if (storedPush !== null) {
        setPushEnabled(storedPush === "true");
      }
    } catch {}
  }, []);

  const handlePushToggle = (val: boolean) => {
    setPushEnabled(val);
    try {
      localStorage.setItem("trohub_push_notifications", String(val));
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    window.location.href = "/";
  };

  const displayName = profile.name || user?.fullName || "ADMIN NGUYÊN";
  const displayPhone = profile.phone || (typeof user?.phone === "string" ? user.phone : "") || "0909.999.999";
  const displayEmail = profile.email || (typeof user?.email === "string" ? user.email : "") || "admin@trohub.vn";
  const displayAddress =
    profile.propertyAddress ||
    user?.propertyAddress ||
    "Hẻm 478 Bà Hạt, Khu phố 20, Phường Diên Hồng, TP.HCM";
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || "A";

  const isDark = themeMode === "dark";

  return (
    <div className="space-y-8 pb-12">
      {/* 0. Header */}
      <PageHeader
        eyebrow={t("nav.settings")}
        title={t("settings.title")}
        description={t("settings.subtitle")}
        iconToken={FEATURE_ICONS.settings}
      />

      {/* 1. TOP PROFILE HERO CARD (Đồng bộ từ Hình 1) */}
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-500/25 bg-gradient-to-br from-[#064E3B] via-[#043830] to-[#02241E] p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar Circle */}
          <div className="relative size-20 sm:size-24 shrink-0 rounded-full border-3 border-emerald-400/40 bg-emerald-700/60 shadow-inner flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-sm">
              {initialLetter}
            </span>
            <span className="absolute bottom-0 right-0 size-5 rounded-full bg-emerald-400 ring-4 ring-[#043830]" />
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-200">
              <span>Chủ trọ</span>
              <span>🔑</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase truncate drop-shadow-xs">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs sm:text-sm text-emerald-100/80">
              <span className="inline-flex items-center gap-1.5">
                <span>📱</span>
                <span className="font-semibold">{formatPhone(displayPhone)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span>✉</span>
                <span className="font-semibold">{displayEmail}</span>
              </span>
            </div>

            {/* Address Pill */}
            <div className="pt-1.5">
              <div className="inline-flex items-center gap-2 rounded-xl bg-black/25 border border-white/10 px-3.5 py-1.5 text-xs sm:text-sm text-emerald-100 backdrop-blur-sm max-w-full truncate">
                <span className="shrink-0 text-emerald-400">📍</span>
                <span className="truncate">{displayAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BENTO GROUP 1: HỒ SƠ & BẢO MẬT (Đồng bộ 6 ô từ Hình 1) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2 px-1 text-sm font-black tracking-tight text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Hồ sơ & Bảo mật</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ô 1: Chỉnh sửa thông tin */}
          <Link
            href="/dashboard/settings/account"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                <User className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Chỉnh sửa thông tin</h3>
              <p className="text-xs text-muted-foreground mt-1">Tên, SĐT, CCCD, Địa chỉ</p>
            </div>
          </Link>

          {/* Ô 2: Đổi mật khẩu */}
          <Link
            href="/dashboard/settings/account"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Đổi mật khẩu</h3>
              <p className="text-xs text-muted-foreground mt-1">Bảo mật tài khoản</p>
            </div>
          </Link>

          {/* Ô 3: Căn cước công dân (CCCD) */}
          <Link
            href="/dashboard/settings/account"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center">
                <ScanLine className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Căn cước công dân (CCCD)</h3>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {profile.idCard ? formatCCCD(profile.idCard) : "0790.9999.9999"}
              </p>
            </div>
          </Link>

          {/* Ô 4: Chữ ký mẫu (Bên A) */}
          <Link
            href="/dashboard/settings/account"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <FileSignature className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Chữ ký mẫu (Bên A)</h3>
              <p className={`text-xs font-black mt-1 ${profile.landlordSignature ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {profile.landlordSignature ? "Đã sẵn sàng chữ ký" : "Chưa tạo chữ ký"}
              </p>
            </div>
          </Link>

          {/* Ô 5: Tài khoản nhận tiền (VietQR) */}
          <Link
            href="/dashboard/settings/banking"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
                <QrCode className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Tài khoản nhận tiền (VietQR)</h3>
              <p className={`text-xs font-black mt-1 ${profile.bankAccountNo ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {profile.bankAccountNo
                  ? `${profile.bankId || "VietQR"} · ${profile.bankAccountNo}`
                  : "Cấu hình nhận tiền"}
              </p>
            </div>
          </Link>

          {/* Ô 6: Dịch vụ đi kèm */}
          <Link
            href="/dashboard/services"
            className="group calm-surface relative flex flex-col justify-between rounded-[22px] border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-[14px] bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20 flex items-center justify-center">
                <Tag className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <h3 className="font-black text-foreground text-base tracking-tight">Dịch vụ đi kèm</h3>
              <p className="text-xs text-muted-foreground mt-1">Quản lý danh mục và đơn giá</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. BENTO GROUP 2: TỰ ĐỘNG HÓA CHU KỲ HÓA ĐƠN (Đồng bộ từ Hình 2) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2 px-1 text-sm font-black tracking-tight text-foreground">
          <Zap className="size-4 text-amber-500" />
          <span>Tự động hóa chu kỳ hóa đơn</span>
        </div>

        <AutomationStatusCard />
      </section>

      {/* 4. BENTO GROUP 3: TÙY CHỌN ỨNG DỤNG (Đồng bộ từ Hình 2) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2 px-1 text-sm font-black tracking-tight text-foreground">
          <SlidersHorizontal className="size-4 text-primary" />
          <span>Tùy chọn ứng dụng</span>
        </div>

        <div className="calm-surface rounded-[24px] border border-border/50 bg-card overflow-hidden shadow-sm divide-y divide-border/50">
          {/* Row 1: Ngôn ngữ */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Globe className="size-5" />
              </div>
              <span className="font-bold text-foreground text-sm">Ngôn ngữ</span>
            </div>

            {/* Segmented Switcher */}
            <div className="inline-flex items-center rounded-xl bg-muted p-1 border border-border/40">
              <button
                type="button"
                onClick={() => setLanguage("vi")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  language === "vi"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇻🇳 VI
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  language === "en"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* Row 2: Thông báo đẩy */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Bell className="size-5" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm block">Thông báo đẩy</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">Cảnh báo hóa đơn & sự cố</span>
              </div>
            </div>

            <ToggleSwitch
              checked={pushEnabled}
              onChange={handlePushToggle}
              label="Bật tắt thông báo đẩy"
            />
          </div>

          {/* Row 3: Giao diện ứng dụng */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </div>
              <div>
                <span className="font-bold text-foreground text-sm block">Giao diện ứng dụng</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {isDark ? "Chế độ Tối (Dark)" : "Chế độ Sáng (Light)"}
                </span>
              </div>
            </div>

            <ToggleSwitch
              checked={isDark}
              onChange={() => toggleTheme()}
              label="Chuyển đổi giao diện sáng tối"
            />
          </div>
        </div>
      </section>

      {/* 5. BENTO GROUP 4: HỆ THỐNG & PHÁP LÝ (Đồng bộ từ Hình 2) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2 px-1 text-sm font-black tracking-tight text-foreground">
          <Info className="size-4 text-primary" />
          <span>Hệ thống & Pháp lý</span>
        </div>

        <div className="calm-surface rounded-[24px] border border-border/50 bg-card overflow-hidden shadow-sm divide-y divide-border/50">
          {/* Row 1: Điều khoản & Chính sách */}
          <button
            type="button"
            onClick={() => setTermsModalOpen(true)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Shield className="size-5" />
              </div>
              <span className="font-bold text-foreground text-sm">Điều khoản & Chính sách</span>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>

          {/* Row 2: Phiên bản ứng dụng */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Info className="size-5" />
              </div>
              <span className="font-bold text-foreground text-sm">Phiên bản ứng dụng</span>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
              v2.0.0 (TroHub)
            </span>
          </div>
        </div>
      </section>

      {/* 6. BIG RED LOGOUT BUTTON (Đồng bộ từ Hình 2) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          className="w-full flex items-center justify-center gap-3 rounded-[20px] bg-red-500 hover:bg-red-600 text-white font-black py-4 px-6 text-sm transition-all duration-200 shadow-md shadow-red-500/15 active:scale-[0.99] cursor-pointer"
        >
          <LogOut className="size-5" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>

      {/* MODAL ĐIỀU KHOẢN & CHÍNH SÁCH */}
      <TermsAndPoliciesModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
      />

      {/* DIALOG XÁC NHẬN ĐĂNG XUẤT */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Đăng xuất tài khoản</DialogTitle>
            <DialogDescription className="text-sm">
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị WebAdmin TroHub?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setLogoutDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={handleLogout}
              className="rounded-xl font-bold"
            >
              Đăng xuất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
