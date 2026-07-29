import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "../contexts/ThemeContext";
import TroHubLogo from "./TroHubLogo";

export default function AppLoadingScreen({ message = "Đang tải dữ liệu không gian sống..." }: { message?: string }) {
  const { theme, themeMode } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TroHubLogo size="large" inverted={themeMode === "dark"} />
      <View style={[styles.frame, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.text }]}>
        <Image
          source={require("../assets/images/loading_illustration.png")}
          contentFit="cover"
          accessible={false}
          style={styles.artwork}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: themeMode === "dark" ? 0.24 : 0.06 }]} />
      </View>
      
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
      
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  frame: { width: "100%", maxWidth: 340, aspectRatio: 1.6, marginTop: 30, borderRadius: 22, borderWidth: 1, overflow: "hidden", shadowOpacity: 0.14, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 8 },
  artwork: { width: "100%", height: "100%" },
  spinnerContainer: { marginTop: 28, height: 36, justifyContent: "center", alignItems: "center" },
  message: { marginTop: 14, fontSize: 14, fontWeight: "600" },
});
