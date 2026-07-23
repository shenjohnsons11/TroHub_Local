import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, useColorScheme, View } from "react-native";
import { TROHUB_THEMES } from "../constants/theme";
import TroHubLogo from "./TroHubLogo";

export default function AppLoadingScreen({ message = "Đang chuẩn bị không gian của bạn" }: { message?: string }) {
  const scheme = useColorScheme();
  const theme = TROHUB_THEMES[scheme === "dark" ? "dark" : "light"];
  const progress = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 0.82, duration: 900, useNativeDriver: false }),
          Animated.timing(progress, { toValue: 0.28, duration: 550, useNativeDriver: false }),
        ])
      );
      animation.start();
    });
    return () => animation?.stop();
  }, [progress]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TroHubLogo size="large" inverted={scheme === "dark"} />
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  track: { width: 168, height: 4, borderRadius: 4, overflow: "hidden", marginTop: 34 },
  fill: { height: "100%", borderRadius: 4, backgroundColor: "#EF6A22" },
  message: { marginTop: 14, fontSize: 13, fontWeight: "600" },
});
