import { Stack } from "expo-router";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NotificationProvider } from "../providers/NotificationProvider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </NotificationProvider>
    </ThemeProvider>
  );
}
