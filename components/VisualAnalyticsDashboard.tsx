import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { AppText } from "./ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";
import Card from "./Card";
import AnimatedEntry from "./ui/AnimatedEntry";
import { formatCurrency } from "../utils/formatters";

type Props = {
  stats: any;
  onNavigate?: (screen: string, params?: any) => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function VisualAnalyticsDashboard({ stats, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(5); // Default to latest month

  // Mock revenue history for 6 months
  const revenueHistory = [
    { month: "T03", revenue: 14200000, heightPct: 45 },
    { month: "T04", revenue: 16800000, heightPct: 60 },
    { month: "T05", revenue: 15500000, heightPct: 52 },
    { month: "T06", revenue: 19200000, heightPct: 80 },
    { month: "T07", revenue: 17800000, heightPct: 70 },
    { month: "T08", revenue: 18460000, heightPct: 75 },
  ];

  // Utility trend data (kWh and m3)
  const utilityTrends = [
    { month: "T04", elec: 1250, water: 110 },
    { month: "T05", elec: 1420, water: 125 },
    { month: "T06", elec: 1680, water: 145 },
    { month: "T07", elec: 1850, water: 160 },
    { month: "T08", elec: 1720, water: 150 },
  ];

  const totalRooms = stats?.totalRooms || 8;
  const occupiedRooms = stats?.occupiedRooms || 3;
  const vacantRooms = stats?.vacantRooms || Math.max(0, totalRooms - occupiedRooms);
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const outstandingDebt = stats?.outstandingDebt || 0;

  return (
    <View style={styles.container}>
      {/* 1. Header Banner: Biểu đồ Doanh Thu Cột */}
      <AnimatedEntry delay={100}>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <AppText style={styles.chartTitle}>DOANH THU HÀNG THÁNG</AppText>
              <AppText style={styles.chartBigValue}>
                {formatCurrency(revenueHistory[selectedMonthIndex].revenue)}
              </AppText>
            </View>
            <View style={styles.monthBadge}>
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
              <AppText style={styles.monthBadgeText}>
                Tháng {revenueHistory[selectedMonthIndex].month}
              </AppText>
            </View>
          </View>

          {/* Bar Chart Container */}
          <View style={styles.barChartContainer}>
            {revenueHistory.map((item, idx) => {
              const isSelected = idx === selectedMonthIndex;
              return (
                <Pressable
                  key={item.month}
                  style={styles.barColumn}
                  onPress={() => setSelectedMonthIndex(idx)}
                >
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${item.heightPct}%`,
                          backgroundColor: isSelected ? theme.primary : theme.primarySoft,
                        },
                      ]}
                    />
                  </View>
                  <AppText
                    style={[
                      styles.barLabel,
                      isSelected && { color: theme.primary, fontWeight: "900" },
                    ]}
                  >
                    {item.month}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </AnimatedEntry>

      {/* 2. Hàng 2 Card: Tỷ lệ lấp đầy & Dự báo AI */}
      <View style={styles.gridRow}>
        {/* Card Donut Tỷ lệ lấp đầy */}
        <AnimatedEntry delay={200} style={styles.halfCard}>
          <Pressable
            style={styles.gridCard}
            onPress={() => onNavigate && onNavigate("rooms")}
          >
            <View style={styles.gridCardHeader}>
              <Ionicons name="pie-chart-outline" size={20} color={theme.primary} />
              <AppText style={styles.gridCardTitle}>Lấp đầy</AppText>
            </View>
            
            {/* Visual Circular Gauge indicator */}
            <View style={styles.gaugeContainer}>
              <View style={[styles.gaugeCircle, { borderColor: theme.primarySoft }]}>
                <View style={[styles.gaugeInnerCircle, { backgroundColor: theme.surfaceElevated }]}>
                  <AppText style={styles.gaugeText}>{occupancyRate}%</AppText>
                </View>
              </View>
            </View>

            <AppText style={styles.gaugeDetail}>
              {occupiedRooms}/{totalRooms} phòng đg thuê
            </AppText>
          </Pressable>
        </AnimatedEntry>

        {/* Card AI Forecast & Công nợ */}
        <AnimatedEntry delay={250} style={styles.halfCard}>
          <Pressable
            style={styles.gridCard}
            onPress={() => onNavigate && onNavigate("invoice")}
          >
            <View style={styles.gridCardHeader}>
              <Ionicons name="sparkles-outline" size={20} color={theme.warning} />
              <AppText style={styles.gridCardTitle}>Dự báo AI</AppText>
            </View>

            <View style={styles.aiForecastBox}>
              <AppText style={styles.aiGrowthText}>+12.5%</AppText>
              <AppText style={styles.aiSubText}>Tăng trưởng T09</AppText>
            </View>

            <View style={styles.debtDivider} />

            <View style={styles.debtRow}>
              <AppText style={styles.debtLabel}>Nợ quá hạn:</AppText>
              <AppText style={styles.debtValue}>{formatCurrency(outstandingDebt)}</AppText>
            </View>
          </Pressable>
        </AnimatedEntry>
      </View>

      {/* 3. Xu hướng Tiêu thụ Điện Nước */}
      <AnimatedEntry delay={300}>
        <View style={styles.utilityCard}>
          <View style={styles.utilityHeader}>
            <View style={styles.utilityTitleRow}>
              <Ionicons name="flash-outline" size={18} color="#F59E0B" />
              <Ionicons name="water-outline" size={18} color="#3B82F6" style={{ marginLeft: -6 }} />
              <AppText style={styles.utilityTitle}>BIẾN ĐỘNG TIÊU THỤ ĐIỆN NƯỚC</AppText>
            </View>
            <AppText style={styles.utilityBadge}>5 tháng gần nhất</AppText>
          </View>

          {/* List of Utility Trend Items */}
          <View style={styles.utilityList}>
            {utilityTrends.map((u) => (
              <View key={u.month} style={styles.utilityItem}>
                <AppText style={styles.utilityMonth}>{u.month}</AppText>
                <View style={styles.utilityMetrics}>
                  <View style={styles.utilityPill}>
                    <Ionicons name="flash" size={12} color="#F59E0B" />
                    <AppText style={styles.utilityValText}>{u.elec} kWh</AppText>
                  </View>
                  <View style={[styles.utilityPill, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                    <Ionicons name="water" size={12} color="#3B82F6" />
                    <AppText style={[styles.utilityValText, { color: "#3B82F6" }]}>{u.water} m³</AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </AnimatedEntry>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { gap: 14, marginVertical: 10 },
    chartCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 24,
      padding: 18,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
    chartHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    chartTitle: { color: theme.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
    chartBigValue: { color: theme.text, fontSize: 26, fontWeight: "900", marginTop: 4 },
    monthBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    monthBadgeText: { color: theme.primary, fontSize: 12, fontWeight: "800" },
    barChartContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 120,
      paddingTop: 10,
    },
    barColumn: { alignItems: "center", width: 36, height: "100%", justifyContent: "flex-end" },
    barTrack: {
      width: 14,
      height: 90,
      backgroundColor: theme.background,
      borderRadius: 8,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: { width: "100%", borderRadius: 8 },
    barLabel: { color: theme.muted, fontSize: 11, fontWeight: "700", marginTop: 8 },
    gridRow: { flexDirection: "row", gap: 12 },
    halfCard: { flex: 1 },
    gridCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 22,
      padding: 16,
      minHeight: 145,
      justifyContent: "space-between",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    gridCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    gridCardTitle: { color: theme.text, fontSize: 13, fontWeight: "900" },
    gaugeContainer: { alignItems: "center", justifyContent: "center", marginVertical: 6 },
    gaugeCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    gaugeInnerCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    gaugeText: { color: theme.text, fontSize: 14, fontWeight: "900" },
    gaugeDetail: { color: theme.muted, fontSize: 11, textAlign: "center", fontWeight: "700" },
    aiForecastBox: { marginTop: 6 },
    aiGrowthText: { color: theme.primary, fontSize: 24, fontWeight: "900" },
    aiSubText: { color: theme.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
    debtDivider: { height: 1, backgroundColor: theme.background, marginVertical: 6 },
    debtRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    debtLabel: { color: theme.muted, fontSize: 10, fontWeight: "700" },
    debtValue: { color: theme.danger, fontSize: 11, fontWeight: "900" },
    utilityCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 22,
      padding: 16,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    utilityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    utilityTitleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    utilityTitle: { color: theme.text, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, marginLeft: 4 },
    utilityBadge: { color: theme.muted, fontSize: 11, fontWeight: "700" },
    utilityList: { gap: 8 },
    utilityItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    utilityMonth: { color: theme.text, fontSize: 12, fontWeight: "800" },
    utilityMetrics: { flexDirection: "row", gap: 8 },
    utilityPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    utilityValText: { color: "#F59E0B", fontSize: 11, fontWeight: "800" },
  });
}
