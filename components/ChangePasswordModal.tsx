import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [oldError, setOldError] = useState("");
  const [newError, setNewError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOldError("");
    setNewError("");
    setConfirmError("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    let isValid = true;

    if (!oldPassword.trim()) {
      setOldError("Vui lòng nhập mật khẩu hiện tại");
      isValid = false;
    } else {
      setOldError("");
    }

    if (!newPassword.trim()) {
      setNewError("Vui lòng nhập mật khẩu mới");
      isValid = false;
    } else if (newPassword.length <= 6) {
      setNewError("Mật khẩu mới phải trên 6 ký tự");
      isValid = false;
    } else if (newPassword === oldPassword) {
      setNewError("Mật khẩu mới không được trùng mật khẩu hiện tại");
      isValid = false;
    } else {
      setNewError("");
    }

    if (!confirmPassword.trim()) {
      setConfirmError("Vui lòng xác nhận mật khẩu mới");
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmError("Mật khẩu xác nhận không khớp");
      isValid = false;
    } else {
      setConfirmError("");
    }

    if (!isValid) return;

    try {
      setIsSubmitting(true);

      await authService.changePassword(oldPassword, newPassword);

      notification.success("Đổi mật khẩu thành công", { title: "Thành công" });
      handleClose();
    } catch (error) {
      console.log("Lỗi đổi mật khẩu:", error);
      notification.error("Không thể đổi mật khẩu. Vui lòng thử lại.", { title: "Lỗi" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <AppText
                ref={titleRef}
                style={styles.title}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                Đổi mật khẩu
              </AppText>
              <AppText style={styles.subtitle}>
                Cập nhật mật khẩu đăng nhập tài khoản
              </AppText>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Đóng đổi mật khẩu"
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <AppText style={styles.label}>Mật khẩu hiện tại</AppText>
          <AppTextInput
            style={[styles.input, oldError ? styles.inputError : null]}
            value={oldPassword}
            onChangeText={(value) => {
              setOldPassword(value);
              if (oldError) setOldError("");
            }}
            secureTextEntry
            placeholder=""
            placeholderTextColor={theme.muted}
            editable={!isSubmitting}
          />
          {oldError ? <AppText style={styles.errorText}>{oldError}</AppText> : null}

          <AppText style={styles.label}>Mật khẩu mới</AppText>
          <AppTextInput
            style={[styles.input, newError ? styles.inputError : null]}
            value={newPassword}
            onChangeText={(value) => {
              setNewPassword(value);
              if (newError) setNewError("");
            }}
            secureTextEntry
            placeholder=""
            placeholderTextColor={theme.muted}
            editable={!isSubmitting}
          />
          {newError ? <AppText style={styles.errorText}>{newError}</AppText> : null}

          <AppText style={styles.label}>Xác nhận mật khẩu mới</AppText>
          <AppTextInput
            style={[styles.input, confirmError ? styles.inputError : null]}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (confirmError) setConfirmError("");
            }}
            secureTextEntry
            placeholder=""
            placeholderTextColor={theme.muted}
            editable={!isSubmitting}
          />
          {confirmError ? (
            <AppText style={styles.errorText}>{confirmError}</AppText>
          ) : null}

          <AppButton
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            icon="lock-closed-outline"
          >
            Cập nhật mật khẩu
          </AppButton>
        </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "flex-end",
  },
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 26,
    color: theme.text,
    marginTop: -2,
  },
  label: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
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
  inputError: {
    borderColor: theme.danger,
    backgroundColor: theme.warningSoft,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  button: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "900",
  },
});
