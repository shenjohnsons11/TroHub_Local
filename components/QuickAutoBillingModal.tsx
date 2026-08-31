import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AppTextInput } from "./ui/typography";
import AppButton from "./ui/AppButton";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { adminService, BillingAutomationPolicy } from "../services/adminService";

type Props = { visible: boolean; policy: BillingAutomationPolicy; onClose: () => void; onSaved: (policy: BillingAutomationPolicy) => void };

export default function QuickAutoBillingModal({ visible, policy, onClose, onSaved }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [draft, setDraft] = useState(policy);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(policy), [policy, visible]);

  const setDay = (field: "invoiceDay" | "dueDay" | "remindDaysBeforeDue", value: string) => {
    setDraft((current) => ({ ...current, [field]: Number(value.replace(/\D/g, "")) || 0 }));
  };
  const save = async () => {
    if (draft.invoiceDay < 1 || draft.invoiceDay > 31 || draft.dueDay < 1 || draft.dueDay > 31 || draft.remindDaysBeforeDue < 1 || draft.remindDaysBeforeDue > 31) {
      notification.warning("Ngày cấu hình phải nằm trong khoảng 1–31.");
      return;
    }
    try {
      setSaving(true);
      onSaved(await adminService.updateBillingAutomationPolicy(draft));
      notification.success("Đã cập nhật tự động hóa hóa đơn.");
      onClose();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Không thể lưu cấu hình.");
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}><Ionicons name="flash" size={20} color={theme.primary} /></View>
            <View style={styles.copy}><AppText style={[styles.title, { color: theme.text }]}>Tự động hóa hóa đơn</AppText><AppText style={[styles.subtitle, { color: theme.muted }]}>Nhắc quét N-1, phát hành tự động lúc 07:00</AppText></View>
            <Switch value={draft.autoInvoiceEnabled} onValueChange={(autoInvoiceEnabled) => setDraft((current) => ({ ...current, autoInvoiceEnabled }))} trackColor={{ false: theme.border, true: theme.primary }} />
          </View>
          <View style={styles.fields}>
            <DayField label="Ngày chốt" value={draft.invoiceDay} onChangeText={(value) => setDay("invoiceDay", value)} theme={theme} />
            <DayField label="Hạn nộp" value={draft.dueDay} onChangeText={(value) => setDay("dueDay", value)} theme={theme} />
            <DayField label="Nhắc trước" value={draft.remindDaysBeforeDue} onChangeText={(value) => setDay("remindDaysBeforeDue", value)} suffix="ngày" theme={theme} />
          </View>
          <View style={[styles.reminder, { backgroundColor: theme.background }]}>
            <View style={styles.copy}><AppText style={[styles.reminderTitle, { color: theme.text }]}>Tự động nhắc nợ</AppText><AppText style={[styles.reminderText, { color: theme.muted }]}>Gửi trước hạn thanh toán theo số ngày đã chọn.</AppText></View>
            <Switch value={draft.autoRemindEnabled} onValueChange={(autoRemindEnabled) => setDraft((current) => ({ ...current, autoRemindEnabled }))} trackColor={{ false: theme.border, true: theme.primary }} />
          </View>
          <View style={styles.actions}><AppButton variant="outline" onPress={onClose} style={styles.action}>Hủy</AppButton><AppButton loading={saving} onPress={() => void save()} style={styles.action}>Lưu cấu hình</AppButton></View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DayField({ label, value, onChangeText, suffix, theme }: { label: string; value: number; onChangeText: (value: string) => void; suffix?: string; theme: any }) {
  return <View style={styles.field}><AppText style={[styles.label, { color: theme.muted }]}>{label}</AppText><View style={[styles.inputShell, { borderColor: theme.border, backgroundColor: theme.background }]}><AppTextInput value={value ? String(value) : ""} onChangeText={onChangeText} keyboardType="number-pad" style={[styles.input, { color: theme.text }]} />{suffix ? <AppText style={[styles.suffix, { color: theme.muted }]}>{suffix}</AppText> : null}</View></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4,16,14,.55)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 }, icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 },
  title: { fontSize: 19, fontWeight: "900" }, subtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 }, fields: { flexDirection: "row", gap: 8, marginTop: 20 },
  field: { flex: 1 }, label: { fontSize: 11, fontWeight: "800", marginBottom: 6 }, inputShell: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }, input: { flex: 1, fontSize: 16, fontWeight: "900", padding: 0 }, suffix: { fontSize: 10, fontWeight: "700" },
  reminder: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 13, marginTop: 16 }, reminderTitle: { fontSize: 13, fontWeight: "900" }, reminderText: { fontSize: 10.5, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 }, action: { flex: 1 },
});
