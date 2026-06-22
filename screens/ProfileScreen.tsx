import React, { useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import { UserProfile } from "../types/UserProfile";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
};

export default function ProfileScreen({ profile, onSave, onBack }: Props) {
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

    Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </Pressable>

      <Text style={styles.title}>Thông tin cá nhân</Text>
      <Text style={styles.subtitle}>
        Xem và cập nhật thông tin người thuê phòng.
      </Text>

      <Card style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {fullName ? fullName.charAt(0).toUpperCase() : "A"}
          </Text>
        </View>

        <Text style={styles.name}>{fullName || "Người thuê"}</Text>
        <Text style={styles.roomText}>Phòng {room}</Text>
      </Card>

      <Card style={styles.formCard}>
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
          placeholderTextColor={COLORS.muted}
        />
        {fullNameError ? (
          <Text style={styles.errorText}>{fullNameError}</Text>
        ) : null}

        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="Nhập số điện thoại"
          placeholderTextColor={COLORS.muted}
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
          placeholderTextColor={COLORS.muted}
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
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.label}>Phòng</Text>
        <TextInput style={styles.inputDisabled} value={room} editable={false} />

        <Text style={styles.label}>Ngày bắt đầu thuê</Text>
        <TextInput
          style={styles.inputDisabled}
          value={startDate}
          editable={false}
        />

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Lưu thay đổi</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  avatarCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  name: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },
  roomText: {
    color: COLORS.orange,
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
    color: COLORS.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    fontSize: 14,
    color: COLORS.text,
  },
  inputDisabled: {
    width: "100%",
    height: 48,
    backgroundColor: "#ECEEF2",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E1E3E8",
    fontSize: 14,
    color: COLORS.muted,
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
  saveButton: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});