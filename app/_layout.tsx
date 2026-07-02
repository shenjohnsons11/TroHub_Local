import { Stack } from "expo-router";
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <Toast />
    </>
  );
}