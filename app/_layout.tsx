import { Stack } from "expo-router";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NotificationProvider } from "../providers/NotificationProvider";
import { LanguageProvider } from "../contexts/LanguageContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
          </Stack>
        </NotificationProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
