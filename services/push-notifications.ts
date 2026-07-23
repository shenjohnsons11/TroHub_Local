import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { notificationApi } from "./notification-api";

const DEVICE_ID_KEY = "TROHUB_PUSH_DEVICE_ID";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getDeviceId() {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;
  const created = `trohub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function registerDeviceForPush() {
  if (Platform.OS === "web" || !Device.isDevice) return { status: "unsupported" as const };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo TroHub",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === "granted"
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return { status: "denied" as const };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    || Constants.easConfig?.projectId
    || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return { status: "missing-project-id" as const };
  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationApi.registerDevice({
    expoPushToken,
    platform: Platform.OS as "android" | "ios",
    deviceId: await getDeviceId(),
  });
  return { status: "registered" as const };
}

export function listenForNotificationResponses(
  onResponse: (data: Record<string, unknown>) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse(response.notification.request.content.data);
  });
  return () => subscription.remove();
}
