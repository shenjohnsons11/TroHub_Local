import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/typography";

type AppSplashScreenProps = {
  visible?: boolean;
};

export default function AppSplashScreen({ visible = true }: AppSplashScreenProps) {
  const [rendered, setRendered] = useState(visible);
  const [logoReady, setLogoReady] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let pulse: Animated.CompositeAnimation | undefined;
    let spinner: Animated.CompositeAnimation | undefined;
    let fade: Animated.CompositeAnimation | undefined;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;

      if (!visible) {
        if (!logoReady) return;

        if (reduceMotion) {
          setRendered(false);
          return;
        }

        fade = Animated.timing(opacity, {
          toValue: 0,
          duration: 460,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        });
        fade.start(({ finished }) => {
          if (finished && active) setRendered(false);
        });
        return;
      }

      setRendered(true);
      opacity.setValue(1);
      if (reduceMotion) return;

      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.035,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      spinner = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      pulse.start();
      spinner.start();
    });

    return () => {
      active = false;
      pulse?.stop();
      spinner?.stop();
      fade?.stop();
    };
  }, [logoReady, logoScale, opacity, spin, visible]);

  if (!rendered) return null;

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      accessibilityLabel="TroHub đang khởi động"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityValue={{ text: "Đang tải dữ liệu ứng dụng" }}
      style={[styles.screen, { opacity }]}
    >
      <LinearGradient
        colors={["#04100e", "#073e36", "#04100e"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.ambient} />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
        <Image
          accessible={false}
          fadeDuration={0}
          onError={() => setLogoReady(true)}
          onLoad={() => setLogoReady(true)}
          resizeMode="cover"
          source={require("../assets/images/loading_cozy_house.jpg")}
          style={styles.logo}
        />
      </Animated.View>
      <Animated.View
        accessible={false}
        style={[styles.progressRing, { transform: [{ rotate: rotation }] }]}
      />
      <AppText style={styles.tagline}>
        TroHub - Hệ Sinh Thái Quản Lý Nhà Trọ Thông Minh
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 28,
  },
  ambient: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(184, 245, 218, 0.08)",
  },
  logoWrap: {
    width: 212,
    height: 212,
    borderRadius: 28,
    shadowColor: "#b8f5da",
    shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 14,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  progressRing: {
    width: 32,
    height: 32,
    marginTop: 28,
    borderWidth: 2,
    borderRadius: 16,
    borderColor: "rgba(184, 245, 218, 0.18)",
    borderRightColor: "#b8f5da",
    borderTopColor: "#b8f5da",
  },
  tagline: {
    maxWidth: 340,
    marginTop: 20,
    color: "#dff8ec",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
  },
});
