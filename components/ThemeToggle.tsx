import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";

export default function ThemeToggle() {
  const { theme, themeMode, toggleTheme } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View>
        <AppText style={[styles.title, { color: theme.text }]}>{t("i18n.theme.title")}</AppText>
        <AppText style={[styles.description, { color: theme.muted }]}>
          {themeMode === "light"
            ? t("i18n.theme.light")
            : themeMode === "dark"
              ? t("i18n.theme.dark")
              : t("i18n.theme.system")}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          themeMode === "light"
            ? t("i18n.theme.toDark")
            : themeMode === "dark"
              ? t("i18n.theme.toSystem")
              : t("i18n.theme.toLight")
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
