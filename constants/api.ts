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

const LOCAL_API_URL = `http://${getLocalHostIp()}:5000/api`;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_URL;

