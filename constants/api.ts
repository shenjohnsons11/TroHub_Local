import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return hostUri.split(':')[0];
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

export const API_BASE_URL = `http://${getHostIp()}:5000/api`;
