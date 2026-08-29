import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";
import { useLanguage } from "../contexts/LanguageContext";
import AppButton from "./ui/AppButton";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const notification = useNotification();
  const styles = createStyles(theme);

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);
  const newPasswordRef = useRef<React.ElementRef<typeof AppTextInput>>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, step]);

  useEffect(() => {
    if (step === "reset") {
      const focusTimer = setTimeout(() => {
        newPasswordRef.current?.focus();
      }, 200);
      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  useEffect(() => {
    if (!secondsUntilResend) return;
    const timer = setInterval(() => setSecondsUntilResend((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsUntilResend]);

  const resetForm = () => {
    setStep("request");
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetToken("");
    setError("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    if (step === "request" && !identifier.trim()) {
      setError(t("auth.enterPhone"));
      return;
    }
    if (step === "verify" && !/^\d{6}$/.test(otp)) {
      setError(t("auth.enterOtp"));
      return;
    }
    if (step === "reset" && newPassword.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (step === "reset" && newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    try {
      setIsSubmitting(true);
      if (step === "request") {
        const message = await authService.requestPasswordReset(identifier.trim());
        notification.success(message || t("common.success"));
        setSecondsUntilResend(60);
        setStep("verify");
      } else if (step === "verify") {
        const token = await authService.verifyPasswordResetOtp(identifier.trim(), otp.trim());
        setResetToken(token);
        notification.success(t("common.success"));
        setStep("reset");
      } else if (step === "reset") {
        const message = await authService.resetPassword({
          phone: identifier.trim(),
          token: resetToken,
          newPassword,
        });
        notification.success(message || t("common.success"));
        handleClose();
      }
    } catch (err) {
      setError(getNotificationMessage(err, t("common.error")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (secondsUntilResend > 0 || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError("");
      await authService.requestPasswordReset(identifier.trim());
      setSecondsUntilResend(60);
      notification.success(t("common.success"));
    } catch (err) {
      setError(getNotificationMessage(err, t("common.error")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle =
    step === "request"
<<<<<<< HEAD
      ? t("auth.forgotPasswordDescription")
=======
      ? t("auth.forgotPasswordDesc")
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
      : step === "verify"
      ? t("auth.verifyOtp")
      : t("auth.newPassword");

  const buttonText =
    step === "request"
      ? t("auth.sendOtp")
      : step === "verify"
      ? t("auth.verifyOtp")
      : t("common.save");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isSubmitting ? () => undefined : handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.dialog} accessibilityViewIsModal>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <AppText
                    ref={titleRef}
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                  >
                    {t("auth.forgotPasswordTitle")}
                  </AppText>
                  <AppText style={styles.subtitle}>{subtitle}</AppText>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </Pressable>
              </View>

              {step === "request" && (
                <View key="step-request" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <AppText style={styles.label}>{t("auth.phone")}</AppText>
                  <AppTextInput
                    key="input-identifier"
                    style={[styles.input, error ? styles.inputError : null]}
                    value={identifier}
                    onChangeText={(text) => {
                      setError("");
                      setIdentifier(text);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="0901234567"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                </View>
              )}

              {step === "verify" && (
                <View key="step-verify" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <AppText style={styles.label}>OTP (6 digits)</AppText>
                  <AppTextInput
                    key="input-otp"
                    style={[styles.input, error ? styles.inputError : null]}
                    value={otp}
                    onChangeText={(text) => {
                      setError("");
                      setOtp(text.replace(/\D/g, "").slice(0, 6));
                    }}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                    placeholder="******"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                  {secondsUntilResend > 0 ? (
                    <AppText style={styles.resendText}>
                      {t("auth.resendOtp")} ({secondsUntilResend}s)
                    </AppText>
                  ) : null}
                </View>
              )}

              {step === "reset" && (
                <View key="step-reset" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <AppText style={styles.label}>{t("auth.newPassword")}</AppText>
                  <AppTextInput
                    key="input-new-password"
                    ref={newPasswordRef}
                    style={[styles.input, error ? styles.inputError : null]}
                    value={newPassword}
                    onChangeText={(text) => {
                      setError("");
                      setNewPassword(text);
                    }}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="••••••"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />

                  <AppText style={styles.label}>{t("auth.confirmPassword")}</AppText>
                  <AppTextInput
                    key="input-confirm-password"
                    style={[styles.input, error ? styles.inputError : null]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setError("");
                      setConfirmPassword(text);
                    }}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="••••••"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                </View>
              )}

              {error ? (
                <AppText accessibilityLiveRegion="polite" style={styles.errorText}>
                  {error}
                </AppText>
              ) : null}

              <View style={styles.buttonRow}>
                {step === "verify" && (
                  <Pressable
                    style={styles.resendBtn}
                    onPress={handleResend}
                    disabled={secondsUntilResend > 0 || isSubmitting}
                  >
                    <AppText style={[styles.resendBtnText, { color: secondsUntilResend > 0 ? theme.muted : theme.primary }]}>
                      {t("auth.resendOtp")}
                    </AppText>
                  </Pressable>
                )}

                <AppButton
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                >
                  {buttonText}
                </AppButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    keyboardContainer: {
      width: "100%",
      maxWidth: 420,
    },
    dialog: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    scrollContent: {
      padding: 24,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    headerText: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 4,
      lineHeight: 18,
    },
    closeButton: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.surfaceElevated,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputError: {
      borderColor: theme.danger,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 12,
    },
    resendText: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 8,
      textAlign: "right",
    },
    buttonRow: {
      marginTop: 24,
      gap: 12,
    },
    resendBtn: {
      paddingVertical: 8,
      alignItems: "center",
    },
    resendBtnText: {
      fontSize: 13,
      fontWeight: "800",
    },
    submitBtn: {
      width: "100%",
    },
  });
