import React, { useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TextInput,
  Pressable,
} from "react-native";
import Card from "../components/Card";
import { UserProfile } from "../types/UserProfile";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "../components/ui/AppButton";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
};

export default function ProfileScreen({ profile, onSave, onBack }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const styles = createStyles(theme);
  const formatPhone = (val: any) => {
    let v = String(val || "").replace(/\D/g, "");
    if (v.length > 7) return v.replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3");
    if (v.length > 4) return v.replace(/(\d{4})(\d+)/, "$1.$2");
    return v;
  };

  const formatCCCD = (val: any) => {
    let v = String(val || "").replace(/\D/g, "");
    if (v.length > 8) return v.replace(/(\d{4})(\d{4})(\d+)/, "$1.$2.$3");
    if (v.length > 4) return v.replace(/(\d{4})(\d+)/, "$1.$2");
    return v;
  };

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [email, setEmail] = useState(profile.email);
  const [cccd, setCccd] = useState(formatCCCD(profile.cccd));
  const [room] = useState(profile.room);
  const [startDate] = useState(profile.startDate);

  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChange = (value: string) => {
    let onlyNumber = value.replace(/[^0-9]/g, "");
    if (onlyNumber.length > 10) onlyNumber = onlyNumber.slice(0, 10);
    setPhone(formatPhone(onlyNumber));

    if (phoneError) {
      setPhoneError("");
    }
  };

  const handleSave = () => {
    let isValid = true;

    if (!fullName.trim()) {
      setFullNameError("Vui lòng nhập họ và tên");
      isValid = false;
    } else {
      setFullNameError("");
    }

    if (!phone.trim()) {
      setPhoneError("Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (phone.replace(/\D/g, "").length !== 10) {
      setPhoneError("Số điện thoại không hợp lệ (cần 10 số)");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!isValid) return;

    onSave({
      ...profile,
      fullName: fullName.trim(),
      phone: phone.replace(/\D/g, ""),
      email: email.trim(),
      cccd: cccd.replace(/\D/g, ""),
    });

    notification.success("Thông tin cá nhân đã được cập nhật", { title: "Thành công" });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color={theme.primary} />
        <Text style={styles.backText}>Quay lại</Text>
      </Pressable>

      <Text style={styles.title}>Thông tin cá nhân</Text>
      <Text style={styles.subtitle}>
        Xem và cập nhật thông tin người thuê phòng.
      </Text>

      <Card style={[styles.card, styles.avatarCard]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {fullName ? fullName.charAt(0).toUpperCase() : "A"}
          </Text>
        </View>

        <Text style={styles.name}>{fullName || "Người thuê"}</Text>
        <Text style={styles.roomText}>Phòng {room}</Text>
      </Card>

      <Card style={[styles.card, styles.formCard]}>
        <Text style={styles.sectionTitle}>Thông tin người thuê</Text>

        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          style={[styles.input, fullNameError ? styles.inputError : null]}
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            if (fullNameError) setFullNameError("");
          }}
          placeholder="Nhập họ và tên"
          placeholderTextColor={theme.muted}
        />
        {fullNameError ? (
          <Text style={styles.errorText}>{fullNameError}</Text>
        ) : null}

        <Text style={styles.groupTitle}>Liên hệ</Text>
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="Nhập số điện thoại"
          placeholderTextColor={theme.muted}
        />
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Nhập email"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>CMND/CCCD</Text>
        <TextInput
          style={styles.input}
          value={cccd}
          onChangeText={(value) => {
            let digits = value.replace(/[^0-9]/g, "");
            if (digits.length > 12) digits = digits.slice(0, 12);
            setCccd(formatCCCD(digits));
          }}
          keyboardType="number-pad"
          maxLength={14}
          placeholder="Nhập CMND/CCCD"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.groupTitle}>Thông tin thuê phòng</Text>
        <Text style={styles.label}>Phòng</Text>
        <TextInput style={styles.inputDisabled} value={room} editable={false} />

        <Text style={styles.label}>Ngày bắt đầu thuê</Text>
        <TextInput
          style={styles.inputDisabled}
          value={startDate}
          editable={false}
        />

        <AppButton icon="save-outline" onPress={handleSave}>Lưu thay đổi</AppButton>
      </Card>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    shadowColor: theme.text,
  },
  avatarCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: theme.background,
    fontSize: 34,
    fontWeight: "900",
  },
  name: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.text,
    textAlign: "center",
  },
  roomText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  formCard: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 12,
  },
  groupTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  label: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 14,
    color: theme.text,
  },
  inputDisabled: {
    width: "100%",
    height: 48,
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 14,
    color: theme.muted,
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
  saveButton: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  saveText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "900",
  },
});
