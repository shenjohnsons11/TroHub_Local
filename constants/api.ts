import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.99"; // Chỉ dùng khi test bằng điện thoại thật

export const API_BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:3000/api"
    : Platform.OS === "android"
    ? "http://10.0.2.2:3000/api"
    : `http://${LOCAL_IP}:3000/api`;