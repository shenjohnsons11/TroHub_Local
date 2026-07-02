import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.99"; // Thay bằng IP LAN để test máy thật qua Expo Go

export const API_BASE_URL = Platform.OS === 'web' 
  ? "http://localhost:3000/api" 
  : `http://${LOCAL_IP}:3000/api`;