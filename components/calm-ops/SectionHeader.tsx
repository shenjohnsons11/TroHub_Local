import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.row}><AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>{action}</View>;
}
const styles = StyleSheet.create({ row: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 16, fontWeight: "900" } });
