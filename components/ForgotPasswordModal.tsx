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

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      Alert.alert(
        "Thành công",
        "Hướng dẫn khôi phục mật khẩu đã được gửi đến số điện thoại của bạn."
      );

      handleClose();
    } catch (error) {
      console.log("Lỗi gửi yêu cầu quên mật khẩu:", error);
      Alert.alert("Lỗi", "Không thể gửi yêu cầu. Vui lòng thử lại.");
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
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập số điện thoại để nhận hướng dẫn khôi phục mật khẩu.
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

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={[styles.input, phoneError ? styles.inputError : null]}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder=""
            editable={!isSubmitting}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Gửi yêu cầu</Text>
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