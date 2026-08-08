import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import Toast, {
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";

import { FONT_FAMILIES } from "../../constants/theme";
import { useAppTheme } from "../../contexts/ThemeContext";
import { NotificationStatusAnimation } from "./NotificationStatusAnimation";

type Variant = "success" | "error" | "warning" | "info";

function ToastSurface({
  variant,
  text1,
  text2,
}: ToastConfigParams<Record<string, unknown>> & { variant: Variant }) {
  const { theme } = useAppTheme();
  const announcement = [text1, text2].filter(Boolean).join(". ");
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "ios" &&
      announcement &&
      announced.current !== announcement
    ) {
      announced.current = announcement;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [announcement]);

  return (
    <View
      accessibilityLabel={announcement}
      accessibilityLiveRegion={Platform.OS === "android" ? "polite" : "none"}
      style={[
        styles.container,
        { backgroundColor: theme.surfaceElevated, shadowColor: theme.text },
      ]}
    >
      {variant !== "info" ? (
        <NotificationStatusAnimation size={44} variant={variant} />
      ) : null}
      <View style={[styles.copy, variant === "info" && styles.infoCopy]}>
        {text1 ? (
          <AppText style={[styles.title, { color: theme.text }]}>{text1}</AppText>
        ) : null}
        {text2 ? (
          <AppText style={[styles.message, { color: theme.muted }]}>{text2}</AppText>
        ) : null}
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
        <Ionicons color={theme.muted} name="close" size={18} />
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
    alignItems: "center",
    borderRadius: 16,
    elevation: 4,
    flexDirection: "row",
    maxWidth: 420,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#20302A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: "92%",
  },
  copy: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 6,
  },
  infoCopy: {
    marginLeft: 0,
  },
  title: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  message: {
    fontFamily: FONT_FAMILIES.regular,
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
