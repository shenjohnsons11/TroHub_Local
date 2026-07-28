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
    background: "#F8F6EF",
    surface: "#FFFCF7",
    surfaceElevated: "#FFFFFF",
    text: "#123A33",
    muted: "#596D65",
    border: "#DED8CC",
    primary: "#075E54",
    primarySoft: "#DDEFE8",
    positive: "#176B59",
    positiveSoft: "#DDF2EA",
    danger: "#B93A32",
    dangerForeground: "#FFFFFF",
    coral: "#FF6B52",
    warning: "#FF6B52",
    warningForeground: "#A33A27",
    warningSoft: "#FFE8E1",
    overlay: "rgba(4, 16, 14, 0.38)",
  },
  dark: {
    background: "#04100E",
    surface: "#0B211D",
    surfaceElevated: "#10302A",
    text: "#DDFBF0",
    muted: "#90AAA1",
    border: "rgba(140, 242, 201, 0.16)",
    primary: "#8CF2C9",
    primarySoft: "#143A31",
    positive: "#8CF2C9",
    positiveSoft: "#143A31",
    danger: "#FF836F",
    dangerForeground: "#04100E",
    coral: "#FF6B52",
    warning: "#FF6B52",
    warningForeground: "#FFD9D2",
    warningSoft: "#3A2A1D",
    overlay: "rgba(0, 6, 5, 0.72)",
  },
} as const;

export const COLORS = {
  bg: "#F8F6EF",
  card: "#FFFCF7",
  orange: "#075E54",
  orangeSoft: "#DDEFE8",
  text: "#123A33",
  muted: "#596D65",
  border: "#DED8CC",
  green: "#1B7F69",
  greenSoft: "#DDF2EA",
  coral: "#FF6B52",
  terracotta: "#A33A27",
  terracottaSoft: "#FFE8E1",
  red: "#B93A32",
  paper: "#F8F6EF",
};

export const SIZES = {
  radius: 16,
  radiusControl: 12,
  radiusHero: 20,
  padding: 20,
};

export const Colors = {
  light: {
    text: '#123A33',
    background: '#F8F6EF',
    tint: '#075E54',
    icon: '#596D65',
    tabIconDefault: '#596D65',
    tabIconSelected: '#075E54',
  },
  dark: {
    text: '#DDFBF0',
    background: '#04100E',
    tint: '#8CF2C9',
    icon: '#90AAA1',
    tabIconDefault: '#90AAA1',
    tabIconSelected: '#8CF2C9',
  },
};
