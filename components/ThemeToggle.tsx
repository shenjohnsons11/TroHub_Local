import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, themeMode, toggleTheme } = useAppTheme();
  const dark = themeMode === "dark";

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View>
        <Text style={[styles.title, { color: theme.text }]}>Giao diện</Text>
        <Text style={[styles.description, { color: theme.muted }]}>
          {dark ? "Chế độ tối" : "Chế độ sáng"}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
        onPress={toggleTheme}
        style={[styles.button, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}
      >
        <Ionicons
          name={dark ? "sunny-outline" : "moon-outline"}
          size={21}
          color={theme.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
  },
  description: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
});
