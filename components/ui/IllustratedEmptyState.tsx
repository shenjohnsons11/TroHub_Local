import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import AppButton from "./AppButton";
import TroHubIcon from "./icons/TroHubIcon";
import { TroHubIconName } from "./icons/icon-registry";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  kind: "invoice" | "contract" | "repair";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
};

const iconMap: Record<Props["kind"], TroHubIconName> = {
  invoice: "billing",
  contract: "contract",
  repair: "repair",
};

export default function IllustratedEmptyState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}: Props) {
  const { theme, resolvedTheme } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: resolvedTheme === "dark" ? theme.surfaceElevated : theme.surface,
          borderColor: theme.border,
          shadowColor: theme.text,
        },
      ]}
    >
      <View style={styles.iconWrapper}>
        <TroHubIcon name={iconMap[kind] || "house"} size="hero" badge glow />
      </View>
      <AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>
      <AppText style={[styles.description, { color: theme.muted }]}>{description}</AppText>
      {actionLabel && onAction ? (
        <AppButton icon={actionIcon} onPress={onAction} style={styles.action}>
          {actionLabel}
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    maxWidth: 290,
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
    marginTop: 18,
  },
});

