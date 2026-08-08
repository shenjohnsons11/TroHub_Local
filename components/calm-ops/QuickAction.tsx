import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
export default function QuickAction({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.text }, pressed && styles.pressed]}><Ionicons name={icon} size={24} color={theme.primary} style={[styles.icon, { backgroundColor: theme.primarySoft }]} /><AppText style={[styles.label, { color: theme.text }]}>{label}</AppText></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 88, flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 10, borderWidth: 1, borderRadius: 16, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 5 }, shadowRadius: 12, elevation: 2 }, pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] }, icon: { padding: 9, borderRadius: 13, overflow: "hidden" }, label: { fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "center" } });
