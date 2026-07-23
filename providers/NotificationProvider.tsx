import React, {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { notificationToastConfig } from "../components/notifications/NotificationToast";
import {
  ConfirmOptions,
  NotificationContext,
  NotificationOptions,
} from "../contexts/NotificationContext";
import { FONT_FAMILIES, TROHUB_THEMES } from "../constants/theme";

type Variant = "success" | "error" | "warning" | "info";

const DEFAULT_TITLES: Record<Variant, string> = {
  success: "Thành công",
  error: "Có lỗi xảy ra",
  warning: "Cần kiểm tra",
  info: "Thông tin",
};

const DEFAULT_DURATIONS: Record<Variant, number> = {
  success: 3500,
  error: 5500,
  warning: 4500,
  info: 3500,
};

export function NotificationProvider({ children }: PropsWithChildren) {
  const theme =
    TROHUB_THEMES[useColorScheme() === "dark" ? "dark" : "light"];
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(
    null,
  );
  const confirmResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const show = useCallback(
    (
      variant: Variant,
      message: string,
      options: NotificationOptions = {},
    ) => {
      Toast.show({
        type: variant,
        text1: options.title || DEFAULT_TITLES[variant],
        text2: message,
        visibilityTime: options.duration || DEFAULT_DURATIONS[variant],
        position: "top",
        topOffset: 54,
      });
    },
    [],
  );

  const success = useCallback(
    (message: string, options?: NotificationOptions) =>
      show("success", message, options),
    [show],
  );
  const error = useCallback(
    (message: string, options?: NotificationOptions) =>
      show("error", message, options),
    [show],
  );
  const warning = useCallback(
    (message: string, options?: NotificationOptions) =>
      show("warning", message, options),
    [show],
  );
  const info = useCallback(
    (message: string, options?: NotificationOptions) =>
      show("info", message, options),
    [show],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    if (confirmResolver.current) {
      confirmResolver.current(false);
    }
    setConfirmOptions(options);
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const resolveConfirm = useCallback((confirmed: boolean) => {
    confirmResolver.current?.(confirmed);
    confirmResolver.current = null;
    setConfirmOptions(null);
  }, []);

  const value = useMemo(
    () => ({ success, error, warning, info, confirm }),
    [success, error, warning, info, confirm],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toast config={notificationToastConfig} />
      <Modal
        animationType="fade"
        onRequestClose={() => resolveConfirm(false)}
        transparent
        visible={Boolean(confirmOptions)}
      >
        <View style={styles.overlay}>
          <View
            accessibilityRole="alert"
            style={[
              styles.dialog,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: theme.text }]}>
              {confirmOptions?.title}
            </Text>
            <Text style={[styles.dialogMessage, { color: theme.muted }]}>
              {confirmOptions?.message}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => resolveConfirm(false)}
                style={({ pressed }) => [
                  styles.button,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.cancelText, { color: theme.text }]}>
                  {confirmOptions?.cancelText || "Hủy"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => resolveConfirm(true)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: confirmOptions?.destructive
                      ? theme.danger
                      : theme.primary,
                    borderColor: "transparent",
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmText}>
                  {confirmOptions?.confirmText || "Xác nhận"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(24, 28, 31, 0.52)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: "100%",
  },
  dialogTitle: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  dialogMessage: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 22,
  },
  button: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 16,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "800",
  },
  confirmText: {
    color: "#FFFFFF",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "800",
  },
});
