import React from "react";
import { StyleSheet, View, Image } from "react-native";
import { AppText } from "@/components/ui/typography";

import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  compact?: boolean;
  inverted?: boolean;
  size?: "small" | "medium" | "large";
};

export default function TroHubLogo({ compact = false, inverted = false, size = "medium" }: Props) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const scale = size === "small" ? 0.78 : size === "large" ? 1.35 : 1;
  const imageSize = 38 * scale;
  
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="TRO HUB"
      style={styles.row}
    >
      <View style={styles.mark}> 
        <Image 
          source={isDark ? require("../assets/images/logo_dark_theme.png") : require("../assets/images/logo_3d_glass.png")} 
          style={{ width: imageSize, height: imageSize }} 
          resizeMode="contain" 
        />
      </View>
      {!compact && (
        <View style={styles.wordmark}>
          <AppText style={[styles.name, (inverted || isDark) && styles.inverted]}>TRO HUB</AppText>
          <AppText style={[styles.tagline, (inverted || isDark) && styles.taglineInverted]}>QUẢN LÝ NHÀ TRỌ</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13 },
  mark: { justifyContent: "center", alignItems: "center" },
  wordmark: { gap: 2 },
  name: { color: "#20302A", fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  inverted: { color: "#F4F5F3" },
  tagline: { color: "#697178", fontSize: 8, fontWeight: "800", letterSpacing: 1.4 },
  taglineInverted: { color: "#B6BCC0" },
});
