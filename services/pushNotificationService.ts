import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

const preferenceKey = (accountId: string) => `TROHUB_PUSH_ENABLED:${accountId}`;

export async function isPushEnabled(accountId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(preferenceKey(accountId))) === "true";
}

export async function setPushEnabled(accountId: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(preferenceKey(accountId), String(enabled));
}

export async function getNotificationPermissionStatus() {
  return (await Notifications.getPermissionsAsync()).status;
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  return current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
}

export async function getExpoPushToken(requestPermission = false): Promise<string | null> {
  const status = requestPermission
    ? await requestNotificationPermission()
    : await getNotificationPermissionStatus();
  if (status !== "granted") return null;
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("TroHub chưa có Expo projectId để đăng ký thông báo.");
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function openNotificationSettings(): Promise<void> {
  return Linking.openSettings();
}

export function notificationPlatform(): "ios" | "android" {
  return Platform.OS === "ios" ? "ios" : "android";
}
