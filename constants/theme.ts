import { Platform } from "react-native";

export const FONT_FAMILIES = {
  sans: Platform.select({
    ios: "System",
    android: "sans-serif",
    web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Arial, sans-serif',
    default: "System",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    web: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    default: "monospace",
  }),
} as const;

export const TROHUB_THEMES = {
  light: {
    background: "#F1F3F4",
    surface: "#FBFCFC",
    surfaceElevated: "#FFFFFF",
    text: "#25292D",
    muted: "#697178",
    border: "#D9DEE1",
    primary: "#C3480B",
    primarySoft: "#FFF0E7",
    positive: "#17834A",
    positiveSoft: "#E8F6EE",
    danger: "#C83F49",
    overlay: "rgba(37, 41, 45, 0.42)",
  },
  dark: {
    background: "#25292D",
    surface: "#30353A",
    surfaceElevated: "#383E43",
    text: "#F4F5F3",
    muted: "#B6BCC0",
    border: "#454B50",
    primary: "#FF7A32",
    primarySoft: "#49372D",
    positive: "#67D69A",
    positiveSoft: "#29483A",
    danger: "#FF7A82",
    overlay: "rgba(16, 18, 20, 0.68)",
  },
} as const;

export const COLORS = {
  bg: "#F1F2F4",
  card: "#FFFFFF",
  orange: "#C3480B",
  orangeSoft: "#FFF1E8",
  text: "#20242A",
  muted: "#8A8F98",
  border: "#E7E7E7",
  green: "#17834A",
  red: "#FF5A5A",
};

export const SIZES = {
  radius: 13,
  padding: 18,
};

export const Colors = {
  light: {
    text: '#20242A',
    background: '#F1F2F4',
    tint: '#C3480B',
    icon: '#8A8F98',
    tabIconDefault: '#8A8F98',
    tabIconSelected: '#C3480B',
  },
  dark: {
    text: '#F4F5F3',
    background: '#25292D',
    tint: '#FF7A32',
    icon: '#B6BCC0',
    tabIconDefault: '#B6BCC0',
    tabIconSelected: '#FF7A32',
  },
};
