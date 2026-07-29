"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Building2, KeyRound, LoaderCircle, LogIn, ShieldCheck, UserPlus, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { TroHubLogo } from "@/components/trohub-logo";
import { fetchAPI } from "@/lib/api";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Cấu hình thông tin liên hệ của nhà phát triển (Super-Admin)
const SUPER_ADMIN_ZALO = "0584085384";

export default function LoginPage() {
  const notification = useNotification();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  // Seed default invite codes & log to console for super-admin testing
  useEffect(() => {
    try {
      const stored = localStorage.getItem("@admin_invite_codes");
      let activeCodes: string[] = [];
      if (!stored) {
        const defaultCodes = ["102938", "574839", "293847", "847291", "482019", "673920"];
        localStorage.setItem("@admin_invite_codes", JSON.stringify(defaultCodes));
        activeCodes = defaultCodes;
      } else {
        activeCodes = JSON.parse(stored);
      }
      
      // In ra console trình duyệt để Tester/Super-Admin dễ dàng copy khi F12
      console.log(
        "%c🔑 [TroHub Dev] DANH SÁCH MÃ MỜI ĐĂNG KÝ ADMIN HIỆN CÓ:",
        "background: #04100e; color: #b8f5da; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
        activeCodes
      );

      // Cấu hình URL cho mã QR quét yêu cầu code
      if (typeof window !== "undefined") {
        setQrUrl(window.location.origin + "/request-invite");
      }
    } catch (e) {
      console.error(e);
    }
  }, [mode]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    // Check mock admin database in localStorage first
    try {
      const mockAdmins = JSON.parse(localStorage.getItem("@mock_admins") || "[]");
      const matched = mockAdmins.find(
        (u: any) =>
          (u.username === identifier.trim() || u.phone === identifier.trim() || u.email === identifier.trim()) &&
          u.password === password
      );

      if (matched) {
        const user = { id: matched.id, username: matched.username, fullName: matched.fullName, role: 1 };
        localStorage.setItem("trohub_token", "mock-token-" + matched.id);
        localStorage.setItem("trohub_user", JSON.stringify(user));
        notification.success("Đăng nhập thành công (Simulated).");
        window.location.href = "/dashboard";
        return;
      }
    } catch {}

    try {
      const data = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: identifier.trim(), password }),
      });

      if (data.success) {
        const user = data.user || data.data;
        if (user.role === 2) {
          const message = "Tài khoản Người thuê vui lòng đăng nhập trên ứng dụng di động.";
          setError(message);
          notification.info(message);
          return;
        }

        localStorage.setItem("trohub_token", data.token);
        localStorage.setItem("trohub_user", JSON.stringify(user));
        notification.success("Đăng nhập thành công.");
        window.location.href = "/dashboard";
      }
    } catch (caughtError: unknown) {
      const message = getNotificationMessage(
        caughtError,
        "Số điện thoại, tên đăng nhập hoặc mật khẩu không đúng.",
      );
      setError(message);
      notification.error(message, { title: "Đăng nhập thất bại" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const phoneClean = identifier.replace(/\D/g, "");
      if (phoneClean.length !== 10) {
        setError("Số điện thoại phải gồm đúng 10 chữ số!");
        setLoading(false);
        return;
      }

      // Check duplicate SĐT
      const mockAdmins = JSON.parse(localStorage.getItem("@mock_admins") || "[]");
      if (mockAdmins.some((u: any) => u.phone === phoneClean || u.email === email)) {
        setError("Số điện thoại hoặc Email đã được đăng ký trước đó!");
        setLoading(false);
        return;
      }

      // Validate invite code
      const storedInvites = JSON.parse(localStorage.getItem("@admin_invite_codes") || "[]");
      const codeIndex = storedInvites.indexOf(inviteCode.trim());
      if (codeIndex === -1) {
        setError("Mã mời không đúng hoặc đã được sử dụng!");
        setLoading(false);
        return;
      }

      // Consume the code
      storedInvites.splice(codeIndex, 1);
      localStorage.setItem("@admin_invite_codes", JSON.stringify(storedInvites));

      // Save into mock admin db
      const newAdmin = {
        id: "mock_id_" + Math.random().toString(36).substring(2, 9),
        username: phoneClean,
        phone: phoneClean,
        email,
        fullName,
        password,
      };
      mockAdmins.push(newAdmin);
      localStorage.setItem("@mock_admins", JSON.stringify(mockAdmins));

      notification.success("Đăng ký tài khoản Admin thành công!");
      setMode("login");
      setIdentifier(phoneClean);
      setPassword("");
      setInviteCode("");
    } catch (err) {
      setError("Đăng ký thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell relative grid min-h-[100dvh] bg-background lg:grid-cols-[1.08fr_.92fr]">
      <div className="absolute right-4 top-4 z-10 lg:right-7 lg:top-7">
        <ThemeToggle />
      </div>

      <section className="login-identity-panel relative hidden min-h-[100dvh] flex-col justify-between overflow-hidden p-10 text-[#effff8] lg:flex xl:p-16">
        <TroHubLogo className="[&_.text-foreground]:!text-[#effff8] [&_.text-muted-foreground]:!text-[#a9cfc2]" />

        <div className="relative z-[1] max-w-xl py-10">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-[#b8f5da]">
            <Building2 className="size-4" aria-hidden="true" />
            Không gian quản trị TRO HUB
          </span>
          <h1 className="max-w-[12ch] text-5xl font-black leading-[1.06] tracking-[-0.035em] text-balance xl:text-6xl">
            {mode === "login" ? "Quản lý nhà trọ rõ ràng hơn." : "Bắt đầu số hóa dãy trọ."}
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[#b8d7cd] text-pretty">
            Theo dõi phòng, Người thuê, hợp đồng, hóa đơn và sửa chữa trong một hệ thống thống nhất.
          </p>
        </div>

        <div className="login-property-frame" aria-hidden="true">
          <Image
            src="/trohub-property-loading.png"
            alt=""
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-20 sm:px-8">
        <div className="login-form-panel w-full max-w-[460px] rounded-[24px] bg-card p-6 sm:p-9">
          <div className="mb-10 lg:hidden">
            <TroHubLogo />
          </div>

          <div>
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-[16px] bg-accent text-primary">
              {mode === "login" ? <KeyRound className="size-5" aria-hidden="true" /> : <UserPlus className="size-5" aria-hidden="true" />}
            </span>
            <h2 className="text-3xl font-black tracking-[-0.025em] text-foreground text-balance">
              {mode === "login" ? "Chào mừng trở lại" : "Đăng ký Chủ trọ"}
            </h2>
            <p className="mb-8 mt-2 max-w-[46ch] leading-relaxed text-muted-foreground text-pretty">
              {mode === "login" ? "Đăng nhập bằng tài khoản Chủ trọ hoặc Admin." : "Tự tạo tài khoản quản trị dãy trọ của bạn."}
            </p>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="font-bold text-foreground">
                    Số điện thoại hoặc tên đăng nhập
                  </Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    autoCapitalize="none"
                    autoComplete="username"
                    autoCorrect="off"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Ví dụ: 0901234567 hoặc nguyenvana"
                    required
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Tài khoản email cũ vẫn có thể đăng nhập bình thường.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold text-foreground">
                    Mật khẩu
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    minLength={6}
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="size-4 accent-primary"
                    defaultChecked
                  />
                  <label
                    htmlFor="remember"
                    className="cursor-pointer text-sm font-medium text-muted-foreground"
                  >
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-[16px] bg-destructive/10 p-4 text-sm font-semibold leading-relaxed text-destructive"
                  >
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-[16px] bg-primary text-base font-extrabold text-primary-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_25%,transparent)] transition-transform hover:bg-primary/90 active:scale-[0.98]"
                >
                  {loading ? (
                    <><LoaderCircle className="animate-spin" aria-hidden="true" />Đang đăng nhập...</>
                  ) : (
                    <><LogIn aria-hidden="true" />Đăng nhập</>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-bold text-foreground">
                    Họ và tên *
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    required
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-bold text-foreground">
                    Số điện thoại *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    required
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-foreground">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Ví dụ: landlord@gmail.com"
                    required
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold text-foreground">
                    Mật khẩu *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu (từ 6 ký tự)"
                    required
                    minLength={6}
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="font-bold text-foreground">
                    Mã mời đăng ký (6 số) *
                  </Label>
                  <Input
                    id="inviteCode"
                    name="inviteCode"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Nhập mã mời 6 chữ số"
                    required
                    maxLength={6}
                    className="h-12 rounded-[16px] bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                  <div className="mt-2 text-right">
                    <Dialog>
                      <DialogTrigger className="text-xs text-primary font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer">
                        💬 Yêu cầu cấp mã mời qua Zalo
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[420px] rounded-[24px]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-bold">Yêu cầu cấp mã mời</DialogTitle>
                          <DialogDescription className="text-center text-sm">
                            Quét mã QR dưới bằng camera điện thoại để soạn tin nhắn yêu cầu nhanh chóng.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center p-4">
                          {qrUrl ? (
                            <div className="relative rounded-2xl bg-white p-4 shadow-md">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                                alt="Mã QR Yêu cầu cấp mã"
                                width={200}
                                height={200}
                                className="rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="h-[200px] w-[200px] animate-pulse bg-muted rounded-lg" />
                          )}
                          <p className="mt-4 text-center text-xs text-muted-foreground max-w-[280px]">
                            Hệ thống sẽ soạn sẵn tin nhắn thông tin của bạn và tự mở ứng dụng Zalo chat tới số admin sau khi điền thông tin.
                          </p>
                          <div className="mt-6 border-t pt-4 w-full text-center">
                            <a
                              href={qrUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary font-bold hover:underline inline-flex items-center gap-1.5"
                            >
                              Hoặc truy cập trực tiếp trên máy tính <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-[16px] bg-destructive/10 p-4 text-sm font-semibold leading-relaxed text-destructive"
                  >
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-[16px] bg-primary text-base font-extrabold text-primary-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_25%,transparent)] transition-transform hover:bg-primary/90 active:scale-[0.98]"
                >
                  {loading ? (
                    <><LoaderCircle className="animate-spin" aria-hidden="true" />Đang đăng ký...</>
                  ) : (
                    <><UserPlus aria-hidden="true" />Đăng ký</>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Đăng ký tài khoản quản trị mới
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Đã có tài khoản? Đăng nhập ngay
                </button>
              )}
            </div>

            <div className="mt-6 flex gap-3 rounded-[16px] bg-accent px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {mode === "login"
                  ? "Chưa có tài khoản? Bạn có thể đăng ký trực tiếp ở trên hoặc liên hệ quản trị."
                  : "Mã mời sử dụng 1 lần để đảm bảo tính xác thực của tài khoản Chủ trọ."}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
