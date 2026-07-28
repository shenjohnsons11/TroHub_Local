import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "../components/ui/AppButton";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onSuccess: () => void;
  onLogout: () => void;
};

export default function ChangePasswordScreen({ onSuccess, onLogout }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notification.error("Vui lòng nhập đầy đủ thông tin", { title: "Lỗi" });
      return;
    }
    if (newPassword.length < 6) {
      notification.error("Mật khẩu mới phải từ 6 ký tự trở lên", { title: "Lỗi" });
      return;
    }
    if (newPassword !== confirmPassword) {
      notification.error("Mật khẩu xác nhận không khớp", { title: "Lỗi" });
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.changePassword(currentPassword, newPassword);
      notification.success("Đổi mật khẩu thành công!", { title: "Thành công" });
      onSuccess(); // Chuyển về home
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Có lỗi xảy ra", { title: "Lỗi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.securityIcon}>
                <Ionicons name="shield-checkmark-outline" size={30} color={theme.primary} />
              </View>
              <Text style={styles.title}>Đổi mật khẩu bắt buộc</Text>
              <Text style={styles.subtitle}>
                Để bảo mật tài khoản, bạn vui lòng đổi mật khẩu trước khi sử dụng hệ thống.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Mật khẩu hiện tại</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu cũ (VD: 123456)"
                placeholderTextColor={theme.muted}
                secureTextEntry
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới (từ 6 ký tự)"
                placeholderTextColor={theme.muted}
                secureTextEntry
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={theme.muted}
                secureTextEntry
                editable={!isSubmitting}
              />

              <AppButton
                onPress={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                icon="shield-checkmark-outline"
              >
                Xác nhận đổi mật khẩu
              </AppButton>

              <AppButton variant="danger" icon="log-out-outline" onPress={onLogout} disabled={isSubmitting}>
                Đăng xuất
              </AppButton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 50,
    backgroundColor: theme.background,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  securityIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    width: "100%",
    gap: 12,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  label: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 15,
    color: theme.text,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  disabledButton: { opacity: 0.75 },
  primaryText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "800",
  },
  logoutButton: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutText: {
    color: theme.danger,
    fontSize: 15,
    fontWeight: "600",
  },
});
