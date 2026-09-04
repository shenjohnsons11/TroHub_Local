import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import FeatureIconBox from "./FeatureIconBox";
import type { FeatureIconToken } from "../../constants/featureIcons";

type Props = PropsWithChildren<{
  icon: keyof typeof Ionicons.glyphMap;
  iconToken?: FeatureIconToken;
  label: string;
  value: string;
  detail?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}>;

export default function GradientHero({
  icon,
  iconToken,
  label,
  value,
  detail,
  actionLabel,
  actionIcon = "arrow-forward",
  onAction,
  children,
}: Props) {
  return (
    <LinearGradient colors={["#075E54", "#04100E"]} style={styles.hero}>
      {iconToken ? <FeatureIconBox token={iconToken} size={23} /> : <View style={styles.iconTile}><Ionicons name={icon} size={23} color="#DDFBF0" /></View>}
      <AppText style={styles.label}>{label}</AppText>
      <AppText adjustsFontSizeToFit numberOfLines={1} style={styles.value}>{value}</AppText>
      {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      {children}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Ionicons name={actionIcon} size={18} color="#04100E" />
          <AppText style={styles.actionText}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    elevation: 8,
    minHeight: 210,
    overflow: "hidden",
    padding: 22,
    shadowColor: "#04100E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
  },
  iconTile: {
    alignItems: "center",
    backgroundColor: "rgba(221,251,240,0.14)",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    marginBottom: 20,
    width: 44,
  },
  label: { color: "#BFE8DA", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  value: { color: "#FFFFFF", fontSize: 34, fontWeight: "900", letterSpacing: -1, marginTop: 6 },
  detail: { color: "#DDFBF0", fontSize: 13, lineHeight: 20, marginTop: 7 },
  action: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#8CF2C9",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionText: { color: "#04100E", fontSize: 14, fontWeight: "900" },
});
