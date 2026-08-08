import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAppTheme } from "../../contexts/ThemeContext";
import AppButton from "./AppButton";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  kind: "invoice" | "contract" | "repair";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
};

const positions = {
  invoice: "0%",
  contract: "-100%",
  repair: "-200%",
} as const;

export default function IllustratedEmptyState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.illustrationViewport}>
        <Image
          source={require("../../assets/images/trohub-empty-states.png")}
          contentFit="cover"
          accessible={false}
          style={[styles.illustration, { left: positions[kind] }]}
        />
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
    borderRadius: 20,
    padding: 20,
  },
  illustrationViewport: { width: 180, height: 150, borderRadius: 16, overflow: "hidden" },
  illustration: { position: "absolute", width: "300%", height: "100%", top: 0 },
  title: { marginTop: 16, fontSize: 19, lineHeight: 24, fontWeight: "900", textAlign: "center" },
  description: { maxWidth: 280, marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: "center" },
  action: { alignSelf: "stretch", marginTop: 18 },
});
