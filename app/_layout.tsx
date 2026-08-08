import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NotificationProvider } from "../providers/NotificationProvider";
import { LanguageProvider } from "../contexts/LanguageContext";
import { InboxNotificationProvider } from "../contexts/InboxNotificationContext";

// Giữ Splash Screen hiển thị cho đến khi font load xong
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter_400Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter_500Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter_600SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter_700Bold.ttf"),
    // Preload Ionicons.ttf trực tiếp từ local file — không tải qua HTTP
    ionicons: require("../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Font đã sẵn sàng (hoặc lỗi) — ẩn splash screen
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Chờ font load xong mới render app
  if (!fontsLoaded && !fontError) {
    return null;
  }

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
