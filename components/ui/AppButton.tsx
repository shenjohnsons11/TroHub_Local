import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = Omit<PressableProps, "children"> & {
  children: string;
  variant?: Variant;
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
};

export default function AppButton({
  children,
  variant = "primary",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  accessibilityState,
  style,
  ...props
}: Props) {
  const { theme } = useAppTheme();
  const blocked = disabled || loading;
  const palette = {
    primary: { background: theme.primary, foreground: theme.background, border: theme.primary },
    secondary: { background: theme.surfaceElevated, foreground: theme.primary, border: theme.border },
    ghost: { background: "transparent", foreground: theme.primary, border: "transparent" },
    danger: { background: theme.danger, foreground: theme.dangerForeground, border: theme.danger },
  }[variant];
  const glyph = icon ? <Ionicons name={icon} size={19} color={palette.foreground} /> : null;

  return (
    <Pressable
      {...props}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: blocked || accessibilityState?.disabled,
        busy: loading || accessibilityState?.busy,
      }}
      style={(state) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          shadowColor: theme.text,
        },
        state.pressed && !blocked && styles.pressed,
        blocked && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <View style={styles.content}>
          {iconPosition === "left" ? glyph : null}
          <Text style={[styles.label, { color: palette.foreground }]}>{children}</Text>
          {iconPosition === "right" ? glyph : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 3,
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  pressed: { opacity: 0.88, transform: [{ translateY: 1 }, { scale: 0.985 }] },
  disabled: { opacity: 0.52, shadowOpacity: 0, elevation: 0 },
});
