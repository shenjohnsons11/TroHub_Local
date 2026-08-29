import { Platform, type TextStyle } from "react-native";

export const FONT_FAMILIES = {
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
  bold: "Inter-Bold",
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    web: "monospace",
    default: "monospace",
  }),
} as const;

export function fontFamilyForWeight(weight: TextStyle["fontWeight"]): string {
  if (weight === "bold" || Number(weight) >= 700) return FONT_FAMILIES.bold;
  if (Number(weight) >= 600) return FONT_FAMILIES.semibold;
  if (Number(weight) >= 500) return FONT_FAMILIES.medium;
  return FONT_FAMILIES.regular;
}

export const TROHUB_THEMES = {
  light: {
    background: "#f4f8f5",
    surface: "#ffffff",
    surfaceElevated: "#FFFFFF",
    text: "#1a202c",
    muted: "#52635c",
    border: "#d7e5dc",
    primary: "#0f5247",
    primarySoft: "#dff1e7",
    positive: "#0f6b57",
    positiveSoft: "#dff1e7",
    danger: "#b93a32",
    dangerForeground: "#ffffff",
    coral: "#d0604c",
    warning: "#b95643",
<<<<<<< HEAD
    warningForeground: "#ffffff",
=======
    warningForeground: "#b95643",
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
    warningSoft: "#fde9e4",
    overlay: "rgba(4, 16, 14, .38)",
  },
  dark: {
    background: "#04100e",
    surface: "#0b211d",
    surfaceElevated: "#073e36",
    text: "#e4f7ee",
    muted: "#a5bcb1",
    border: "rgba(255,255,255,.08)",
    primary: "#b8f5da",
    primarySoft: "#143A31",
    positive: "#b8f5da",
    positiveSoft: "#143A31",
    danger: "#ff836f",
    dangerForeground: "#04100e",
    coral: "#ff9a87",
    warning: "#ff9a87",
<<<<<<< HEAD
    warningForeground: "#04100e",
=======
    warningForeground: "#ff9a87",
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
    warningSoft: "#3a2a1d",
    overlay: "rgba(0, 6, 5, .72)",
  },
} as const;

export const COLORS = {
  bg: "#f4f8f5",
  card: "#ffffff",
  orange: "#0f5247",
  orangeSoft: "#dff1e7",
  text: "#1a202c",
  muted: "#52635c",
  border: "#d7e5dc",
  green: "#0f6b57",
  greenSoft: "#dff1e7",
  coral: "#d0604c",
  terracotta: "#b95643",
  terracottaSoft: "#fde9e4",
  red: "#b93a32",
  paper: "#f4f8f5",
};

export const SIZES = {
  radius: 16,
  radiusControl: 12,
  radiusHero: 20,
  padding: 20,
};

export const Colors = {
  light: {
    text: '#1a202c',
    background: '#f4f8f5',
    tint: '#0f5247',
    icon: '#52635c',
    tabIconDefault: '#52635c',
    tabIconSelected: '#0f5247',
  },
  dark: {
    text: '#e4f7ee',
    background: '#04100e',
    tint: '#b8f5da',
    icon: '#a5bcb1',
    tabIconDefault: '#a5bcb1',
    tabIconSelected: '#b8f5da',
  },
};
