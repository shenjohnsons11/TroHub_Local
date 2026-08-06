import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, StyleSheet, View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemeToggle from "../components/ThemeToggle";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { UserProfile } from "../types/UserProfile";
import ChangePasswordModal from "../components/ChangePasswordModal";
import AppButton from "../components/ui/AppButton";
import GradientHero from "../components/ui/GradientHero";
import { formatPhone, unformatDigits } from "../utils/formatters";
import { getExpoPushToken, isPushEnabled, notificationPlatform, openNotificationSettings, requestNotificationPermission, setPushEnabled } from "../services/pushNotificationService";
import { notificationService } from "../services/notificationService";

type Props = { profile: UserProfile; onSave: (profile: UserProfile) => void; onBack: () => void; onLogout: () => void; onPushTokenChange?: (token: string | null) => void };

export default function AdminSettingsScreen({ profile, onSave, onBack, onLogout, onPushTokenChange }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [email, setEmail] = useState(profile.email || "");
  const [bankId, setBankId] = useState(profile.bankId || "");
  const [bankAccountNo, setBankAccountNo] = useState(profile.bankAccountNo || "");
  const [bankAccountName, setBankAccountName] = useState(profile.bankAccountName || "");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    void isPushEnabled(profile.id).then(setPushPreference);
  }, [profile.id]);

  const handlePushChange = async (next: boolean) => {
    const previous = pushEnabled;
    setPushLoading(true);
    setPushError("");
    try {
      if (next) {
        if (await requestNotificationPermission() !== "granted") {
          setPushError("Bạn chưa cho phép thông báo trên thiết bị.");
          return;
        }
        const token = await getExpoPushToken();
        if (!token) throw new Error("Chưa thể đăng ký thiết bị này nhận thông báo.");
        await notificationService.registerDevice(token, notificationPlatform());
        await setPushEnabled(profile.id, true);
        setPushPreference(true);
        onPushTokenChange?.(token);
      } else {
        const token = await getExpoPushToken();
        if (token) await notificationService.deactivateDevice(token);
        await setPushEnabled(profile.id, false);
        setPushPreference(false);
        onPushTokenChange?.(null);
      }
    } catch (error) {
      setPushPreference(previous);
      setPushError(error instanceof Error ? error.message : "Không thể cập nhật thông báo.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = () => {
    if (!fullName.trim()) { notification.error("Vui lòng nhập họ và tên chủ trọ"); return; }
    if ((bankId || bankAccountNo || bankAccountName) && (!bankId || !bankAccountNo || !bankAccountName)) {
      notification.error("Vui lòng nhập đầy đủ 3 trường Tên ngân hàng, Số tài khoản và Tên chủ tài khoản, hoặc để trống toàn bộ nếu chưa muốn cài đặt.");
      return;
    }
    onSave({ ...profile, fullName, phone: unformatDigits(phone), email, bankId, bankAccountNo, bankAccountName });
    notification.success("Đã cập nhật thông tin cài đặt");
  };

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];
  return <>
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.back} onPress={onBack}><Ionicons name="arrow-back" size={19} color={theme.primary} /><Text style={[styles.backText, { color: theme.primary }]}>Quay lại</Text></Pressable>
      <GradientHero icon="settings-outline" label="CÀI ĐẶT CHỦ TRỌ" value={fullName || "Chủ trọ"} detail="Thông tin nhận tiền, giao diện và bảo mật tài khoản." />
      <Section title="Thông tin cá nhân" icon="person-outline" theme={theme}>
        <Field label="Họ và tên" value={fullName} setValue={setFullName} placeholder="Nguyễn Văn A" style={inputStyle} muted={theme.muted} />
        <Field label="Số điện thoại" value={phone} setValue={(value: string) => setPhone(formatPhone(value))} placeholder="0901.234.567" keyboardType="number-pad" style={inputStyle} muted={theme.muted} />
        <Field label="Email" value={email} setValue={setEmail} placeholder="chutro@email.com" keyboardType="email-address" style={inputStyle} muted={theme.muted} autoCapitalize="none" />
      </Section>
      <Section title="Tài khoản ngân hàng (Mã QR)" icon="card-outline" theme={theme}>
        <View style={[styles.note, { backgroundColor: theme.primarySoft }]}><Ionicons name="information-circle-outline" size={20} color={theme.primary} /><Text style={[styles.noteText, { color: theme.text }]}>Dùng để tạo mã QR thanh toán. Nhập đúng tên viết tắt (VD: VCB, MB) hoặc mã BIN.</Text></View>
        <Field label="Ngân hàng (Tên viết tắt hoặc BIN)" value={bankId} setValue={setBankId} placeholder="VD: MB hoặc 970422" style={inputStyle} muted={theme.muted} autoCapitalize="characters" />
        <Field label="Số tài khoản" value={bankAccountNo} setValue={setBankAccountNo} placeholder="Nhập số tài khoản" keyboardType="number-pad" style={inputStyle} muted={theme.muted} />
        <Field label="Tên chủ tài khoản" value={bankAccountName} setValue={setBankAccountName} placeholder="VD: NGUYEN VAN A" style={inputStyle} muted={theme.muted} autoCapitalize="characters" />
      </Section>
      <ThemeToggle />
      <Section title="Thông báo" icon="notifications-outline" theme={theme}>
        <View style={styles.pushRow}>
          <View style={styles.pushCopy}><Text style={[styles.pushTitle, { color: theme.text }]}>Bật thông báo</Text><Text style={[styles.pushDescription, { color: theme.muted }]}>Nhận cập nhật trả phòng, sửa chữa, hợp đồng và thanh toán.</Text></View>
          {pushLoading ? <ActivityIndicator color={theme.primary} /> : <Switch accessibilityLabel="Bật thông báo Chủ trọ" value={pushEnabled} onValueChange={(next) => void handlePushChange(next)} />}
        </View>
        {!!pushError && <View style={[styles.pushError, { backgroundColor: `${theme.danger}18` }]}><Text style={[styles.pushErrorText, { color: theme.danger }]}>{pushError}</Text><Pressable accessibilityRole="button" onPress={() => void openNotificationSettings()} style={styles.openSettings}><Text style={[styles.openSettingsText, { color: theme.primary }]}>Mở cài đặt thiết bị</Text></Pressable></View>}
      </Section>
      <AppButton icon="save-outline" onPress={handleSave}>Lưu cài đặt</AppButton>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>Bảo mật</Text>
      <Pressable accessibilityRole="button" style={[styles.security, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]} onPress={() => setPasswordVisible(true)}><View style={styles.securityLead}><Ionicons name="lock-closed-outline" size={22} color={theme.primary} /><Text style={[styles.securityText, { color: theme.text }]}>Đổi mật khẩu</Text></View><Ionicons name="chevron-forward" size={20} color={theme.muted} /></Pressable>
      <AppButton icon="log-out-outline" variant="danger" onPress={onLogout} style={styles.logout}>Đăng xuất</AppButton>
    </ScrollView>
    <ChangePasswordModal visible={passwordVisible} onClose={() => setPasswordVisible(false)} />
  </>;
}

