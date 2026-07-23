import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast, {
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";

import { FONT_FAMILIES } from "../../constants/theme";

type Variant = "success" | "error" | "warning" | "info";

const PALETTE = {
  success: { accent: "#17834A", surface: "#EFF8F3", icon: "checkmark-circle" },
  error: { accent: "#C83F49", surface: "#FFF1F2", icon: "close-circle" },
  warning: { accent: "#A85E00", surface: "#FFF7E8", icon: "warning" },
  info: { accent: "#2166A5", surface: "#EFF6FC", icon: "information-circle" },
} as const;

function ToastSurface({
  variant,
  text1,
  text2,
}: ToastConfigParams<Record<string, unknown>> & { variant: Variant }) {
  const colors = PALETTE[variant];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.accent },
      ]}
    >
      <Ionicons
        color={colors.accent}
        name={colors.icon}
        size={22}
        style={styles.icon}
      />
      <View style={styles.copy}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
      <Pressable
        accessibilityLabel="Đóng thông báo"
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => Toast.hide()}
        style={({ pressed }) => [
          styles.close,
          pressed && styles.closePressed,
        ]}
      >
        <Ionicons color="#697178" name="close" size={18} />
      </Pressable>
    </View>
  );
}

export const notificationToastConfig: ToastConfig = {
  success: (params) => <ToastSurface {...params} variant="success" />,
  error: (params) => <ToastSurface {...params} variant="error" />,
  warning: (params) => <ToastSurface {...params} variant="warning" />,
  info: (params) => <ToastSurface {...params} variant="info" />,
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    flexDirection: "row",
    maxWidth: 420,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#25292D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: "92%",
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  copy: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    color: "#25292D",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  message: {
    color: "#4F575E",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  close: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  closePressed: {
    backgroundColor: "rgba(37, 41, 45, 0.08)",
    transform: [{ scale: 0.96 }],
  },
});
