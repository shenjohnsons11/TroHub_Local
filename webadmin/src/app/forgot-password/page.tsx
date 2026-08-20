"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TroHubLogo } from "@/components/trohub-logo";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { useLanguage } from "@/components/language-provider";

type Step = "identifier" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = setInterval(() => {
      setSecondsUntilResend((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsUntilResend]);

  const requestOtp = async () => {
    if (!identifier.trim()) {
      notification.warning(t("auth.enterPhone"));
      return;
    }
    try {
      setLoading(true);
      await fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ phone: identifier.trim() }),
      });
      notification.success(t("common.success"));
      setSecondsUntilResend(60);
      setStep("otp");
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      notification.warning(t("auth.enterOtp"));
      return;
    }
    try {
      setLoading(true);
      await fetchAPI("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ phone: identifier.trim(), otp }),
      });
      notification.success(t("common.success"));
      setStep("password");
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!password || password.length < 6) {
      notification.warning(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirmation) {
      notification.warning(t("auth.passwordMismatch"));
      return;
    }
    try {
      setLoading(true);
      await fetchAPI("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ phone: identifier.trim(), otp, newPassword: password }),
      });
      setStep("done");
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === "identifier" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="calm-surface w-full max-w-md p-6 sm:p-9">
        <TroHubLogo />
        <div className="mt-9 border-t border-border pt-8">
          <div className="mb-7 flex gap-2" aria-label={`Step ${stepNumber} / 3`}>
            {[1, 2, 3].map((value) => (
              <span key={value} className={`h-1.5 flex-1 rounded-[3px] ${value <= stepNumber ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>

          {step === "done" ? (
            <div>
              <h1 className="text-3xl font-black tracking-[-0.025em]">{t("auth.resetPassword")}</h1>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t("common.success")}</p>
              <Link
                href="/"
                className="mt-7 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary px-4 font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                {t("auth.login")}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-primary">Step {stepNumber} / 3</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.025em]">
                {step === "identifier" ? t("auth.forgotPasswordTitle") : step === "otp" ? t("auth.verifyOtp") : t("auth.newPassword")}
              </h1>
              <div className="mt-7 space-y-5">
                {step === "identifier" && (
                  <div className="space-y-2">
                    <Label htmlFor="identifier">{t("auth.phone")}</Label>
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
                    <Label htmlFor="otp">OTP (6 digits)</Label>
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
                      {secondsUntilResend ? `${t("auth.resendOtp")} (${secondsUntilResend}s)` : t("auth.resendOtp")}
                    </button>
                  </div>
                )}
                {step === "password" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t("auth.newPassword")}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        disabled={loading}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12"
                        placeholder="••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmation">{t("auth.confirmPassword")}</Label>
                      <Input
                        id="confirmation"
                        type="password"
                        value={confirmation}
                        disabled={loading}
                        onChange={(event) => setConfirmation(event.target.value)}
                        className="h-12"
                        placeholder="••••••"
                      />
                    </div>
                  </>
                )}
                <Button
                  disabled={loading}
                  onClick={step === "identifier" ? requestOtp : step === "otp" ? verifyOtp : resetPassword}
                  className="h-12 w-full font-bold"
                >
                  {loading ? t("common.loading") : step === "identifier" ? t("auth.sendOtp") : step === "otp" ? t("auth.verifyOtp") : t("common.save")}
                </Button>
                <div className="text-center">
                  <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("auth.login")}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
