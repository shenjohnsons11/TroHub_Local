import React from "react";
import { StyleSheet, View, Pressable, StyleProp, ViewStyle } from "react-native";
import { AppText } from "@/components/ui/typography";
import TroHubIcon from "../icons/TroHubIcon";
import { TroHubIconName } from "../icons/icon-registry";
import { useAppTheme } from "../../../contexts/ThemeContext";

interface EmptyStateCardProps {
  iconName?: TroHubIconName;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyStateCard({
  iconName = "house",
  title,
  description,
  actionText,
  onAction,
  style,
}: EmptyStateCardProps) {
  const { theme, resolvedTheme } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: resolvedTheme === "dark" ? theme.surface : theme.surfaceElevated,
          borderColor: theme.border,
          shadowColor: theme.text,
        },
        style,
      ]}
    >
      <View style={styles.iconWrapper}>
        <TroHubIcon name={iconName} size="hero" badge glow />
      </View>

      <AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>
      <AppText style={[styles.description, { color: theme.muted }]}>{description}</AppText>

      {actionText && onAction && (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onAction}
        >
          <AppText style={[styles.actionText, { color: resolvedTheme === "dark" ? "#04100e" : "#ffffff" }]}>
            {actionText}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 16,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
