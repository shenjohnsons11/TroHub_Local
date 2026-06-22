export const ENV = {
  API_URL: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:3000/api" 
    : "http://192.168.1.12:3000/api" // Fallback to local IP if accessed from LAN
};
