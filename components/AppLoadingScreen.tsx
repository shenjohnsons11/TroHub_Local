import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "../contexts/ThemeContext";
import TroHubLogo from "./TroHubLogo";

export default function AppLoadingScreen({ message = "Đang chuẩn bị không gian của bạn" }: { message?: string }) {
  const { theme, themeMode } = useAppTheme();
  const progress = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || !active) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 0.82, duration: 900, useNativeDriver: false }),
          Animated.timing(progress, { toValue: 0.28, duration: 550, useNativeDriver: false }),
        ])
      );
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [progress]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TroHubLogo size="large" inverted={themeMode === "dark"} />
      <View style={[styles.frame, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.text }]}>
        <Image
          source={require("../assets/images/trohub-property-loading.png")}
          contentFit="cover"
          accessible={false}
          style={styles.artwork}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: themeMode === "dark" ? 0.24 : 0.06 }]} />
        <View style={styles.skeleton}>
          <View style={[styles.skeletonWide, { backgroundColor: theme.surfaceElevated }]} />
          <View style={[styles.skeletonShort, { backgroundColor: theme.surfaceElevated }]} />
        </View>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={message}
        style={[styles.track, { backgroundColor: theme.border }]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: theme.primary,
              width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  frame: { width: "100%", maxWidth: 340, aspectRatio: 1.6, marginTop: 30, borderRadius: 22, borderWidth: 1, overflow: "hidden", shadowOpacity: 0.14, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 8 },
  artwork: { width: "100%", height: "100%" },
  skeleton: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 7 },
  skeletonWide: { width: "68%", height: 9, borderRadius: 5, opacity: 0.86 },
  skeletonShort: { width: "42%", height: 7, borderRadius: 4, opacity: 0.68 },
  track: { width: 168, height: 5, borderRadius: 5, overflow: "hidden", marginTop: 28 },
  fill: { height: "100%", borderRadius: 5 },
  message: { marginTop: 14, fontSize: 13, fontWeight: "600" },
});
