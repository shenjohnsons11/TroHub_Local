import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Image } from "expo-image";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";
import TroHubLogo from "./TroHubLogo";

export default function AppLoadingScreen({ message }: { message?: string }) {
  const { theme, themeMode } = useAppTheme();
  const { t } = useTranslation();
  const displayMessage = message || t("i18n.loading.propertyData");
  const pulse = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let pulseAnim: Animated.CompositeAnimation | undefined;
    let spinAnim: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.98, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      spinAnim = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      pulseAnim.start();
      spinAnim.start();
    });

    return () => {
      pulseAnim?.stop();
      spinAnim?.stop();
    };
  }, [pulse, spin]);

  const spinRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={displayMessage}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <TroHubLogo size="large" inverted={themeMode === "dark"} />

      <View style={styles.houseCenterWrapper}>
        <Animated.View
          style={[
            styles.spinnerRing,
            {
              borderColor: themeMode === "dark" ? "rgba(184, 245, 218, 0.15)" : "rgba(15, 82, 71, 0.12)",
              borderTopColor: themeMode === "dark" ? "#b8f5da" : "#0f5247",
              transform: [{ rotate: spinRotation }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.frame,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              shadowColor: themeMode === "dark" ? "#b8f5da" : "#0f5247",
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <Image
            source={require("../assets/images/loading_cozy_house.jpg")}
            contentFit="cover"
            accessible={false}
            style={styles.artwork}
          />
        </Animated.View>
      </View>

      <AppText style={[styles.message, { color: theme.muted }]}>{displayMessage}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  houseCenterWrapper: {
    width: 220,
    height: 220,
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  spinnerRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2.5,
  },
  frame: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  artwork: { width: "100%", height: "100%" },
  message: { marginTop: 24, fontSize: 14, fontWeight: "600", letterSpacing: 0.2 },
});
