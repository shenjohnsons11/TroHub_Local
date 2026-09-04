import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowColor: "#000",
    elevation: 3,
  },
});

