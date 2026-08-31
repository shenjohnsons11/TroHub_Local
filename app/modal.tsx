import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/typography";
import TroHubLogo from "../components/TroHubLogo";
import AppButton from "../components/ui/AppButton";
import { FONT_FAMILIES } from "../constants/theme";
import { useAppTheme } from "../contexts/ThemeContext";

export default function ModalScreen() {
  const { theme, themeMode } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.glow, { backgroundColor: theme.primarySoft }]} />
      <View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}
      >
        <TroHubLogo inverted={themeMode === "dark"} />
        <View style={[styles.iconTile, { backgroundColor: theme.primarySoft }]}>
          <AppText accessibilityElementsHidden style={[styles.key, { color: theme.primary }]}>
            TH
          </AppText>
        </View>
        <AppText style={[styles.title, { color: theme.text }]}>Không gian TroHub</AppText>
        <AppText style={[styles.message, { color: theme.muted }]}>
          Nội dung này chưa có thao tác riêng. Quay về trang chính để tiếp tục quản lý nhà trọ.
        </AppText>
        <Link href="/" dismissTo asChild>
          <AppButton icon="arrow-back">Về trang chính</AppButton>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: "hidden",
    padding: 24,
  },
  glow: {
    borderRadius: 260,
    height: 360,
    position: "absolute",
    right: -150,
    top: -120,
    width: 360,
  },
  sheet: {
    alignItems: "center",
    borderRadius: 24,
    maxWidth: 420,
    padding: 28,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    width: "100%",
    elevation: 8,
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 22,
    height: 76,
    justifyContent: "center",
    marginTop: 30,
    transform: [{ rotate: "-4deg" }],
    width: 76,
  },
  key: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 22,
    textAlign: "center",
  },
  message: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 26,
    marginTop: 10,
    textAlign: "center",
  },
});
