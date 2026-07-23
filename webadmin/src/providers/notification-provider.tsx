"use client";

import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";

import {
  ConfirmOptions,
  NotificationContext,
  NotificationOptions,
} from "@/contexts/notification-context";

const DEFAULT_DURATIONS = {
  success: 3500,
  error: 5500,
  warning: 4500,
  info: 3500,
} as const;

export function NotificationProvider({ children }: PropsWithChildren) {
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(
    null,
  );
  const confirmResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const success = useCallback(
    (message: string, options: NotificationOptions = {}) =>
      toast.success(options.title || "Thành công", {
        description: message,
        duration: options.duration || DEFAULT_DURATIONS.success,
      }),
    [],
  );
  const error = useCallback(
    (message: string, options: NotificationOptions = {}) =>
      toast.error(options.title || "Có lỗi xảy ra", {
        description: message,
        duration: options.duration || DEFAULT_DURATIONS.error,
      }),
    [],
  );
  const warning = useCallback(
    (message: string, options: NotificationOptions = {}) =>
      toast.warning(options.title || "Cần kiểm tra", {
        description: message,
        duration: options.duration || DEFAULT_DURATIONS.warning,
      }),
    [],
  );
  const info = useCallback(
    (message: string, options: NotificationOptions = {}) =>
      toast.info(options.title || "Thông tin", {
        description: message,
        duration: options.duration || DEFAULT_DURATIONS.info,
      }),
    [],
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
      <Toaster
        closeButton
        expand={false}
        gap={10}
        position="top-right"
        richColors
        toastOptions={{ className: "trohub-toast" }}
        visibleToasts={4}
      />
      {confirmOptions ? (
        <div
          aria-labelledby="notification-confirm-title"
          aria-modal="true"
          className="notification-confirm-overlay"
          role="alertdialog"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) resolveConfirm(false);
          }}
        >
          <div className="notification-confirm-dialog">
            <h2 id="notification-confirm-title">{confirmOptions.title}</h2>
            <p>{confirmOptions.message}</p>
            <div className="notification-confirm-actions">
              <button
                className="notification-confirm-cancel"
                onClick={() => resolveConfirm(false)}
                type="button"
              >
                {confirmOptions.cancelText || "Hủy"}
              </button>
              <button
                className={
                  confirmOptions.destructive
                    ? "notification-confirm-danger"
                    : "notification-confirm-primary"
                }
                onClick={() => resolveConfirm(true)}
                type="button"
              >
                {confirmOptions.confirmText || "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}
