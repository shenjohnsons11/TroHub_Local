import { useContext } from "react";
import { InboxNotificationContext } from "../contexts/InboxNotificationContext";

export function useInboxNotifications() {
  const value = useContext(InboxNotificationContext);
  if (!value) throw new Error("useInboxNotifications phải nằm trong InboxNotificationProvider.");
  return value;
}
