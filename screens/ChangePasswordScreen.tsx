import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { COLORS } from "../constants/theme";
import Toast from "react-native-toast-message";
import { authService } from "../services/authService";

type Props = {
  onSuccess: () => void;
  onLogout: () => void;
};

export default function ChangePasswordScreen({ onSuccess, onLogout }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: "error", text1: "Lỗi", text2: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: "error", text1: "Lỗi", text2: "Mật khẩu mới phải từ 6 ký tự trở lên" });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: "error", text1: "Lỗi", text2: "Mật khẩu xác nhận không khớp" });
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.changePassword(currentPassword, newPassword);
      Toast.show({ type: "success", text1: "Thành công", text2: "Đổi mật khẩu thành công!" });
      onSuccess(); // Chuyển về home
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: error instanceof Error ? error.message : "Có lỗi xảy ra",
      });
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
                secureTextEntry
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới (từ 6 ký tự)"
                secureTextEntry
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
                editable={!isSubmitting}
              />

              <Pressable
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Xác nhận đổi mật khẩu</Text>
                )}
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={onLogout} disabled={isSubmitting}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 50,
    backgroundColor: "#F4F5F7",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  form: { width: "100%" },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    fontSize: 15,
    color: COLORS.text,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  disabledButton: { opacity: 0.75 },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  logoutButton: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutText: {
    color: COLORS.red || "#FF3B30",
    fontSize: 15,
    fontWeight: "600",
  },
});
