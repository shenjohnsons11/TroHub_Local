import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "./ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import AnimatedEntry from "./ui/AnimatedEntry";
import { formatCurrency } from "../utils/formatters";
import { LinearGradient } from "expo-linear-gradient";
import FeatureIconBox from "./ui/FeatureIconBox";
import { FEATURE_ICONS, SYSTEM_ICONS } from "../constants/featureIcons";

type Props = {
  stats: any;
  onNavigate?: (screen: string, params?: any) => void;
};

export default function BentoGridDashboard({ stats, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const totalRooms = Number(stats?.totalRooms ?? 0);
  const occupiedRooms = Number(stats?.occupiedRooms ?? 0);
  const vacantRooms = Number(stats?.vacantRooms ?? Math.max(0, totalRooms - occupiedRooms));
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalRevenue = Number(stats?.totalRevenue ?? 0);
  const outstandingDebt = Number(stats?.outstandingDebt ?? 0);
  const pendingRepairs = Number(stats?.pendingRepairs ?? 0);
  const revenueSeries = Array.isArray(stats?.revenueSeries) ? stats.revenueSeries : [];
  const maxRevenue = Math.max(1, ...revenueSeries.map((item: any) => Number(item.value || 0)));

  return (
    <View style={styles.bentoContainer}>
      {/* Top Row: Asymmetric 2 Cards */}
      <View style={styles.topRow}>
        {/* Card 1: Revenue Overview with Wave Graphic */}
        <AnimatedEntry delay={100} style={styles.revenueCardWrap}>
          <Pressable
            style={styles.revenueBentoCard}
            onPress={() => onNavigate && onNavigate("invoice")}
          >
            <LinearGradient
              colors={["rgba(16, 185, 129, 0.22)", "rgba(6, 78, 59, 0.6)"]}
              style={styles.cardGradient}
            >
              <View style={styles.bentoHeaderRow}>
                <AppText style={styles.bentoEyebrow}>TỔNG DOANH THU</AppText>
                <View style={styles.growthBadge}>
                  <Ionicons name="trending-up" size={12} color="#10B981" />
                  <AppText style={styles.growthText}>
                    {totalRevenue > 0 ? "Thực tế" : "Chưa phát sinh"}
                  </AppText>
                </View>
              </View>

              <AppText style={styles.bigRevenueText}>
                {formatCurrency(totalRevenue)}
              </AppText>

              {/* Decorative Wave Bars */}
              <View style={styles.waveContainer}>
                {revenueSeries.map((item: any) => (
                  <View
                    key={item.period}
                    style={[
                      styles.waveBar,
                      {
                        height: `${Math.max(3, Number(item.value || 0) / maxRevenue * 100)}%`,
                        backgroundColor: "rgba(16, 185, 129, 0.65)",
                      },
                    ]}
                  />
                ))}
              </View>


              <View style={styles.insightsPill}>
                <Ionicons name="sparkles" size={12} color="#34D399" />
                <AppText style={styles.insightsText}>Phân tích chi tiết</AppText>
              </View>
            </LinearGradient>
          </Pressable>
        </AnimatedEntry>

        {/* Card 2: Property Occupancy Circular Gauge */}
        <AnimatedEntry delay={150} style={styles.occupancyCardWrap}>
          <Pressable
            style={styles.occupancyBentoCard}
            onPress={() => onNavigate && onNavigate("rooms")}
          >
            <View style={styles.bentoHeaderRow}>
              <AppText style={styles.bentoEyebrow}>CÔNG SUẤT PHÒNG</AppText>
              <Ionicons name="chevron-forward" size={14} color={theme.muted} />
            </View>

            {/* Glowing Donut Ring */}
            <View style={styles.donutContainer}>
              <View style={[styles.donutOuterRing, { borderColor: "rgba(16, 185, 129, 0.25)" }]}>
                <View style={styles.donutInnerCenter}>
                  <AppText style={styles.donutPercentText}>{occupancyRate}%</AppText>
                </View>
              </View>
            </View>

            <View style={styles.occupancyFooter}>
              <View style={styles.occMetaCol}>
                <AppText style={styles.occMetaVal}>{occupiedRooms}/{totalRooms}</AppText>
                <AppText style={styles.occMetaLbl}>Đang thuê</AppText>
              </View>
              <View style={styles.occMetaDivider} />
              <View style={styles.occMetaCol}>
                <AppText style={[styles.occMetaVal, { color: theme.warning }]}>{vacantRooms}</AppText>
                <AppText style={styles.occMetaLbl}>Trống</AppText>
              </View>
            </View>
          </Pressable>
        </AnimatedEntry>
      </View>

      {/* Middle Row: AI Quick Action Bar (3 Bento Pills) */}
      <AnimatedEntry delay={200}>
        <View style={styles.quickActionsBentoCard}>
          <AppText style={styles.bentoEyebrow}>THAO TÁC NHANH VỚI AI</AppText>
          <View style={styles.actionPillsRow}>
            <Pressable
              style={styles.actionPill}
              onPress={() => onNavigate && onNavigate("scan_meter")}
            >
              <FeatureIconBox token={FEATURE_ICONS.scanMeter} size={16} />
              <AppText style={styles.pillText}>Quét AI 📸</AppText>
            </Pressable>

            <Pressable
              style={styles.actionPill}
              onPress={() => onNavigate && onNavigate("invoice_bulk")}
            >
              <FeatureIconBox token={FEATURE_ICONS.invoiceBulk} size={16} />
              <AppText style={styles.pillText}>Tạo Hóa Đơn</AppText>
            </Pressable>

            <Pressable
              style={styles.actionPill}
              onPress={() => onNavigate && onNavigate("ai_chat")}
            >
              <FeatureIconBox token={SYSTEM_ICONS.aiAssistant} size={16} />
              <AppText style={styles.pillText}>Trợ Lý AI 🤖</AppText>
            </Pressable>
          </View>
        </View>
      </AnimatedEntry>

      {/* Bottom Row: 2 Equal Square Bento Cards */}
      <View style={styles.bottomRow}>
        {/* Pending Debt Card */}
        <AnimatedEntry delay={250} style={styles.halfBentoWrap}>
          <Pressable
            style={styles.squareBentoCard}
            onPress={() => onNavigate && onNavigate("invoice")}
          >
            <View style={styles.cardIconHeader}>
              <FeatureIconBox token={FEATURE_ICONS.invoiceCreate} size={18} />
              {outstandingDebt > 0 && <View style={styles.redGlowDot} />}
            </View>

            <View style={{ marginTop: 12 }}>
              <AppText style={styles.squareCardTitle}>Công nợ chưa thu</AppText>
              <AppText style={styles.squareCardValue}>{formatCurrency(outstandingDebt)}</AppText>
            </View>

            <AppText style={styles.squareCardFooter}>
              {outstandingDebt > 0 ? "⚠️ Cần nhắc nợ" : "✅ Đã thu đầy đủ"}
            </AppText>
          </Pressable>
        </AnimatedEntry>

        {/* Maintenance & Repairs Card */}
        <AnimatedEntry delay={300} style={styles.halfBentoWrap}>
          <Pressable
            style={styles.squareBentoCard}
            onPress={() => onNavigate && onNavigate("repair")}
          >
            <View style={styles.cardIconHeader}>
              <FeatureIconBox token={FEATURE_ICONS.repairs} size={18} />
              {pendingRepairs > 0 && <View style={styles.amberGlowDot} />}
            </View>

            <View style={{ marginTop: 12 }}>
              <AppText style={styles.squareCardTitle}>Sự cố & Sửa chữa</AppText>
              <AppText style={styles.squareCardValue}>{pendingRepairs} Yêu cầu</AppText>
            </View>

            <View style={styles.repairCategoriesRow}>
              <Ionicons name="flash-outline" size={13} color={theme.muted} />
              <Ionicons name="water-outline" size={13} color={theme.muted} />
              <Ionicons name="wifi-outline" size={13} color={theme.muted} />
              <AppText style={styles.repairCategoryText}>
                {pendingRepairs > 0 ? `${pendingRepairs} khẩn cấp` : "Ổn định"}
              </AppText>
            </View>
          </Pressable>
        </AnimatedEntry>
      </View>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    bentoContainer: { gap: 14, marginVertical: 10 },
    topRow: { flexDirection: "row", gap: 12 },
    revenueCardWrap: { flex: 1.2 },
    occupancyCardWrap: { flex: 0.8 },
    revenueBentoCard: {
      borderRadius: 26,
      overflow: "hidden",
      height: 195,
      elevation: 4,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
    },
    cardGradient: { flex: 1, padding: 16, justifyContent: "space-between" },
    bentoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bentoEyebrow: { color: theme.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
    growthBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    growthText: { color: "#10B981", fontSize: 10, fontWeight: "900" },
    bigRevenueText: { color: theme.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
    waveContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 45,
      marginVertical: 4,
    },

    waveBar: { width: 8, borderRadius: 4 },
    insightsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    insightsText: { color: theme.text, fontSize: 10, fontWeight: "800" },

    occupancyBentoCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 26,
      padding: 16,
      height: 195,
      justifyContent: "space-between",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    donutContainer: { alignItems: "center", justifyContent: "center" },
    donutOuterRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    donutInnerCenter: { alignItems: "center", justifyContent: "center" },
    donutPercentText: { color: theme.text, fontSize: 17, fontWeight: "900" },
    occupancyFooter: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    occMetaCol: { alignItems: "center" },
    occMetaVal: { color: theme.text, fontSize: 13, fontWeight: "900" },
    occMetaLbl: { color: theme.muted, fontSize: 10, fontWeight: "700" },
    occMetaDivider: { width: 1, height: 18, backgroundColor: theme.background },

    quickActionsBentoCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 24,
      padding: 16,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    actionPillsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    actionPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)",
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    pillText: { color: "#ECFDF5", fontSize: 12, fontWeight: "800", flexShrink: 1 },

    bottomRow: { flexDirection: "row", gap: 12 },
    halfBentoWrap: { flex: 1 },
    squareBentoCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 24,
      padding: 16,
      height: 145,
      justifyContent: "space-between",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    cardIconHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    redGlowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
    amberGlowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" },
    squareCardTitle: { color: theme.muted, fontSize: 11, fontWeight: "800" },
    squareCardValue: { color: theme.text, fontSize: 18, fontWeight: "900", marginTop: 2 },
    squareCardFooter: { color: theme.muted, fontSize: 10, fontWeight: "700" },
    repairCategoriesRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    repairCategoryText: { color: theme.muted, fontSize: 10, fontWeight: "700", marginLeft: 4 },
  });
}
