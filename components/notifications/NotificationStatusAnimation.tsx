import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";

type Variant = "success" | "error" | "warning";

const SOURCES = {
  success: require("../../assets/lottie/success.json"),
  error: require("../../assets/lottie/error.json"),
  warning: require("../../assets/lottie/warning.json"),
};

export function NotificationStatusAnimation({
  variant,
  size = 56,
}: {
  variant: Variant;
  size?: number;
}) {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (mounted) setReduceMotion(enabled);
      },
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <LottieView
      autoPlay={!reduceMotion}
      loop={false}
      progress={reduceMotion ? 1 : undefined}
      source={SOURCES[variant]}
      style={[styles.animation, { height: size, width: size }]}
    />
  );
}

const styles = StyleSheet.create({
  animation: {
    flexShrink: 0,
  },
});
