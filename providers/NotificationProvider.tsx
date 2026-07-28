import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { NotificationStatusAnimation } from "../components/notifications/NotificationStatusAnimation";
import { notificationToastConfig } from "../components/notifications/NotificationToast";
import AppButton from "../components/ui/AppButton";
import {
  ConfirmOptions,
  NotificationContext,
  NotificationOptions,
} from "../contexts/NotificationContext";
import { FONT_FAMILIES } from "../constants/theme";
import { useAppTheme } from "../contexts/ThemeContext";

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
  const { theme } = useAppTheme();
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(
    null,
  );
  const [loadingStack, setLoadingStack] = useState<{
    id: number;
    message: string;
    title: string;
  }[]>([]);
  const confirmResolver = useRef<((confirmed: boolean) => void) | null>(null);
  const loadingToken = useRef(0);
  const mountedRef = useRef(true);
  const confirmDialogRef = useRef<Text>(null);
  const loadingDialogRef = useRef<Text>(null);
  const loadingState = loadingStack[loadingStack.length - 1];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      confirmResolver.current?.(false);
      confirmResolver.current = null;
      Toast.hide();
    };
  }, []);

  useEffect(() => {
    const target = confirmOptions
      ? confirmDialogRef.current
      : loadingState
        ? loadingDialogRef.current
        : null;
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const handle = findNodeHandle(target);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    });
    return () => cancelAnimationFrame(frame);
  }, [confirmOptions, loadingState]);

  const show = useCallback(
    (
      variant: Variant,
      message: string,
      options: NotificationOptions = {},
    ) => {
      if (!mountedRef.current) return;
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
  const loading = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      if (!mountedRef.current) return () => undefined;
      const id = ++loadingToken.current;
      let closed = false;
      setLoadingStack((current) => [...current, {
        id,
        message,
        title: options.title || "Đang xử lý",
      }]);
      return () => {
        if (closed) return;
        closed = true;
        if (!mountedRef.current) return;
        setLoadingStack((current) =>
          current.filter((entry) => entry.id !== id),
        );
      };
    },
    [],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    if (!mountedRef.current) return Promise.resolve(false);
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
    () => ({ success, error, warning, info, loading, confirm }),
    [success, error, warning, info, loading, confirm],
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
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              { backgroundColor: theme.surfaceElevated },
            ]}
          >
            <NotificationStatusAnimation size={72} variant="warning" />
            <Text
              ref={confirmDialogRef}
              accessible
              accessibilityLabel={`${confirmOptions?.title || ""}. ${confirmOptions?.message || ""}`}
              accessibilityRole="header"
              style={[styles.dialogTitle, { color: theme.text }]}
            >
              {confirmOptions?.title}
            </Text>
            <Text style={[styles.dialogMessage, { color: theme.muted }]}>
              {confirmOptions?.message}
            </Text>
            <View style={styles.actions}>
              <View style={styles.action}>
                <AppButton
                  icon="close"
                  onPress={() => resolveConfirm(false)}
                  variant="secondary"
                >
                  {confirmOptions?.cancelText || "Hủy"}
                </AppButton>
              </View>
              <View style={styles.action}>
                <AppButton
                  icon={confirmOptions?.destructive ? "trash-outline" : "checkmark"}
                  onPress={() => resolveConfirm(true)}
                  variant={confirmOptions?.destructive ? "danger" : "primary"}
                >
                  {confirmOptions?.confirmText || "Xác nhận"}
                </AppButton>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => undefined}
        transparent
        visible={Boolean(loadingState)}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View
            accessibilityViewIsModal
            style={[styles.loadingDialog, { backgroundColor: theme.surfaceElevated }]}
          >
            <ActivityIndicator color={theme.primary} size="large" />
            <Text
              ref={loadingDialogRef}
              accessible
              accessibilityLabel={`${loadingState?.title || ""}. ${loadingState?.message || ""}`}
              accessibilityRole="header"
              accessibilityState={{ busy: true }}
              style={[styles.loadingTitle, { color: theme.text }]}
            >
              {loadingState?.title}
            </Text>
            <Text style={[styles.loadingMessage, { color: theme.muted }]}>
              {loadingState?.message}
            </Text>
          </View>
        </View>
      </Modal>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    alignItems: "center",
    borderRadius: 24,
    maxWidth: 420,
    padding: 20,
    width: "100%",
  },
  dialogTitle: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
    marginTop: 8,
    textAlign: "center",
  },
  dialogMessage: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 22,
    width: "100%",
  },
  action: {
    flex: 1,
  },
  loadingDialog: {
    alignItems: "center",
    borderRadius: 24,
    maxWidth: 340,
    padding: 28,
    width: "100%",
  },
  loadingTitle: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  loadingMessage: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
});
