import { Platform } from "react-native";

const LOCAL_IP =
  Platform.OS === "android"
    ? "10.0.2.2"
    : Platform.OS === "ios"
      ? "192.168.1.80"
      : "localhost";

export const API_BASE_URL = `http://${LOCAL_IP}:3000/api`;