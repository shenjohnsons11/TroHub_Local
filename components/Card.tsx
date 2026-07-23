import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp, useColorScheme } from "react-native";
import { SIZES, TROHUB_THEMES } from "../constants/theme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: Props) {
  const theme = TROHUB_THEMES[useColorScheme() === "dark" ? "dark" : "light"];
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#25292D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
});
