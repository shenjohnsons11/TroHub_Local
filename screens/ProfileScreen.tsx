import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import Card from "../components/Card";
import { UserProfile } from "../types/UserProfile";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "../components/ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onLogout: () => void;
};

export default function ProfileScreen({ profile, onSave, onBack, onLogout }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const styles = createStyles(theme);

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [email, setEmail] = useState(profile.email);
  const [cccd, setCccd] = useState(formatCCCD(profile.cccd));
  const [room] = useState(profile.room);
  const [startDate] = useState(profile.startDate);

  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));

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
    } else if (unformatDigits(phone).length !== 10) {
      setPhoneError("Số điện thoại không hợp lệ (cần 10 số)");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!isValid) return;

    onSave({
      ...profile,
      fullName: fullName.trim(),
      phone: unformatDigits(phone),
      email: email.trim(),
      cccd: unformatDigits(cccd),
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
        <AppText style={styles.backText}>Quay lại</AppText>
      </Pressable>

      <AppText style={styles.title}>Thông tin cá nhân</AppText>
      <AppText style={styles.subtitle}>
        Xem và cập nhật thông tin người thuê phòng.
      </AppText>

      <Card style={[styles.card, styles.avatarCard]}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>
            {fullName ? fullName.charAt(0).toUpperCase() : "A"}
          </AppText>
        </View>

        <AppText style={styles.name}>{fullName || "Người thuê"}</AppText>
        <AppText style={styles.roomText}>Phòng {room}</AppText>
      </Card>

      <Card style={[styles.card, styles.formCard]}>
        <AppText style={styles.sectionTitle}>Thông tin người thuê</AppText>

        <AppText style={styles.label}>Họ và tên</AppText>
        <AppTextInput
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
          <AppText style={styles.errorText}>{fullNameError}</AppText>
        ) : null}

        <AppText style={styles.groupTitle}>Liên hệ</AppText>
        <AppText style={styles.label}>Số điện thoại</AppText>
        <AppTextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="Nhập số điện thoại"
          placeholderTextColor={theme.muted}
        />
        {phoneError ? <AppText style={styles.errorText}>{phoneError}</AppText> : null}

        <AppText style={styles.label}>Email</AppText>
        <AppTextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Nhập email"
          placeholderTextColor={theme.muted}
        />

        <AppText style={styles.label}>CMND/CCCD</AppText>
        <AppTextInput
          style={styles.input}
          value={cccd}
          onChangeText={(value) => setCccd(formatCCCD(value))}
          keyboardType="number-pad"
          maxLength={14}
          placeholder="Nhập CMND/CCCD"
          placeholderTextColor={theme.muted}
        />

        <AppText style={styles.groupTitle}>Thông tin thuê phòng</AppText>
        <AppText style={styles.label}>Phòng</AppText>
        <AppTextInput style={styles.inputDisabled} value={room} editable={false} />

        <AppText style={styles.label}>Ngày bắt đầu thuê</AppText>
        <AppTextInput
          style={styles.inputDisabled}
          value={startDate}
          editable={false}
        />

        <AppButton icon="save-outline" onPress={handleSave}>Lưu thay đổi</AppButton>
        <AppButton 
          icon="log-out-outline" 
          onPress={onLogout}
          style={{ marginTop: 12, backgroundColor: theme.danger }}
        >
          Đăng xuất
        </AppButton>
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
