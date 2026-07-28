import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.row}><Text style={[styles.title, { color: theme.text }]}>{title}</Text>{action}</View>;
}
const styles = StyleSheet.create({ row: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 16, fontWeight: "900" } });
