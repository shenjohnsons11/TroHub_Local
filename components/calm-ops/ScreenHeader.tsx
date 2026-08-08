import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function ScreenHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.row}><View style={styles.copy}>{eyebrow ? <AppText style={[styles.eyebrow, { color: theme.warningForeground }]}>{eyebrow}</AppText> : null}<AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>{description ? <AppText style={[styles.description, { color: theme.muted }]}>{description}</AppText> : null}</View>{action}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  copy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900", letterSpacing: -0.8 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5 },
});
