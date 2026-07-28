import { PropsWithChildren, useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleProp, ViewStyle } from "react-native";

type Props = PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>;

export default function AnimatedEntry({ children, delay = 0, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const initialDelay = useRef(delay).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      if (reduced) {
        progress.setValue(1);
        return;
      }
      animation = Animated.timing(progress, {
        delay: initialDelay,
        duration: 280,
        toValue: 1,
        useNativeDriver: true,
      });
      animation.start();
    });

    return () => {
      active = false;
      if (animation) animation.stop();
    };
  }, [initialDelay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
