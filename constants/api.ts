import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return hostUri.split(':')[0];
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const LOCAL_API_URL = `http://${getHostIp()}:5000/api`;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_URL;