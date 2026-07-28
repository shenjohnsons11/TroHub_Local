import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<Text>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const handlePhoneChange = (value: string) => {
    const onlyNumber = value.replace(/[^0-9]/g, "");
    setPhone(onlyNumber);

    if (phoneError) {
      setPhoneError("");
    }
  };

  const resetForm = () => {
    setPhone("");
    setPhoneError("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    let isValid = true;

    if (!phone.trim()) {
      setPhoneError("Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (phone.length !== 10) {
      setPhoneError("Số điện thoại phải gồm đúng 10 số");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!isValid) return;

    try {
      setIsSubmitting(true);

      await authService.forgotPassword(phone);

      notification.success(
        "Hướng dẫn khôi phục mật khẩu đã được gửi đến số điện thoại của bạn.",
        { title: "Thành công" },
      );

      handleClose();
    } catch (error) {
      console.log("Lỗi gửi yêu cầu quên mật khẩu:", error);
      notification.error("Không thể gửi yêu cầu. Vui lòng thử lại.", { title: "Lỗi" });
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
              <Text
                ref={titleRef}
                style={styles.title}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                Quên mật khẩu
              </Text>
              <Text style={styles.subtitle}>
                Nhập số điện thoại để nhận hướng dẫn khôi phục mật khẩu.
              </Text>
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

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={[styles.input, phoneError ? styles.inputError : null]}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder=""
            placeholderTextColor={theme.muted}
            editable={!isSubmitting}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

          <AppButton
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            icon="send-outline"
          >
            Gửi yêu cầu
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
