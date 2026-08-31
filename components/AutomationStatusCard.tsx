import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { BillingAutomationPolicy } from "../services/adminService";

export default function AutomationStatusCard({ policy, onConfigure, compact = false }: { policy: BillingAutomationPolicy; onConfigure: () => void; compact?: boolean }) {
  const { theme } = useAppTheme();
  const enabled = policy.autoInvoiceEnabled;
  const reminderDay = policy.invoiceDay === 1 ? "ngày cuối tháng trước" : `ngày ${policy.invoiceDay - 1}`;
  return (
    <Pressable accessibilityRole="button" onPress={onConfigure} style={[styles.card, compact && styles.compact, { backgroundColor: enabled ? theme.primarySoft : theme.surfaceElevated, borderColor: enabled ? theme.primary : theme.border }]}>
      <View style={[styles.icon, { backgroundColor: enabled ? theme.primary : theme.background }]}><Ionicons name="flash" size={20} color={enabled ? theme.background : theme.muted} /></View>
      <View style={styles.copy}>
        <AppText style={[styles.title, { color: enabled ? theme.primary : theme.text }]}>TỰ ĐỘNG HÓA: {enabled ? "ĐANG BẬT" : "ĐANG TẮT"}</AppText>
        <AppText style={[styles.description, { color: theme.muted }]}>{enabled ? `Nhắc quét ${reminderDay} · Phát hành 07:00 ngày ${policy.invoiceDay}` : "Bật tự động xuất hóa đơn hàng tháng để tiết kiệm thời gian chốt số."}</AppText>
      </View>
      <View style={[styles.action, { borderColor: theme.primary }]}><Ionicons name={enabled ? "settings-outline" : "flash-outline"} size={16} color={theme.primary} />{compact ? null : <AppText style={[styles.actionText, { color: theme.primary }]}>{enabled ? "Đổi ngày chốt" : "Kích hoạt"}</AppText>}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 92, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 }, compact: { minHeight: 78, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { fontSize: 11.5, fontWeight: "900", letterSpacing: .3 }, description: { fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  action: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5 }, actionText: { fontSize: 10, fontWeight: "900" },
});
