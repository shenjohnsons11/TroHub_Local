"use client";

import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import Swal, { SweetAlertIcon, SweetAlertOptions } from "sweetalert2";

import { useTheme } from "@/components/theme-provider";
import {
  ConfirmOptions,
  NotificationContext,
  NotificationOptions,
} from "@/contexts/notification-context";

type Variant = "success" | "error" | "warning" | "info";
type ToastRequest = {
  message: string;
  options: NotificationOptions;
  variant: Variant;
};
type ConfirmRequest = {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
};
type LoadingRequest = {
  closed: boolean;
  id: number;
  kind: "loading";
  message: string;
  options: NotificationOptions;
};
type BlockingRequest = ConfirmRequest | LoadingRequest;

const DEFAULTS: Record<Variant, { duration: number; title: string }> = {
  success: { duration: 3500, title: "Thành công" },
  error: { duration: 5500, title: "Có lỗi xảy ra" },
  warning: { duration: 4500, title: "Cần kiểm tra" },
  info: { duration: 3500, title: "Thông tin" },
};

export function NotificationProvider({ children }: PropsWithChildren) {
  const { themeMode } = useTheme();
  const themeOptions = useMemo<SweetAlertOptions>(
    () => ({
      background: themeMode === "dark" ? "#10302A" : "#FFFCF7",
      color: themeMode === "dark" ? "#DDFBF0" : "#123A33",
      confirmButtonColor: themeMode === "dark" ? "#8CF2C9" : "#075E54",
      cancelButtonColor: themeMode === "dark" ? "#294740" : "#E8E2D8",
      customClass: {
        popup: "trohub-swal-popup",
        title: "trohub-swal-title",
        htmlContainer: "trohub-swal-copy",
        actions: "trohub-swal-actions",
        confirmButton: "trohub-swal-confirm",
        cancelButton: "trohub-swal-cancel",
      },
    }),
    [themeMode],
  );
  const toast = useMemo(
    () =>
      Swal.mixin({
        ...themeOptions,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timerProgressBar: true,
      }),
    [themeOptions],
  );

  const mountedRef = useRef(true);
  const toastRef = useRef(toast);
  const themeOptionsRef = useRef(themeOptions);
  const themeModeRef = useRef(themeMode);
  const toastQueueRef = useRef<ToastRequest[]>([]);
  const toastRunningRef = useRef(false);
  const toastInterruptedRef = useRef(false);
  const blockingQueueRef = useRef<BlockingRequest[]>([]);
  const activeBlockingRef = useRef<BlockingRequest | null>(null);
  const ownedPopupRef = useRef<HTMLElement | null>(null);
  const loadingIdRef = useRef(0);
  const flushToastsRef = useRef<() => void>(() => undefined);
  const runNextBlockingRef = useRef<() => void>(() => undefined);

  const flushToasts = useCallback(() => {
    if (
      !mountedRef.current ||
      activeBlockingRef.current ||
      blockingQueueRef.current.length ||
      toastRunningRef.current
    ) {
      return;
    }
    const request = toastQueueRef.current.shift();
    if (!request) return;
    toastRunningRef.current = true;
    toastInterruptedRef.current = false;
    void Promise.resolve(
      toastRef.current.fire({
        icon: request.variant as SweetAlertIcon,
        text: request.message,
        timer: request.options.duration || DEFAULTS[request.variant].duration,
        title: request.options.title || DEFAULTS[request.variant].title,
        didOpen: (popup) => {
          ownedPopupRef.current = popup;
          if (toastInterruptedRef.current) {
            if (Swal.getPopup() === popup) Swal.close();
          }
        },
      }),
    )
      .catch(() => undefined)
      .finally(() => {
        ownedPopupRef.current = null;
        toastRunningRef.current = false;
        toastInterruptedRef.current = false;
        if (!mountedRef.current) return;
        if (blockingQueueRef.current.length) {
          runNextBlockingRef.current();
        } else {
          flushToastsRef.current();
        }
      });
  }, []);

  const interruptToast = useCallback(() => {
    if (!toastRunningRef.current) return;
    toastInterruptedRef.current = true;
    const ownedPopup = ownedPopupRef.current;
    if (ownedPopup && Swal.getPopup() === ownedPopup) Swal.close();
  }, []);

  const runNextBlocking = useCallback(() => {
    if (activeBlockingRef.current) return;
    if (!mountedRef.current || toastRunningRef.current) return;
    const entry = blockingQueueRef.current.shift();
    if (!entry) {
      flushToasts();
      return;
    }
    if (entry.kind === "loading" && entry.closed) {
      runNextBlockingRef.current();
      return;
    }
    activeBlockingRef.current = entry;

    const finish = () => {
      if (activeBlockingRef.current !== entry) return;
      activeBlockingRef.current = null;
      ownedPopupRef.current = null;
      if (!mountedRef.current) return;
      runNextBlockingRef.current();
      flushToasts();
    };

    if (entry.kind === "confirm") {
      void Swal.fire({
        ...themeOptionsRef.current,
        allowEscapeKey: true,
        allowOutsideClick: true,
        cancelButtonText: entry.options.cancelText || "Hủy",
        confirmButtonColor: entry.options.destructive
          ? themeModeRef.current === "dark"
            ? "#FF836F"
            : "#B93A32"
          : themeOptionsRef.current.confirmButtonColor,
        confirmButtonText: entry.options.confirmText || "Xác nhận",
        didOpen: (popup) => {
          ownedPopupRef.current = popup;
        },
        focusCancel: entry.options.destructive,
        icon: "warning",
        reverseButtons: true,
        showCancelButton: true,
        text: entry.options.message,
        title: entry.options.title,
      })
        .then((result) => entry.resolve(result.isConfirmed))
        .catch(() => entry.resolve(false))
        .finally(finish);
      return;
    }

    void Promise.resolve(
      Swal.fire({
        ...themeOptionsRef.current,
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: (popup) => {
          ownedPopupRef.current = popup;
          if (entry.closed || !mountedRef.current) {
            if (Swal.getPopup() === popup) Swal.close();
            return;
          }
          Swal.showLoading();
        },
        showConfirmButton: false,
        text: entry.message,
        title: entry.options.title || "Đang xử lý",
      }),
    )
      .catch(() => undefined)
      .finally(finish);
  }, [flushToasts]);
  useEffect(() => {
    toastRef.current = toast;
    themeOptionsRef.current = themeOptions;
    themeModeRef.current = themeMode;
  }, [themeMode, themeOptions, toast]);

  useEffect(() => {
    flushToastsRef.current = flushToasts;
    runNextBlockingRef.current = runNextBlocking;
  }, [flushToasts, runNextBlocking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      toastQueueRef.current = [];
      const active = activeBlockingRef.current;
      if (active?.kind === "confirm") active.resolve(false);
      for (const queued of blockingQueueRef.current) {
        if (queued.kind === "confirm") queued.resolve(false);
      }
      blockingQueueRef.current = [];
      activeBlockingRef.current = null;
      const ownedPopup = ownedPopupRef.current;
      if (ownedPopup && Swal.getPopup() === ownedPopup) Swal.close();
      ownedPopupRef.current = null;
    };
  }, []);

  const show = useCallback(
    (
      variant: Variant,
      message: string,
      options: NotificationOptions = {},
    ) => {
      if (!mountedRef.current) return;
      toastQueueRef.current.push({ message, options, variant });
      flushToasts();
    },
    [flushToasts],
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
    if (!mountedRef.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      blockingQueueRef.current.push({ kind: "confirm", options, resolve });
      interruptToast();
      runNextBlocking();
    });
  }, [interruptToast, runNextBlocking]);

  const loading = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const entry: LoadingRequest = {
        closed: false,
        id: ++loadingIdRef.current,
        kind: "loading",
        message,
        options,
      };
      if (mountedRef.current) {
        blockingQueueRef.current.push(entry);
        interruptToast();
        runNextBlocking();
      }
      return () => {
        if (entry.closed) return;
        entry.closed = true;
        const active = activeBlockingRef.current;
        if (active === entry) {
          const ownedPopup = ownedPopupRef.current;
          if (ownedPopup && Swal.getPopup() === ownedPopup) Swal.close();
        } else {
          blockingQueueRef.current = blockingQueueRef.current.filter(
            (queued) => queued !== entry,
          );
          runNextBlocking();
        }
      };
    },
    [interruptToast, runNextBlocking],
  );

  const value = useMemo(
    () => ({ success, error, warning, info, loading, confirm }),
    [success, error, warning, info, loading, confirm],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
