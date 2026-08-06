import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { WidgetDataSnapshot } from "../../types/WidgetData";
import { formatCurrency } from "../../utils/formatters";

export const LANDLORD_WIDGET_SCAN_URL = "trohub://scan-camera";

type Props = {
  data: WidgetDataSnapshot;
  onScanCamera?: () => void;
};

export default function LandlordHomeWidget({ data, onScanCamera }: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const dark = resolvedTheme === "dark";
  const surface = dark ? "#1e293b" : "#ffffff";
  const text = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "rgba(255,255,255,.1)" : "rgba(15,23,42,.08)";
  const openScan = () => {
    if (onScanCamera) return onScanCamera();
    void Linking.openURL(LANDLORD_WIDGET_SCAN_URL);
  };

  return (
    <View accessibilityLabel="Native Home Widget TroHub Chủ trọ 4x2" style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.brandIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name="home" size={16} color={theme.primary} /></View>
          <Text style={[styles.brandText, { color: text }]}>TroHub Chủ trọ</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Quét Camera CCCD" onPress={openScan} style={[styles.scan, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="camera-outline" size={14} color={theme.primary} />
          <Text style={[styles.scanText, { color: theme.primary }]}>Quét Camera</Text>
        </Pressable>
      </View>
      <View style={styles.metrics}>
        <Metric label="Công nợ chưa thu" value={formatCurrency(data.outstandingDebt)} color="#e53e3e" textColor={muted} borderColor={border} />
        <Metric label="Chốt Điện Nước" value={data.utilityReadingProgress} color="#d69e2e" textColor={muted} borderColor={border} />
        <Metric label="Sự cố đang mở" value={`${data.openRepairsCount} sự cố`} color="#805ad5" textColor={muted} borderColor={border} />
      </View>
    </View>
  );
}

function Metric({ label, value, color, textColor, borderColor }: { label: string; value: string; color: string; textColor: string; borderColor: string }) {
  return <View style={[styles.metric, { borderColor }]}><Text style={[styles.label, { color: textColor }]} numberOfLines={2}>{label}</Text><Text style={[styles.value, { color }]} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { width: "100%", minHeight: 110, borderWidth: 1, borderRadius: 16, padding: 14, justifyContent: "space-between" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 12, fontWeight: "900" },
  scan: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10 },
  scanText: { fontSize: 11, fontWeight: "800" },
  metrics: { flexDirection: "row" },
  metric: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  label: { minHeight: 26, fontSize: 10, fontWeight: "700", lineHeight: 13 },
  value: { marginTop: 4, fontSize: 13, fontWeight: "900" },
});
