import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Image } from "expo-image";
import { TROHUB_ICONS, TroHubIconName } from "./icon-registry";
import { useAppTheme } from "../../../contexts/ThemeContext";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero" | number;

const SIZE_MAP: Record<string, number> = {
  xs: 22,
  sm: 30,
  md: 42,
  lg: 56,
  xl: 72,
  hero: 96,
};

interface TroHubIconProps {
  name: TroHubIconName;
  size?: IconSize;
  badge?: boolean;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function TroHubIcon({
  name,
  size = "md",
  badge = false,
  glow = false,
  style,
}: TroHubIconProps) {
  const { theme, resolvedTheme } = useAppTheme();
  const iconDef = TROHUB_ICONS[name] || TROHUB_ICONS.house;

  const dimension = typeof size === "number" ? size : SIZE_MAP[size] || 42;
  const radius = Math.round(dimension * 0.28);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.baseContainer,
    {
      width: dimension,
      height: dimension,
      borderRadius: radius,
    },
    badge && {
      backgroundColor: resolvedTheme === "dark" ? theme.surfaceElevated : theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      padding: Math.max(3, Math.round(dimension * 0.08)),
    },
    glow && {
      shadowColor: iconDef.accentColor,
      shadowOpacity: resolvedTheme === "dark" ? 0.35 : 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: Math.round(dimension * 0.2),
      elevation: 4,
    },
    style,
  ];

  return (
    <View style={containerStyle} accessibilityRole="image" accessibilityLabel={iconDef.label}>
      <Image
        source={iconDef.source}
        style={[
          styles.image,
          {
            width: "100%",
            height: "100%",
            borderRadius: Math.max(4, radius - (badge ? 3 : 0)),
          },
        ]}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
