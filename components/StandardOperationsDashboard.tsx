import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { AdminDashboardStats } from "../services/adminService";

const METER_LABELS_VI: Record<string, string> = {
  electricity: "điện",
  water: "nước",
};

const METER_LABELS_EN: Record<string, string> = {
  electricity: "electricity",
  water: "water",
};

function formatMissingMeters(missing: string[] = [], isEn: boolean): string {
  const map = isEn ? METER_LABELS_EN : METER_LABELS_VI;
  return missing.map((item) => map[item] || item).join(", ");
}

export default function StandardOperationsDashboard({
  stats,
  onNavigate,
}: {
  stats: AdminDashboardStats;
  onNavigate: (screen: string, params?: any) => void;
}) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const isEn = language === "en";

  if (!stats.floorGroups.length) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.surfaceElevated }]}>
        <Ionicons name="business-outline" size={30} color={theme.primary} />
        <AppText style={[styles.emptyTitle, { color: theme.text }]}>
          {isEn ? "No rooms yet" : "Chưa có phòng"}
        </AppText>
        <AppText style={[styles.emptyText, { color: theme.muted }]}>
          {isEn
            ? "Add rooms to manage operations by floor."
            : "Thêm phòng để bắt đầu quản lý theo tầng."}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stats.floorGroups.map((group) => (
        <View key={group.floor} style={styles.group}>
          <View style={styles.groupHeader}>
            <AppText style={[styles.floor, { color: theme.text }]}>
              {isEn ? `Floor ${group.floor}` : `Tầng ${group.floor}`}
            </AppText>
            <AppText style={[styles.count, { color: theme.muted }]}>
              {group.rooms.length} {isEn ? "rooms" : "phòng"}
            </AppText>
          </View>

          <View style={styles.grid}>
            {group.rooms.map((room) => {
              const color =
                room.status === 1
                  ? theme.primary
                  : room.status === 2
                  ? theme.warning
                  : theme.muted;

              return (
                <Pressable
                  key={room.id}
                  accessibilityRole="button"
                  onPress={() => onNavigate("rooms", { roomId: room.id })}
                  style={[
                    styles.room,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor:
                        room.meterReady || room.status !== 1
                          ? theme.border
                          : theme.warning,
                    },
                  ]}
                >
                  <View style={styles.roomTop}>
                    <AppText style={[styles.roomCode, { color: theme.text }]}>
                      {room.roomCode}
                    </AppText>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                  </View>

                  <AppText
                    numberOfLines={1}
                    style={[styles.tenant, { color: theme.muted }]}
                  >
                    {room.tenantName ||
                      (room.status === 0
                        ? isEn
                          ? "Phòng trống"
                          : "Phòng trống"
                        : isEn
                        ? "No tenant"
                        : "Chưa có khách")}
                  </AppText>

                  {room.status === 1 ? (
                    <View style={styles.meter}>
                      <Ionicons
                        name={room.meterReady ? "checkmark-circle" : "alert-circle"}
                        size={14}
                        color={room.meterReady ? theme.primary : theme.warning}
                      />
                      <AppText
                        style={[
                          styles.meterText,
                          {
                            color: room.meterReady ? theme.primary : theme.warning,
                          },
                        ]}
                      >
                        {room.meterReady
                          ? isEn
                            ? "Meters recorded"
                            : "Đủ chỉ số"
                          : isEn
                          ? `Missing ${formatMissingMeters(room.missingMeters, true)}`
                          : `Thiếu ${formatMissingMeters(room.missingMeters, false)}`}
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  group: { gap: 10 },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  floor: { fontSize: 17, fontWeight: "900" },
  count: { fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  room: {
    width: "48%",
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  roomTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomCode: { fontSize: 15, fontWeight: "900" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tenant: { fontSize: 10.5, marginTop: 7 },
  meter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  meterText: { flex: 1, fontSize: 9.5, fontWeight: "800" },
  empty: { alignItems: "center", borderRadius: 20, padding: 28 },
  emptyTitle: { fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { fontSize: 12, marginTop: 4 },
});
