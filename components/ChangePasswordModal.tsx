import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
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
      setOldError(t("i18n.security.passwordRequired"));
      isValid = false;
    } else {
      setOldError("");
    }

    if (!newPassword.trim()) {
      setNewError(t("i18n.security.newPasswordRequired"));
      isValid = false;
    } else if (newPassword.length <= 6) {
      setNewError(t("i18n.security.passwordTooShort"));
      isValid = false;
    } else if (newPassword === oldPassword) {
      setNewError(t("i18n.security.passwordMustDiffer"));
      isValid = false;
    } else {
      setNewError("");
    }

    if (!confirmPassword.trim()) {
      setConfirmError(t("i18n.security.confirmPasswordRequired"));
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmError(t("i18n.security.passwordMismatch"));
      isValid = false;
    } else {
      setConfirmError("");
    }

    if (!isValid) return;

    try {
      setIsSubmitting(true);

      await authService.changePassword(oldPassword, newPassword);

      notification.success(t("i18n.security.changed"), { title: t("common.success") });
      handleClose();
    } catch (error) {
      console.log("Lỗi đổi mật khẩu:", error);
      notification.error(t("i18n.security.changeFailed"), { title: t("common.error") });
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
                {t("i18n.security.changePassword")}
              </AppText>
              <AppText style={styles.subtitle}>
                {t("i18n.security.changePasswordSubtitle")}
              </AppText>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t("i18n.security.closeChangePassword")}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <AppText style={styles.label}>{t("i18n.security.currentPassword")}</AppText>
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

          <AppText style={styles.label}>{t("auth.newPassword")}</AppText>
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

          <AppText style={styles.label}>{t("auth.confirmPassword")}</AppText>
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
            {t("i18n.security.updatePassword")}
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
