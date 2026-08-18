import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage, type Language } from "../contexts/LanguageContext";

export default function LanguageToggle() {
  const { theme } = useAppTheme();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const options: { value: Language; label: string }[] = [{ value: "vi", label: "🇻🇳 VI" }, { value: "en", label: "🇬🇧 EN" }];
  return <View accessibilityRole="radiogroup" accessibilityLabel={t("common.language")} pointerEvents="auto" style={[styles.wrap, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>{options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: language === option.value }} onPress={() => void (language === option.value ? toggleLanguage() : setLanguage(option.value))} style={[styles.option, language === option.value && { backgroundColor: theme.primary }]}><AppText style={[styles.text, { color: language === option.value ? theme.background : theme.text }]}>{option.label}</AppText></Pressable>)}</View>;
}

const styles = StyleSheet.create({ wrap: { minHeight: 44, flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3, position: "relative", zIndex: 50, elevation: 50 }, option: { minWidth: 72, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 9, paddingHorizontal: 8 }, text: { fontSize: 11, fontWeight: "900" } });
