import type { ComponentProps } from "react";

export type FeatureIconName = ComponentProps<typeof import("@expo/vector-icons").Ionicons>["name"];

export type FeatureIconToken = {
  icon: FeatureIconName;
  color: string;
  bg: string;
};

export const FEATURE_ICONS = {
  rooms: { icon: "business-outline", color: "#3B82F6", bg: "#3B82F620" },
  contractCreate: { icon: "document-text-outline", color: "#10B981", bg: "#10B98120" },
  contracts: { icon: "reader-outline", color: "#059669", bg: "#05966920" },
  invoiceCreate: { icon: "receipt-outline", color: "#8B5CF6", bg: "#8B5CF620" },
  invoiceBulk: { icon: "documents-outline", color: "#6366F1", bg: "#6366F120" },
  utility: { icon: "flash-outline", color: "#F59E0B", bg: "#F59E0B20" },
  scanMeter: { icon: "camera-outline", color: "#EC4899", bg: "#EC489920" },
  tenants: { icon: "people-outline", color: "#14B8A6", bg: "#14B8A620" },
  scanCCCD: { icon: "scan-outline", color: "#06B6D4", bg: "#06B6D420" },
  repairs: { icon: "construct-outline", color: "#F97316", bg: "#F9731620" },
  services: { icon: "pricetags-outline", color: "#84CC16", bg: "#84CC1620" },
  vietqr: { icon: "qr-code-outline", color: "#6B7280", bg: "#6B728020" },
  home: { icon: "home-outline", color: "#10B981", bg: "#10B98120" },
  account: { icon: "person-outline", color: "#3B82F6", bg: "#3B82F620" },
} as const satisfies Record<string, FeatureIconToken>;

export const FEATURE_ICON_BOX = {
  width: 44,
  height: 44,
  borderRadius: 14,
  iconSize: 22,
} as const;

export const SYSTEM_ICONS = {
  overview: { icon: "grid-outline", color: "#10B981", bg: "#10B98120" },
  aiAssistant: { icon: "sparkles-outline", color: "#34D399", bg: "#34D39920" },
  settings: { icon: "settings", color: "#10B981", bg: "#10B98120" },
  profile: { icon: "person", color: "#3B82F6", bg: "#3B82F620" },
  security: { icon: "lock-closed", color: "#F59E0B", bg: "#F59E0B20" },
  signature: { icon: "create", color: "#10B981", bg: "#10B98120" },
  preferences: { icon: "options", color: "#F59E0B", bg: "#F59E0B20" },
  notifications: { icon: "notifications-outline", color: "#3B82F6", bg: "#3B82F620" },
  language: { icon: "globe-outline", color: "#10B981", bg: "#10B98120" },
  information: { icon: "information-circle", color: "#14B8A6", bg: "#14B8A620" },
} as const satisfies Record<string, FeatureIconToken>;
