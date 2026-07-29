import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { WidgetDataSnapshot } from "../../types/WidgetData";

type WidgetSize = "small" | "medium" | "large";

type Props = {
  size: WidgetSize;
  data: WidgetDataSnapshot;
  onNavigate?: (tab: string, params?: any) => void;
  onScanCamera?: () => void;
};

export default function TroHubWidgetView({ size, data, onNavigate, onScanCamera }: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const subTextColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)";

  const formattedRevenue = `${(data.totalRevenue || 0).toLocaleString("vi-VN")}đ`;
  const formattedDebt = `${(data.outstandingDebt || 0).toLocaleString("vi-VN")}đ`;

  if (size === "small") {
    // Small Widget (2x2)
    return (
      <View style={[styles.cardSmall, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="wallet-outline" size={18} color={theme.primary} />
          </View>
          <Text style={[styles.badgeText, { color: theme.primary }]}>TROHUB 2x2</Text>
        </View>

        <View style={styles.bodySmall}>
          <Text style={[styles.label, { color: subTextColor }]}>DOANH THU THÁNG</Text>
          <Text style={[styles.valueLarge, { color: textColor }]} numberOfLines={1}>
            {formattedRevenue}
          </Text>
          <View style={styles.statPill}>
            <Ionicons name="pie-chart-outline" size={12} color="#10b981" />
            <Text style={styles.statPillText}>
              {data.occupancyRate}% lấp đầy ({data.occupiedRooms}/{data.totalRooms})
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (size === "medium") {
    // Medium Widget (4x2)
    return (
      <View style={[styles.cardMedium, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.topMedium}>
          <View style={styles.brandRow}>
            <Ionicons name="home" size={16} color={theme.primary} />
            <Text style={[styles.brandTitle, { color: textColor }]}>TROHUB ADMIN</Text>
          </View>
          {onScanCamera && (
            <Pressable
              accessibilityRole="button"
              onPress={onScanCamera}
              style={[styles.scanBtnMini, { backgroundColor: theme.primarySoft }]}
            >
              <Ionicons name="camera-outline" size={14} color={theme.primary} />
              <Text style={[styles.scanBtnMiniText, { color: theme.primary }]}>Quét Camera</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.grid3Cols}>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: subTextColor }]}>Công nợ chưa thu</Text>
            <Text style={[styles.metricValue, { color: "#ef4444" }]} numberOfLines={1}>
              {formattedDebt}
            </Text>
          </View>

          <View style={[styles.metricCol, styles.colBorder, { borderColor }]}>
            <Text style={[styles.metricLabel, { color: subTextColor }]}>Chốt Điện Nước</Text>
            <Text style={[styles.metricValue, { color: "#f59e0b" }]} numberOfLines={1}>
              {data.utilityReadingProgress}
            </Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: subTextColor }]}>Sự cố đang mở</Text>
            <Text style={[styles.metricValue, { color: "#6366f1" }]} numberOfLines={1}>
              {data.openRepairsCount} sự cố
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Large Widget (4x4)
  return (
    <View style={[styles.cardLarge, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.largeHeader}>
        <View>
          <Text style={[styles.brandTitleLarge, { color: textColor }]}>TROHUB DASHBOARD</Text>
          <Text style={[styles.subDate, { color: subTextColor }]}>TỔNG QUAN VẬN HÀNH DỰ ÁN</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onScanCamera}
          style={[styles.scanBtnLarge, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="camera" size={16} color="#ffffff" />
          <Text style={styles.scanBtnLargeText}>Quét Camera</Text>
        </Pressable>
      </View>

      <View style={styles.grid2x2}>
        <View style={[styles.gridCell, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
          <Ionicons name="wallet-outline" size={20} color={theme.primary} />
          <Text style={[styles.gridLabel, { color: subTextColor }]}>Doanh thu tháng</Text>
          <Text style={[styles.gridVal, { color: textColor }]} numberOfLines={1}>
            {formattedRevenue}
          </Text>
        </View>

        <View style={[styles.gridCell, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
          <Ionicons name="card-outline" size={20} color="#ef4444" />
          <Text style={[styles.gridLabel, { color: subTextColor }]}>Công nợ tồn</Text>
          <Text style={[styles.gridVal, { color: "#ef4444" }]} numberOfLines={1}>
            {formattedDebt}
          </Text>
        </View>

        <View style={[styles.gridCell, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
          <Ionicons name="flash-outline" size={20} color="#f59e0b" />
          <Text style={[styles.gridLabel, { color: subTextColor }]}>Tiến độ Điện Nước</Text>
          <Text style={[styles.gridVal, { color: "#f59e0b" }]} numberOfLines={1}>
            {data.utilityReadingProgress}
          </Text>
        </View>

        <View style={[styles.gridCell, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
          <Ionicons name="construct-outline" size={20} color="#6366f1" />
          <Text style={[styles.gridLabel, { color: subTextColor }]}>Sự cố đang mở</Text>
          <Text style={[styles.gridVal, { color: "#6366f1" }]} numberOfLines={1}>
            {data.openRepairsCount} mở
          </Text>
        </View>
      </View>

      {/* Deep-link Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.("invoice_bulk")}
          style={[styles.actionChip, { backgroundColor: theme.primarySoft }]}
        >
          <Ionicons name="receipt-outline" size={14} color={theme.primary} />
          <Text style={[styles.actionChipText, { color: theme.primary }]}>Lập Hóa Đơn</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.("utility")}
          style={[styles.actionChip, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}
        >
          <Ionicons name="flash-outline" size={14} color="#f59e0b" />
          <Text style={[styles.actionChipText, { color: "#f59e0b" }]}>Điện Nước</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.("repair")}
          style={[styles.actionChip, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}
        >
          <Ionicons name="construct-outline" size={14} color="#6366f1" />
          <Text style={[styles.actionChipText, { color: "#6366f1" }]}>Sự Cố</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSmall: {
    width: 156,
    height: 156,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bodySmall: {
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  valueLarge: {
    fontSize: 16,
    fontWeight: "900",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
  },
  cardMedium: {
    width: "100%",
    minHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    marginBottom: 14,
    elevation: 3,
  },
  topMedium: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  scanBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  scanBtnMiniText: {
    fontSize: 11,
    fontWeight: "800",
  },
  grid3Cols: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  colBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  cardLarge: {
    width: "100%",
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
  },
  largeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandTitleLarge: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  subDate: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  scanBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  scanBtnLargeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  gridCell: {
    width: "48%",
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  gridVal: {
    fontSize: 14,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  actionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
