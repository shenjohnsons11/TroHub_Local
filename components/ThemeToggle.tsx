import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, themeMode, toggleTheme } = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View>
        <AppText style={[styles.title, { color: theme.text }]}>Giao diện</AppText>
        <AppText style={[styles.description, { color: theme.muted }]}>
          {themeMode === "light"
            ? "Chế độ sáng"
            : themeMode === "dark"
              ? "Chế độ tối"
              : "Giao diện tự động"}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          themeMode === "light"
            ? "Chuyển sang chế độ tối"
            : themeMode === "dark"
              ? "Chuyển sang chế độ tự động"
              : "Chuyển sang chế độ sáng"
        }
        onPress={toggleTheme}
        style={[styles.button, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}
      >
        <Ionicons
          name={
            themeMode === "light"
              ? "sunny-outline"
              : themeMode === "dark"
                ? "moon-outline"
                : "contrast-outline"
          }
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
