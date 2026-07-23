import { createContext } from "react";

export type NotificationOptions = {
  title?: string;
  duration?: number;
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type NotificationApi = {
  success: (message: string, options?: NotificationOptions) => void;
  error: (message: string, options?: NotificationOptions) => void;
  warning: (message: string, options?: NotificationOptions) => void;
  info: (message: string, options?: NotificationOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const NotificationContext = createContext<NotificationApi | null>(null);
