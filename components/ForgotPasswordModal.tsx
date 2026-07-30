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
import AppButton from "./ui/AppButton";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
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
  const titleRef = useRef<Text>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, step]);

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
        setStep("verify");
      } else if (step === "verify") {
        const token = await authService.verifyPasswordResetOtp(identifier.trim(), otp);
        setResetToken(token);
        setStep("reset");
      } else {
        await authService.resetPassword(resetToken, newPassword);
        notification.success("Đặt lại mật khẩu thành công.", { title: "Thành công" });
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

  const value = step === "request" ? identifier : step === "verify" ? otp : newPassword;
  const label = step === "request"
    ? "Số điện thoại hoặc Email"
    : step === "verify"
      ? "Mã OTP"
      : "Mật khẩu mới";
  const subtitle = step === "request"
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
                    Quên mật khẩu
                  </Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng quên mật khẩu"
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </Pressable>
              </View>

              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={value}
                onChangeText={(text) => {
                  setError("");
                  if (step === "request") setIdentifier(text);
                  else if (step === "verify") setOtp(text.replace(/\D/g, "").slice(0, 6));
                  else setNewPassword(text);
                }}
                keyboardType={step === "verify" ? "number-pad" : "email-address"}
                autoCapitalize="none"
                secureTextEntry={step === "reset"}
                maxLength={step === "verify" ? 6 : undefined}
                placeholderTextColor={theme.muted}
                editable={!isSubmitting}
              />

              {step === "reset" ? (
                <>
                  <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                  <TextInput
                    style={[styles.input, error ? styles.inputError : null]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError("");
                    }}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholderTextColor={theme.muted}
                    editable={!isSubmitting}
                  />
                </>
              ) : null}

              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
              ) : null}

              <AppButton
                onPress={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                icon={step === "reset" ? "lock-closed-outline" : "send-outline"}
                style={styles.button}
              >
                {step === "request" ? "Gửi mã OTP" : step === "verify" ? "Xác minh OTP" : "Đặt lại mật khẩu"}
              </AppButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
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
  label: { fontSize: 13, color: theme.muted, marginBottom: 8, marginTop: 10, fontWeight: "700" },
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
  errorText: { color: theme.danger, fontSize: 12, fontWeight: "600", marginTop: 6 },
  button: { marginTop: 22 },
});
