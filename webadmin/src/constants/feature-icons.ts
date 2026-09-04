import type { LucideIcon } from "lucide-react";
import {
  Camera,
  CreditCard,
  Droplet,
  FileSignature,
  Files,
  FileText,
  Home,
  LayoutDashboard,
  QrCode,
  Receipt,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type FeatureIconToken = {
  icon: LucideIcon;
  color: string;
  bg: string;
  border?: string;
};

export const FEATURE_ICONS: Record<string, FeatureIconToken> = {
  overview: { icon: LayoutDashboard, color: "#10B981", bg: "#10B98118", border: "#10B98130" },
  rooms: { icon: Home, color: "#3B82F6", bg: "#3B82F618", border: "#3B82F630" },
  tenants: { icon: Users, color: "#14B8A6", bg: "#14B8A618", border: "#14B8A630" },
  contracts: { icon: FileText, color: "#059669", bg: "#05966918", border: "#05966930" },
  contractCreate: { icon: FileSignature, color: "#10B981", bg: "#10B98118", border: "#10B98130" },
  utilities: { icon: Droplet, color: "#F59E0B", bg: "#F59E0B18", border: "#F59E0B30" },
  scanMeter: { icon: Camera, color: "#EC4899", bg: "#EC489918", border: "#EC489930" },
  invoices: { icon: Receipt, color: "#8B5CF6", bg: "#8B5CF618", border: "#8B5CF630" },
  invoiceBulk: { icon: Files, color: "#6366F1", bg: "#6366F118", border: "#6366F130" },
  debts: { icon: Wallet, color: "#F43F5E", bg: "#F43F5E18", border: "#F43F5E30" },
  payments: { icon: CreditCard, color: "#0284C7", bg: "#0284C718", border: "#0284C730" },
  services: { icon: Settings2, color: "#84CC16", bg: "#84CC1618", border: "#84CC1630" },
  repairs: { icon: Wrench, color: "#F97316", bg: "#F9731618", border: "#F9731630" },
  settings: { icon: SlidersHorizontal, color: "#6B7280", bg: "#6B728018", border: "#6B728030" },
  vietqr: { icon: QrCode, color: "#6B7280", bg: "#6B728018", border: "#6B728030" },
  aiAssistant: { icon: Sparkles, color: "#34D399", bg: "#34D39918", border: "#34D39930" },
};

export type FeatureIconKey = keyof typeof FEATURE_ICONS;
