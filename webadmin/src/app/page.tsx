"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { TroHubLogo } from "@/components/trohub-logo";
import { fetchAPI } from "@/lib/api";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";

export default function LoginPage() {
  const notification = useNotification();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

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

  return (
    <main className="relative grid min-h-[100dvh] bg-background lg:grid-cols-[1.08fr_.92fr]">
      <div className="absolute right-4 top-4 z-10 lg:right-7 lg:top-7">
        <ThemeToggle />
      </div>

      <section className="login-identity-panel hidden min-h-[100dvh] flex-col justify-between border-r border-border bg-[#25292d] p-10 text-[#f4f5f3] lg:flex xl:p-16">
        <TroHubLogo className="[&_.text-foreground]:!text-[#f4f5f3] [&_.text-muted-foreground]:!text-[#c8cdd0]" />

        <div className="max-w-xl pb-10">
          <p className="mb-5 text-sm font-extrabold tracking-[0.16em] text-[#ff7a32]">
            TRO HUB ADMIN
          </p>
          <h1 className="max-w-[12ch] text-5xl font-black leading-[1.06] tracking-[-0.035em] text-balance">
            Quản lý nhà trọ rõ ràng hơn.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[#c8cdd0] text-pretty">
            Theo dõi phòng, Người thuê, hợp đồng, hóa đơn và sửa chữa trong một
            hệ thống thống nhất.
          </p>
        </div>

        <div className="grid grid-cols-[1.35fr_.65fr] gap-3" aria-hidden="true">
          <div className="h-2 rounded-[3px] bg-[#ef6a22]" />
          <div className="h-2 rounded-[3px] bg-[#17834a]" />
        </div>
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-20 sm:px-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 lg:hidden">
            <TroHubLogo />
          </div>

          <div>
            <p className="mb-3 text-sm font-extrabold tracking-[0.12em] text-primary">
              KHU VỰC QUẢN TRỊ
            </p>
            <h2 className="text-3xl font-black tracking-[-0.025em] text-foreground text-balance">
              Chào mừng bạn trở lại
            </h2>
            <p className="mb-8 mt-2 max-w-[46ch] leading-relaxed text-muted-foreground text-pretty">
              Đăng nhập bằng tài khoản Chủ trọ hoặc Admin đã được cấp.
            </p>

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
                  className="h-12 rounded-[10px] bg-card px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
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
                  className="h-12 rounded-[10px] bg-card px-4 text-base placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 accent-[#ef6a22]"
                    defaultChecked
                  />
                  <label
                    htmlFor="remember"
                    className="cursor-pointer text-sm font-medium text-muted-foreground"
                  >
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm font-bold text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-[10px] border border-red-300 bg-red-50 p-3 text-sm font-semibold leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-[10px] bg-primary text-base font-extrabold text-primary-foreground transition-transform hover:bg-[#a83b07] active:scale-[0.98] dark:hover:bg-[#ff8d52]"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="mt-7 rounded-[10px] bg-primary/10 px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
              Chưa có tài khoản? Vui lòng liên hệ quản trị hệ thống để được cấp
              quyền truy cập.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
