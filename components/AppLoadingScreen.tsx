import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "../contexts/ThemeContext";
import TroHubLogo from "./TroHubLogo";

export default function AppLoadingScreen({ message = "Đang tải dữ liệu không gian sống..." }: { message?: string }) {
  const { theme, themeMode } = useAppTheme();
  const skeleton = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(skeleton, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(skeleton, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        ]),
      );
      animation.start();
    });
    return () => animation?.stop();
  }, [skeleton]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <TroHubLogo size="large" inverted={themeMode === "dark"} />
      <Animated.View
        style={[
          styles.frame,
          styles.skeleton,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.text,
            opacity: skeleton,
          },
        ]}
      >
        <Image
          source={require("../assets/images/trohub-property-loading.png")}
          contentFit="cover"
          accessible={false}
          style={styles.artwork}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: themeMode === "dark" ? 0.24 : 0.06 }]} />
      </Animated.View>
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  frame: {
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1.6,
    marginTop: 30,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  skeleton: {},
  artwork: { width: "100%", height: "100%" },
  message: { marginTop: 20, fontSize: 14, fontWeight: "600" },
});
