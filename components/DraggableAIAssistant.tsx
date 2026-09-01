import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AppText } from "./ui/typography";
import BotIcon from "./BotIcon";

type Props = {
  visible?: boolean;
  onPress: () => void;
};

const PILL_WIDTH = 138;
const PILL_HEIGHT = 42;
const EDGE_MARGIN = 14;
const MIN_Y = Platform.OS === "ios" ? 70 : 50;
const BOTTOM_NAV_OFFSET = Platform.OS === "ios" ? 165 : 145;

export default function DraggableAIAssistant({ visible = true, onPress }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxDimWidth = Math.min(screenWidth, 430);
  const maxY = screenHeight - PILL_HEIGHT - BOTTOM_NAV_OFFSET;

  // Initial position: Bottom right safely above the bottom nav bar
  const initialX = maxDimWidth - PILL_WIDTH - EDGE_MARGIN;
  const initialY = maxY - 10;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAuraAnim = useRef(new Animated.Value(1)).current;
  const dotPingAnim = useRef(new Animated.Value(1)).current;
  const botRotateAnim = useRef(new Animated.Value(0)).current;
  const currentPos = useRef({ x: initialX, y: initialY });

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => pan.removeListener(listenerId);
  }, [pan]);

  // Subtle breathing aura and radar ping animation (matching web)
  useEffect(() => {
    // 1. Radar Ping Dot Animation
    const pingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPingAnim, {
          toValue: 2.2,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(dotPingAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Subtle Aura Pulse Animation
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAuraAnim, {
          toValue: 1.08,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAuraAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Robot Tilt Wiggle Animation
    const botWiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(botRotateAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(botRotateAnim, {
          toValue: -1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(botRotateAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(3500),
      ])
    );

    pingLoop.start();
    auraLoop.start();
    botWiggleLoop.start();

    return () => {
      pingLoop.stop();
      auraLoop.stop();
      botWiggleLoop.stop();
    };
  }, [dotPingAnim, pulseAuraAnim, botRotateAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          useNativeDriver: true,
          friction: 5,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }).start();

        // Check if tap (not drag)
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
          return;
        }

        // Snap to nearest horizontal edge
        const curX = currentPos.current.x;
        const curY = currentPos.current.y;

        const targetX =
          curX + PILL_WIDTH / 2 < maxDimWidth / 2
            ? EDGE_MARGIN
            : maxDimWidth - PILL_WIDTH - EDGE_MARGIN;

        const targetY = Math.max(MIN_Y, Math.min(curY, maxY));

        void Haptics.selectionAsync();

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          friction: 6,
          tension: 42,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  if (!visible) return null;

  const botRotate = botRotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-12deg", "0deg", "14deg"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Outer Pulse Glow Aura */}
      <Animated.View
        style={[
          styles.pulseAura,
          {
            transform: [{ scale: pulseAuraAnim }],
            opacity: pulseAuraAnim.interpolate({
              inputRange: [1, 1.08],
              outputRange: [0.35, 0],
            }),
          },
        ]}
      />

      {/* Main Gradient Pill Button */}
      <Animated.View
        style={[
          styles.pillWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={["#059669", "#0D9488"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientPill}
        >
          {/* Robot Icon Container with Live Radar Ping Dot */}
          <View style={styles.iconContainer}>
            <Animated.View style={{ transform: [{ rotate: botRotate }] }}>
              <BotIcon size={22} color="#D1FAE5" />
            </Animated.View>

            {/* Ping Ring Radar (animate-ping) */}
            <Animated.View
              style={[
                styles.pingRing,
                {
                  transform: [{ scale: dotPingAnim }],
                  opacity: dotPingAnim.interpolate({
                    inputRange: [1, 2.2],
                    outputRange: [0.85, 0],
                  }),
                },
              ]}
            />
            {/* Solid Center Dot */}
            <View style={styles.solidDot} />
          </View>

          {/* Label */}
          <AppText style={styles.labelText}>TroHub AI 🤖</AppText>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    zIndex: 9999,
    elevation: 12,
  },
  pulseAura: {
    position: "absolute",
    width: PILL_WIDTH + 14,
    height: PILL_HEIGHT + 14,
    borderRadius: (PILL_HEIGHT + 14) / 2,
    backgroundColor: "rgba(5, 150, 105, 0.45)",
    top: -7,
    left: -7,
  },
  pillWrapper: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    overflow: "hidden",
    shadowColor: "#047857",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 10,
  },
  gradientPill: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1.2,
    borderColor: "rgba(110, 231, 183, 0.45)",
  },
  iconContainer: {
    position: "relative",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pingRing: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#6EE7B7",
  },
  solidDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#34D399",
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
