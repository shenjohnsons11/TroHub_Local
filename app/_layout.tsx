import { Stack } from "expo-router";
import { NotificationProvider } from "../providers/NotificationProvider";
import { InboxNotificationProvider } from "../contexts/InboxNotificationContext";

export default function RootLayout() {
  return (
    <NotificationProvider>
      <InboxNotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </InboxNotificationProvider>
    </NotificationProvider>
  );
}
