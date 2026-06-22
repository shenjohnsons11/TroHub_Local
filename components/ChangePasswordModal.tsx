import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../constants/theme";
import { authService } from "../services/authService";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [oldError, setOldError] = useState("");
  const [newError, setNewError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

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

      Alert.alert("Thành công", "Đổi mật khẩu thành công");
      handleClose();
    } catch (error) {
      console.log("Lỗi đổi mật khẩu:", error);
      Alert.alert("Lỗi", "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Đổi mật khẩu</Text>
              <Text style={styles.subtitle}>
                Cập nhật mật khẩu đăng nhập tài khoản
              </Text>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <TextInput
            style={[styles.input, oldError ? styles.inputError : null]}
            value={oldPassword}
            onChangeText={(value) => {
              setOldPassword(value);
              if (oldError) setOldError("");
            }}
            secureTextEntry
            placeholder=""
            editable={!isSubmitting}
          />
          {oldError ? <Text style={styles.errorText}>{oldError}</Text> : null}

          <Text style={styles.label}>Mật khẩu mới</Text>
          <TextInput
            style={[styles.input, newError ? styles.inputError : null]}
            value={newPassword}
            onChangeText={(value) => {
              setNewPassword(value);
              if (newError) setNewError("");
            }}
            secureTextEntry
            placeholder=""
            editable={!isSubmitting}
          />
          {newError ? <Text style={styles.errorText}>{newError}</Text> : null}

          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <TextInput
            style={[styles.input, confirmError ? styles.inputError : null]}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (confirmError) setConfirmError("");
            }}
            secureTextEntry
            placeholder=""
            editable={!isSubmitting}
          />
          {confirmError ? (
            <Text style={styles.errorText}>{confirmError}</Text>
          ) : null}

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 20,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 26,
    color: COLORS.text,
    marginTop: -2,
  },
  label: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
  input: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF7F7",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  button: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});