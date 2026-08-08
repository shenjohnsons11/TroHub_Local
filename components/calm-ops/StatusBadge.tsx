import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../../contexts/ThemeContext";

export type CalmStatus = "Đúng hạn" | "Sắp đến hạn" | "Quá hạn" | "Chờ tiếp nhận" | "Đang xử lý" | "Đã hoàn thành" | "Đã thanh toán";

export default function StatusBadge({ label }: { label: CalmStatus | string }) {
  const { theme } = useAppTheme();
  const urgent = label === "Quá hạn" || label === "Sắp đến hạn";
  const success = label === "Đúng hạn" || label === "Đã hoàn thành" || label === "Đã thanh toán";
  const backgroundColor = urgent ? theme.warningSoft : success ? theme.positiveSoft : theme.surfaceElevated;
  const color = urgent ? theme.warningForeground : success ? theme.positive : theme.muted;
  return (
    <View
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor, borderColor: theme.border }]}
    >
      <AppText style={[styles.text, { color }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: "800" },
});
