import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { FONT_FAMILIES, TROHUB_THEMES } from "../constants/theme";
import { useNotification } from "../hooks/useNotification";
import { authService } from "../services/authService";
import { getNotificationMessage } from "../utils/notificationMessages";
import { getPasswordPolicyError } from "../utils/passwordPolicy";

type Props = { visible: boolean; onClose: () => void };
type Step = "identifier" | "otp" | "password";

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const notification = useNotification();
  const dark = useColorScheme() === "dark";
  const theme = TROHUB_THEMES[dark ? "dark" : "light"];
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
    const timer = setInterval(
      () => setSecondsUntilResend((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [secondsUntilResend]);

  const reset = () => {
    setStep("identifier");
    setIdentifier("");
    setOtp("");
    setResetToken("");
    setPassword("");
    setConfirmation("");
    setSecondsUntilResend(0);
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const requestOtp = async () => {
    if (!identifier.trim()) {
      notification.warning("Vui lòng nhập số điện thoại hoặc tên đăng nhập.");
      return;
    }
    try {
      setLoading(true);
      const result = await authService.requestPasswordReset(identifier.trim());
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
    if (!/^\d{6}$/.test(otp)) {
      notification.warning("Mã xác minh phải gồm đúng 6 chữ số.");
      return;
    }
    try {
      setLoading(true);
      const result = await authService.verifyPasswordReset(identifier.trim(), otp);
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
    if (password !== confirmation) {
      return notification.warning("Mật khẩu xác nhận không khớp.");
    }
    try {
      setLoading(true);
      const result = await authService.completePasswordReset(resetToken, password);
      notification.success(result.message);
      close();
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể đặt lại mật khẩu."));
    } finally {
      setLoading(false);
    }
  };

  const title = step === "identifier"
    ? "Khôi phục tài khoản"
    : step === "otp" ? "Nhập mã xác minh" : "Tạo mật khẩu mới";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Bước {step === "identifier" ? 1 : step === "otp" ? 2 : 3} / 3
              </Text>
            </View>
            <Pressable accessibilityLabel="Đóng" onPress={close} style={styles.close}>
              <Text style={[styles.closeText, { color: theme.text }]}>×</Text>
            </Pressable>
          </View>

          {step === "identifier" && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Số điện thoại hoặc tên đăng nhập</Text>
              <TextInput
                autoCapitalize="none"
                editable={!loading}
                onChangeText={setIdentifier}
                placeholder="Ví dụ: 0901234567"
                placeholderTextColor={theme.muted}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={identifier}
              />
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Mã OTP 6 số</Text>
              <TextInput
                editable={!loading}
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => setOtp(value.replace(/\D/g, ""))}
                style={[styles.input, styles.otp, { borderColor: theme.border, color: theme.text }]}
                value={otp}
              />
              <Pressable disabled={loading || secondsUntilResend > 0} onPress={requestOtp}>
                <Text style={[styles.resend, { color: secondsUntilResend ? theme.muted : theme.primary }]}>
                  {secondsUntilResend > 0 ? `Gửi lại sau ${secondsUntilResend}s` : "Gửi lại mã"}
                </Text>
              </Pressable>
            </>
          )}

          {step === "password" && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Mật khẩu mới</Text>
              <TextInput secureTextEntry onChangeText={setPassword} value={password}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]} />
              <Text style={[styles.label, { color: theme.text }]}>Xác nhận mật khẩu</Text>
              <TextInput secureTextEntry onChangeText={setConfirmation} value={confirmation}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]} />
            </>
          )}

          <Pressable
            disabled={loading}
            onPress={step === "identifier" ? requestOtp : step === "otp" ? verifyOtp : complete}
            style={[styles.primary, { backgroundColor: theme.primary }, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.primaryText}>
                {step === "identifier" ? "Gửi mã xác minh" : step === "otp" ? "Xác minh" : "Đặt mật khẩu mới"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  panel: { borderRadius: 14, borderWidth: 1, padding: 22 },
  header: { alignItems: "flex-start", flexDirection: "row", marginBottom: 22 },
  heading: { flex: 1 },
  title: { fontFamily: FONT_FAMILIES.sans, fontSize: 22, fontWeight: "900" },
  subtitle: { fontFamily: FONT_FAMILIES.sans, fontSize: 13, marginTop: 5 },
  close: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  closeText: { fontSize: 28 },
  label: { fontFamily: FONT_FAMILIES.sans, fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 10 },
  input: { borderRadius: 10, borderWidth: 1, fontFamily: FONT_FAMILIES.sans, fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  otp: { fontSize: 24, fontWeight: "800", letterSpacing: 8, textAlign: "center" },
  resend: { fontFamily: FONT_FAMILIES.sans, fontSize: 13, fontWeight: "700", marginTop: 12, textAlign: "right" },
  primary: { alignItems: "center", borderRadius: 10, justifyContent: "center", marginTop: 22, minHeight: 52 },
  primaryText: { color: "#fff", fontFamily: FONT_FAMILIES.sans, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.65 },
});