function Section({ title, icon, theme, children }: any) {
  return <View style={[styles.card, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}><View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name={icon} size={20} color={theme.primary} /></View><Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text></View>{children}</View>;
}
function Field({ label, value, setValue, placeholder, keyboardType, style, muted, autoCapitalize }: any) {
  return <View style={styles.field}><Text style={[styles.label, { color: style[1].color }]}>{label}</Text><TextInput style={style} value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={muted} keyboardType={keyboardType} autoCapitalize={autoCapitalize} /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, paddingTop: 28, paddingBottom: 42 },
  back: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", minHeight: 44, marginBottom: 12 }, backText: { fontSize: 14, fontWeight: "900" },
  card: { borderRadius: 24, padding: 18, marginTop: 18, elevation: 3, shadowOpacity: .08, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }, sectionIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 }, cardTitle: { fontSize: 17, fontWeight: "900" },
  field: { marginTop: 14 }, label: { fontSize: 12, fontWeight: "800", marginBottom: 7 }, input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 },
  note: { flexDirection: "row", gap: 9, borderRadius: 16, padding: 12, marginTop: 8 }, noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  sectionLabel: { fontSize: 18, fontWeight: "900", marginTop: 26, marginBottom: 12 },
  security: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 20, padding: 16, elevation: 3, shadowOpacity: .08, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  securityLead: { flexDirection: "row", alignItems: "center", gap: 10 }, securityText: { fontSize: 15, fontWeight: "800" }, logout: { marginTop: 18 },
  pushRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  pushCopy: { flex: 1 }, pushTitle: { fontSize: 15, fontWeight: "800" }, pushDescription: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  pushError: { marginTop: 12, borderRadius: 14, padding: 12 }, pushErrorText: { fontSize: 12, lineHeight: 18 },
  openSettings: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }, openSettingsText: { fontSize: 13, fontWeight: "800" },
});
