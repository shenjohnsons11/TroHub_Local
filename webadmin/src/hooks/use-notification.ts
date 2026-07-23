"use client";

import { useContext } from "react";

import { NotificationContext } from "@/contexts/notification-context";

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification phải được sử dụng bên trong NotificationProvider.",
    );
  }
  return context;
}
