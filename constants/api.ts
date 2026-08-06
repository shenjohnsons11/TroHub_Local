import { Platform } from "react-native";
import Constants from "expo-constants";

const getLocalHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return ip;
    }
  }
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
};

const localHostIp = getLocalHostIp();
const LOCAL_API_URL = localHostIp === "10.0.2.2"
  ? "http://10.0.2.2:5000/api"
  : localHostIp === "localhost"
    ? "http://localhost:5000/api"
    : `http://${localHostIp}:5000/api`;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_URL;
