import { Stack } from "expo-router";
import { NotificationProvider } from "../providers/NotificationProvider";

export default function RootLayout() {
  return (
    <NotificationProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </NotificationProvider>
  );
}
