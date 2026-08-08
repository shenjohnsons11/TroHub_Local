import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  const { theme } = useAppTheme();

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Đang tải dữ liệu" style={[styles.wrap, { backgroundColor: theme.background }]}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.line, styles.short, { backgroundColor: theme.primarySoft }]} />
          <View style={[styles.line, { backgroundColor: theme.primarySoft }]} />
          <View style={[styles.line, styles.medium, { backgroundColor: theme.primarySoft }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 12, padding: 16 },
  row: { gap: 10, borderWidth: 1, borderRadius: 16, padding: 16 },
  line: { height: 12, borderRadius: 6, width: "100%" },
  short: { width: "38%" },
  medium: { width: "68%" },
});
