"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { TroHubLogo } from "@/components/trohub-logo";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { getPasswordPolicyError } from "@/lib/password-policy";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordReset,
} from "@/lib/password-reset";
import { useLanguage } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

type Step = "identifier" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const notification = useNotification();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = window.setInterval(
      () => setSecondsUntilResend((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);

  const requestOtp = async () => {
    if (!identifier.trim()) return notification.warning("Vui lòng nhập số điện thoại hoặc tên đăng nhập.");
    try {
      setLoading(true);
      const result = await requestPasswordReset(identifier.trim());
      setStep("otp");
      setSecondsUntilResend(60);
      notification.success(result.message);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể gửi mã xác minh."));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return notification.warning("Mã xác minh phải gồm đúng 6 chữ số.");
    try {
      setLoading(true);
      const result = await verifyPasswordReset(identifier.trim(), otp);
      setResetToken(result.resetToken);
      setStep("password");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Mã xác minh không hợp lệ."));
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    const policyError = getPasswordPolicyError(password);
    if (policyError) return notification.warning(policyError);
    if (password !== confirmation) return notification.warning("Mật khẩu xác nhận không khớp.");
    try {
      setLoading(true);
      const result = await completePasswordReset(resetToken, password);
      notification.success(result.message);
      setStep("done");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể đặt lại mật khẩu."));
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === "identifier" ? 1 : step === "otp" ? 2 : 3;

  return (
    <main className="relative grid min-h-[100dvh] place-items-center bg-background px-4 py-16">
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <section className="w-full max-w-[460px]">
        <TroHubLogo />
        <div className="mt-9 border-t border-border pt-8">
          <div className="mb-7 flex gap-2" aria-label={`Bước ${stepNumber} trên 3`}>
            {[1, 2, 3].map((value) => (
              <span key={value} className={`h-1.5 flex-1 rounded-[3px] ${value <= stepNumber ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>

          {step === "done" ? (
            <div>
              <h1 className="text-3xl font-black tracking-[-0.025em]">Mật khẩu đã được cập nhật</h1>
              <p className="mt-3 leading-relaxed text-muted-foreground">Bạn có thể đăng nhập lại bằng mật khẩu mới.</p>
              <Link
                href="/"
                className="mt-7 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary px-4 font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-primary">Bước {stepNumber} / 3</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.025em]">
                {step === "identifier" ? "Khôi phục tài khoản" : step === "otp" ? "Nhập mã xác minh" : "Tạo mật khẩu mới"}
              </h1>
              <div className="mt-7 space-y-5">
                {step === "identifier" && (
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Số điện thoại hoặc tên đăng nhập</Label>
                    <Input
                      id="identifier"
                      autoComplete="username"
                      value={identifier}
                      disabled={loading}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className="h-12"
                    />
                  </div>
                )}
                {step === "otp" && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">Mã OTP 6 số</Label>
                    <Input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      disabled={loading}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                      className="h-12 text-center text-xl font-black tracking-[.35em]"
                    />
                    <button
                      type="button"
                      disabled={loading || secondsUntilResend > 0}
                      onClick={requestOtp}
                      className="w-full text-right text-sm font-bold text-primary disabled:text-muted-foreground"
                    >
                      {secondsUntilResend ? `Gửi lại sau ${secondsUntilResend}s` : "Gửi lại mã"}
                    </button>
                  </div>
                )}
                {step === "password" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mật khẩu mới</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        disabled={loading}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmation">Xác nhận mật khẩu</Label>
                      <Input
                        id="confirmation"
                        type="password"
                        value={confirmation}
                        disabled={loading}
                        onChange={(event) => setConfirmation(event.target.value)}
                        className="h-12"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </>
                )}
                <Button
                  disabled={loading}
                  onClick={step === "identifier" ? requestOtp : step === "otp" ? verifyOtp : complete}
                  className="h-12 w-full font-bold"
                >
                  {loading
                    ? "Đang xử lý..."
                    : step === "identifier"
                    ? "Gửi mã xác minh"
                    : step === "otp"
                    ? "Xác minh OTP"
                    : "🔒 Đặt lại mật khẩu"}
                </Button>
                <Link href="/" className="block text-center text-sm font-bold text-muted-foreground hover:text-foreground">
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
