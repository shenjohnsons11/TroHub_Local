import { Stack } from "expo-router";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NotificationProvider } from "../providers/NotificationProvider";
import { LanguageProvider } from "../contexts/LanguageContext";
import { InboxNotificationProvider } from "../contexts/InboxNotificationContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NotificationProvider>
          <InboxNotificationProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
            </Stack>
          </InboxNotificationProvider>
        </NotificationProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
