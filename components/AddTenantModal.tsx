import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminRoom } from "../services/adminService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "./ui/AppButton";
import CCCDScannerModal from "./CCCDScannerModal";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";

type Props = { visible: boolean; rooms: AdminRoom[]; onClose: () => void; onSuccess: () => void };

export default function AddTenantModal({ visible, rooms, onClose, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [lookupIdentifier, setLookupIdentifier] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "new" | "error">("idle");
  const [existingTenantId, setExistingTenantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const vacantRooms = rooms.filter((room) => room.status === 0);

  const reset = () => {
    setFullName(""); setPhone(""); setEmail(""); setIdCard(""); setRoomCode("");
    setLookupIdentifier(""); setLookupStatus("idle"); setExistingTenantId(null);
  };

  useEffect(() => { if (visible) reset(); }, [visible]);
  useEffect(() => {
    if (!visible || !lookupIdentifier) return;
    const digits = unformatDigits(lookupIdentifier);
    const ready = digits.length === 10 || digits.length === 12 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lookupIdentifier.trim());
    if (!ready) { setLookupStatus("idle"); return; }
    let active = true;
    setLookupStatus("loading");
    const timer = setTimeout(() => {
      adminService.lookupTenant(lookupIdentifier).then((result) => {
        if (!active) return;
        if (result.found && result.data) {
          setExistingTenantId(result.data._id); setFullName(result.data.fullName || ""); setPhone(formatPhone(result.data.phone)); setEmail(result.data.email || ""); setIdCard(formatCCCD(result.data.idCard)); setLookupStatus("found");
        } else { setExistingTenantId(null); setLookupStatus("new"); }
      }).catch(() => { if (active) setLookupStatus("error"); });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [lookupIdentifier, visible]);

  const handleAddTenant = async () => {
    const cleanPhone = unformatDigits(phone); const cleanIdCard = unformatDigits(idCard);
    if (!fullName.trim() || !phone.trim() || !email.trim() || !idCard.trim() || !roomCode) return notification.error("Vui lòng điền đầy đủ thông tin và chọn phòng!");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return notification.error("Vui lòng nhập Email đúng định dạng.");
    if (cleanPhone.length !== 10) return notification.error("Số điện thoại phải gồm đúng 10 chữ số!");
    if (cleanIdCard.length !== 12) return notification.error("Số CCCD phải gồm đúng 12 chữ số!");
    try {
      setSubmitting(true);
      await adminService.createTenant({ fullName: fullName.trim(), phone: cleanPhone, email: email.trim(), idCard: cleanIdCard, roomCode });
      notification.success(existingTenantId ? "Đã liên kết Người thuê vào phòng!" : "Đã tạo mới và liên kết Người thuê vào phòng!");
      onClose(); onSuccess();
    } catch (error) { notification.error(error instanceof Error ? error.message : "Thêm người thuê thất bại!"); }
    finally { setSubmitting(false); }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];
  return <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!submitting) onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} /><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Thêm người thuê mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thêm người thuê" disabled={submitting} onPress={onClose}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.formHint, { color: theme.muted }]}>Nhập SĐT, CCCD hoặc Email; hệ thống sẽ tự tra cứu sau khi dữ liệu hợp lệ.</Text>
          <Field label="Số điện thoại" value={phone} onChange={(text: string) => { const value = formatPhone(text); setPhone(value); setLookupIdentifier(value); }} placeholder="0901.234.567" style={inputStyle} muted={theme.muted} keyboardType="phone-pad" editable={!existingTenantId} />
          <Field label="Số CCCD" value={idCard} onChange={(text: string) => { const value = formatCCCD(text); setIdCard(value); setLookupIdentifier(value); }} placeholder="0790.1234.5678" style={inputStyle} muted={theme.muted} keyboardType="numeric" editable={!existingTenantId} accessory={<Pressable accessibilityRole="button" accessibilityLabel="Quét CCCD bằng camera" disabled={Boolean(existingTenantId)} onPress={() => setScannerVisible(true)} style={[styles.scanButton, { backgroundColor: theme.primarySoft }]}><Text style={[styles.scanButtonText, { color: theme.primary }]}>📷 Quét CCCD</Text></Pressable>} />
          <Field label="Email" value={email} onChange={(text: string) => { setEmail(text); setLookupIdentifier(text); }} placeholder="nguyenvana@gmail.com" style={inputStyle} muted={theme.muted} keyboardType="email-address" editable={!existingTenantId} />
          <Field label="Họ và tên" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" style={inputStyle} muted={theme.muted} editable={!existingTenantId} />
          {lookupStatus !== "idle" ? <View accessibilityLiveRegion="polite" style={[styles.lookupBox, { backgroundColor: theme.primarySoft }]}><Ionicons name={lookupStatus === "found" ? "link-outline" : lookupStatus === "loading" ? "search-outline" : "person-add-outline"} size={18} color={theme.primary} /><Text style={[styles.lookupText, { color: theme.text }]}>{lookupStatus === "loading" ? "Đang tra cứu…" : lookupStatus === "found" ? "Đã tìm thấy tài khoản. Hồ sơ được khóa để liên kết an toàn." : lookupStatus === "error" ? "Không thể tra cứu lúc này. Vui lòng thử lại." : "Chưa có tài khoản. Hệ thống sẽ tạo mới với mật khẩu 123456."}</Text></View> : null}
          <Text style={[styles.label, { color: theme.text }]}>Phòng xếp</Text><View style={styles.roomChips}>{vacantRooms.map((room) => { const selected = roomCode === room.roomCode; return <Pressable key={room._id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setRoomCode(room.roomCode)} style={[styles.roomChip, { backgroundColor: selected ? theme.primary : theme.background, borderColor: selected ? theme.primary : theme.border }]}><Text style={[styles.roomChipText, { color: selected ? theme.background : theme.text }]}>{room.roomCode}</Text></Pressable>; })}</View>
          <AppButton icon={existingTenantId ? "link-outline" : "person-add-outline"} loading={submitting} disabled={lookupStatus === "loading"} onPress={handleAddTenant}>{existingTenantId ? "Liên kết Người thuê vào phòng" : "Tạo mới & Liên kết"}</AppButton>
        </ScrollView>
      </View></KeyboardAvoidingView>
    </Modal>
    <CCCDScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={(cccdNumber) => { setIdCard(formatCCCD(cccdNumber)); setLookupIdentifier(cccdNumber); }} />
  </>;
}

function Field({ label, value, onChange, placeholder, style, muted, keyboardType, editable = true, accessory }: any) { return <View style={styles.field}><Text style={[styles.label, { color: style[1].color }]}>{label}</Text><View style={accessory ? styles.fieldRow : undefined}><TextInput editable={editable} style={accessory ? [...style, styles.fieldInput] : style} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={muted} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} />{accessory}</View></View>; }
const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" }, form: { gap: 14, paddingBottom: 8 }, formHint: { fontSize: 12, lineHeight: 18 }, field: { gap: 7 }, label: { fontSize: 12, fontWeight: "800" }, input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 }, fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 }, fieldInput: { flex: 1 }, scanButton: { minHeight: 44, justifyContent: "center", borderRadius: 12, paddingHorizontal: 10 }, scanButtonText: { fontSize: 11, fontWeight: "800" }, lookupBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, padding: 12 }, lookupText: { flex: 1, fontSize: 12, lineHeight: 17 }, roomChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, roomChip: { minHeight: 44, minWidth: 68, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, roomChipText: { fontSize: 13, fontWeight: "800" } });
