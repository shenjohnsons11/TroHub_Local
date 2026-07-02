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
import ChangePasswordModal from "../components/ChangePasswordModal";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onLogout: () => void;
};

export default function AdminSettingsScreen({ profile, onSave, onBack, onLogout }: Props) {
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [email, setEmail] = useState(profile.email || "");
  const [bankId, setBankId] = useState(profile.bankId || "");
  const [bankAccountNo, setBankAccountNo] = useState(profile.bankAccountNo || "");
  const [bankAccountName, setBankAccountName] = useState(profile.bankAccountName || "");

  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên chủ trọ");
      return;
    }
    
    if (bankId || bankAccountNo || bankAccountName) {
      if (!bankId || !bankAccountNo || !bankAccountName) {
        Alert.alert("Lỗi", "Vui lòng nhập đầy đủ 3 trường Tên ngân hàng, Số tài khoản và Tên chủ tài khoản, hoặc để trống toàn bộ nếu chưa muốn cài đặt.");
        return;
      }
    }

    onSave({
      ...profile,
      fullName,
      phone,
      email,
      bankId,
      bankAccountNo,
      bankAccountName,
    });
    Alert.alert("Thành công", "Đã cập nhật thông tin cài đặt");
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Cài đặt Chủ trọ</Text>
        <Text style={styles.subtitle}>
          Thiết lập thông tin cá nhân và tài khoản ngân hàng để nhận tiền từ người thuê.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#9FA4B4"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="0901234567"
              keyboardType="number-pad"
              placeholderTextColor="#9FA4B4"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9FA4B4"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tài khoản Ngân hàng (Mã QR)</Text>
          <Text style={styles.infoText}>
            Dùng để tạo mã QR thanh toán trên hóa đơn của người thuê. Cần nhập chính xác Tên viết tắt (VD: VCB, MB) hoặc Mã BIN.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ngân hàng (Tên viết tắt hoặc BIN)</Text>
            <TextInput
              style={styles.input}
              value={bankId}
              onChangeText={setBankId}
              placeholder="VD: MB hoặc 970422"
              autoCapitalize="characters"
              placeholderTextColor="#9FA4B4"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Số tài khoản</Text>
            <TextInput
              style={styles.input}
              value={bankAccountNo}
              onChangeText={setBankAccountNo}
              placeholder="Nhập số tài khoản"
              keyboardType="number-pad"
              placeholderTextColor="#9FA4B4"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên chủ tài khoản</Text>
            <TextInput
              style={styles.input}
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholder="VD: NGUYEN VAN A"
              autoCapitalize="characters"
              placeholderTextColor="#9FA4B4"
            />
          </View>
        </Card>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Lưu cài đặt</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Bảo mật</Text>
        <Pressable style={styles.passwordButton} onPress={() => setPasswordVisible(true)}>
          <Text style={styles.passwordText}>Đổi mật khẩu</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>

      <ChangePasswordModal
        visible={passwordVisible}
        onClose={() => setPasswordVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: "900",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 40,
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
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
    lineHeight: 20,
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE58F",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    backgroundColor: "#F8F9FB",
  },
  saveButton: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
  },
  passwordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.muted,
  },
  logoutButton: {
    height: 52,
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  logoutText: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: "900",
  },
});
