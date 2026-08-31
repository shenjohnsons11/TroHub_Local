import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "./ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";
import { Contract } from "../types/Contract";

type Props = {
  contracts: Contract[];
  selectedRoomId?: string;
  onSelect: (roomId: string) => void;
};

export default function TenantRoomSwitcher({ contracts, selectedRoomId, onSelect }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const rooms = useMemo(() => {
    const seen = new Set<string>();
    return contracts
      .filter((contract) => ["active", "reserved", "requesting_termination"].includes(contract.status) && contract.roomId)
      .filter((contract) => {
        if (!contract.roomId || seen.has(contract.roomId)) return false;
        seen.add(contract.roomId);
        return true;
      });
  }, [contracts]);

  if (rooms.length < 2) return null;

  return (
    <View style={styles.container}>
      <AppText style={[styles.label, { color: theme.muted }]}>{t("roomSwitcher.label")}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {rooms.map((contract) => {
          const selected = contract.roomId === selectedRoomId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t("roomSwitcher.select", { room: contract.room })}
              key={contract.roomId}
              onPress={() => contract.roomId && onSelect(contract.roomId)}
              style={[styles.pill, { backgroundColor: selected ? theme.primary : theme.surfaceElevated, borderColor: selected ? theme.primary : theme.border }]}
            >
              <AppText style={[styles.pillText, { color: selected ? theme.background : theme.text }]}>{t("common.room")} {contract.room}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "800", marginBottom: 7 },
  row: { gap: 8, paddingRight: 16 },
  pill: { minHeight: 44, justifyContent: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 15 },
  pillText: { fontSize: 13, fontWeight: "900" },
});
