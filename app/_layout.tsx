import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NotificationProvider } from "../providers/NotificationProvider";
import { LanguageProvider } from "../contexts/LanguageContext";
import { InboxNotificationProvider } from "../contexts/InboxNotificationContext";

// Keep the native splash visible until the first branded React frame is ready.
void SplashScreen.preventAutoHideAsync();

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
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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
