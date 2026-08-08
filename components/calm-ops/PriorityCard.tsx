import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  title: string;
  description: string;
  count?: number;
  urgent?: boolean;
  onPress: () => void;
};

export default function PriorityCard({ title, description, count, urgent = false, onPress }: Props) {
  const { theme } = useAppTheme();
  const color = urgent ? theme.warningForeground : theme.positive;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.text }, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: urgent ? theme.warningSoft : theme.positiveSoft, shadowColor: color }]}>
        <Ionicons name={urgent ? "alert-circle-outline" : "checkmark-circle-outline"} size={24} color={color} />
      </View>
      <View style={styles.copy}>
        <AppText style={[styles.title, { color }]}>{count !== undefined ? `${count} ` : ""}{title}</AppText>
        <AppText style={[styles.description, { color: theme.muted }]}>{description}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 16, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 3 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 }, shadowRadius: 7, elevation: 2 },
  copy: { flex: 1 },
  title: { fontSize: 16, fontWeight: "900" },
  description: { marginTop: 4, fontSize: 12, lineHeight: 17 },
});
