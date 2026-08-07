import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

  const titleRef = useRef<Text>(null);
  const newPasswordRef = useRef<TextInput>(null);

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
      setError("Vui lòng nhập số điện thoại hoặc Email");
      return;
    }
    if (step === "verify" && !/^\d{6}$/.test(otp)) {
      setError("Mã OTP phải gồm đúng 6 chữ số");
      return;
    }
    if (step === "reset" && newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (step === "reset" && newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }

    try {
      setIsSubmitting(true);
      if (step === "request") {
        const message = await authService.requestPasswordReset(identifier.trim());
        notification.success(message, { title: "Đã gửi OTP" });
        setSecondsUntilResend(60);
        setStep("verify");
      } else if (step === "verify") {
        const token = await authService.verifyPasswordResetOtp(identifier.trim(), otp);
        setResetToken(token);
        setStep("reset");
      } else {
        await authService.resetPassword(resetToken, newPassword);
        notification.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.", { title: "Thành công" });
        handleClose();
      }
    } catch (caughtError) {
      notification.error(
        getNotificationMessage(caughtError, "Không thể khôi phục mật khẩu. Vui lòng thử lại."),
        { title: "Lỗi" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle =
    step === "request"
      ? "Nhập SĐT hoặc Email để nhận mã OTP qua Email đã đăng ký."
      : step === "verify"
      ? "Nhập mã OTP 6 số đã được gửi đến Email của bạn."
      : "Tạo mật khẩu mới cho tài khoản TroHub.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isSubmitting ? () => undefined : handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.box} accessibilityViewIsModal>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text
                    ref={titleRef}
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                  >
                    {t("auth.forgotPasswordTitle") || "Quên mật khẩu"}
                  </Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </Pressable>
              </View>

              {/* STEP 1: REQUEST OTP */}
              {step === "request" && (
                <View key="step-request" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <Text style={styles.label}>{t("auth.phoneOrEmail") || "Số điện thoại hoặc Email"}</Text>
                  <TextInput
                    key="input-identifier"
                    style={[styles.input, error ? styles.inputError : null]}
                    value={identifier}
                    onChangeText={(text) => {
                      setError("");
                      setIdentifier(text);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Nhập SĐT hoặc Email"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                </View>
              )}

              {/* STEP 2: VERIFY OTP */}
              {step === "verify" && (
                <View key="step-verify" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <Text style={styles.label}>Mã OTP 6 số</Text>
                  <TextInput
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
                    <Text style={styles.resendText}>
                      Gửi lại mã sau {secondsUntilResend}s
                    </Text>
                  ) : null}
                </View>
              )}

              {/* STEP 3: RESET NEW PASSWORD */}
              {step === "reset" && (
                <View key="step-reset" pointerEvents={isSubmitting ? "none" : "auto"}>
                  <Text style={styles.label}>{t("auth.newPassword") || "Mật khẩu mới"}</Text>
                  <TextInput
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
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />

                  <Text style={styles.label}>{t("auth.confirmPassword") || "Xác nhận mật khẩu mới"}</Text>
                  <TextInput
                    key="input-confirm-password"
                    style={[styles.input, error ? styles.inputError : null]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setError("");
                      setConfirmPassword(text);
                    }}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                </View>
              )}

              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {error}
                </Text>
              ) : null}

              <AppButton
                onPress={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                icon={step === "reset" ? "lock-closed-outline" : "send-outline"}
                style={styles.button}
              >
                {step === "request"
                  ? "Gửi mã OTP"
                  : step === "verify"
                  ? "Xác minh OTP"
                  : "🔒 Đặt lại mật khẩu"}
              </AppButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" },
    keyboard: { flex: 1, justifyContent: "flex-end" },
    formScroll: { flex: 1, flexShrink: 1 },
    scroll: { flexGrow: 1, justifyContent: "flex-end" },
    box: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 32,
    },
    header: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginBottom: 18 },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: "900", color: theme.text },
    subtitle: { color: theme.muted, fontSize: 13, marginTop: 5, lineHeight: 20 },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    label: { fontSize: 13, color: theme.muted, marginBottom: 8, marginTop: 12, fontWeight: "700" },
    input: {
      height: 48,
      backgroundColor: theme.surfaceElevated,
      borderRadius: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 14,
    },
    inputError: { borderColor: theme.danger, backgroundColor: theme.warningSoft },
    resendText: { fontSize: 12, color: theme.primary, fontWeight: "700", marginTop: 6, textAlign: "right" },
    errorText: { color: theme.danger, fontSize: 12, fontWeight: "600", marginTop: 6 },
    button: { marginTop: 22 },
  });
