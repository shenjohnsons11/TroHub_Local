import React from "react";
import NotificationsScreen, { NotificationScreenProps } from "./NotificationsScreen";

export default function AdminNotificationsScreen(props: Omit<NotificationScreenProps, "mode">) {
  return <NotificationsScreen {...props} mode="landlord" />;
}
