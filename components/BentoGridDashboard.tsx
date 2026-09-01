import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { AppText } from "./ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import AnimatedEntry from "./ui/AnimatedEntry";
import { formatCurrency } from "../utils/formatters";

type Props = {
  stats: any;
  onNavigate?: (screen: string, params?: any) => void;
};

export default function BentoGridDashboard({ stats, onNavigate }: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const styles = createStyles(theme, isDark);

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
        {/* Card 1: Revenue Overview (Clean Card matching WebAdmin) */}
        <AnimatedEntry delay={100} style={styles.revenueCardWrap}>
          <Pressable
            style={styles.revenueBentoCard}
            onPress={() => onNavigate && onNavigate("invoice")}
          >
            <View style={styles.bentoHeaderRow}>
              <AppText style={styles.bentoEyebrow}>TỔNG DOANH THU THÁNG NÀY</AppText>
              <View style={styles.growthBadge}>
                <Ionicons name="trending-up" size={11} color="#10B981" />
                <AppText style={styles.growthText}>
                  {totalRevenue > 0 ? "Thực tế" : "Chưa có phát sinh"}
                </AppText>
              </View>
            </View>

            <AppText style={styles.bigRevenueText}>
              {formatCurrency(totalRevenue)}
            </AppText>

            {/* Wave Bar Chart */}
            <View style={styles.waveContainer}>
              {revenueSeries.length > 0 ? (
                revenueSeries.map((item: any) => (
                  <View key={item.period} style={styles.waveCol}>
                    <View
                      style={[
                        styles.waveBar,
                        {
                          height: `${Math.max(6, (Number(item.value || 0) / maxRevenue) * 100)}%`,
                          backgroundColor: "#10B981",
                        },
                      ]}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyWaveRow}>
                  <View style={[styles.waveBar, { height: "20%", backgroundColor: "rgba(16, 185, 129, 0.3)" }]} />
                  <View style={[styles.waveBar, { height: "40%", backgroundColor: "rgba(16, 185, 129, 0.4)" }]} />
                  <View style={[styles.waveBar, { height: "15%", backgroundColor: "rgba(16, 185, 129, 0.3)" }]} />
                  <View style={[styles.waveBar, { height: "60%", backgroundColor: "rgba(16, 185, 129, 0.6)" }]} />
                  <View style={[styles.waveBar, { height: "30%", backgroundColor: "rgba(16, 185, 129, 0.3)" }]} />
                </View>
              )}
            </View>

            <View style={styles.revenueFooter}>
              <View style={styles.meterStatBadge}>
                <AppText style={styles.meterStatText}>
                  {stats?.utilityReading?.readyRooms || 0}/{stats?.utilityReading?.totalOccupiedRooms || 0} phòng đủ số
                </AppText>
              </View>
              <View style={styles.detailLink}>
                <AppText style={styles.detailLinkText}>Chi tiết</AppText>
                <Ionicons name="arrow-forward" size={11} color={theme.primary} />
              </View>
            </View>
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
              <Ionicons name="arrow-forward" size={13} color={theme.muted} />
            </View>

            {/* Glowing Donut Ring */}
            <View style={styles.donutContainer}>
              <View style={[styles.donutOuterRing, { borderColor: "rgba(16, 185, 129, 0.22)", borderTopColor: "#10B981", borderRightColor: "#10B981" }]}>
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
                <AppText style={[styles.occMetaVal, { color: "#F59E0B" }]}>{vacantRooms}</AppText>
                <AppText style={styles.occMetaLbl}>Trống</AppText>
              </View>
            </View>
          </Pressable>
        </AnimatedEntry>
      </View>

      {/* Middle Row: AI Quick Action Bar (Matching WebAdmin 3 Distinct Cards) */}
      <AnimatedEntry delay={200}>
        <View style={styles.quickActionsBentoCard}>
          <AppText style={styles.bentoEyebrow}>THAO TÁC NHANH THÔNG MINH (AI QUICK ACTIONS)</AppText>
          <View style={styles.actionCardsGrid}>
            {/* Action 1: Quét Điện Nước AI */}
            <Pressable
              style={[styles.actionCard, styles.actionCardMint]}
              onPress={() => onNavigate && onNavigate("scan_meter")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#10B981" }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.actionCardBody}>
                <AppText style={styles.actionCardTitle}>Quét điện nước AI 📸</AppText>
                <AppText style={styles.actionCardSub}>Chụp camera tự chốt số</AppText>
              </View>
            </Pressable>

            {/* Action 2: Tạo Hóa Đơn Hàng Loạt */}
            <Pressable
              style={[styles.actionCard, styles.actionCardBlue]}
              onPress={() => onNavigate && onNavigate("invoice_bulk")}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#3B82F6" }]}>
                <Ionicons name="document-text" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.actionCardBody}>
                <AppText style={styles.actionCardTitle}>Tạo Hóa Đơn Hàng Loạt</AppText>
                <AppText style={styles.actionCardSub}>Phát hành tự động 1s</AppText>
              </View>
            </Pressable>

            {/* Action 3: Tạo Hợp Đồng Mới */}
            <Pressable
              style={[styles.actionCard, styles.actionCardAmber]}
              onPress={() => onNavigate && onNavigate("contract", { action: "create" })}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="create" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.actionCardBody}>
                <AppText style={styles.actionCardTitle}>Tạo Hợp Đồng Mới</AppText>
                <AppText style={styles.actionCardSub}>Dự thảo & Ký điện tử</AppText>
              </View>
            </Pressable>
          </View>
        </View>
      </AnimatedEntry>

      {/* Bottom Row: 2 Square Bento Cards (Debt & Repairs) */}
      <View style={styles.bottomRow}>
        {/* Pending Debt Card */}
        <AnimatedEntry delay={250} style={styles.halfBentoWrap}>
          <Pressable
            style={styles.squareBentoCard}
            onPress={() => onNavigate && onNavigate("invoice")}
          >
            <View style={styles.cardIconHeader}>
              <View style={[styles.squareIconTile, { backgroundColor: "rgba(244, 63, 94, 0.12)" }]}>
                <Ionicons name="wallet" size={18} color="#F43F5E" />
              </View>
              {outstandingDebt > 0 && <View style={styles.redGlowDot} />}
            </View>

            <View style={{ marginTop: 8 }}>
              <AppText style={styles.squareCardTitle}>Công nợ chưa thu</AppText>
              <AppText style={styles.squareCardValue}>{formatCurrency(outstandingDebt)}</AppText>
            </View>

            <AppText style={[styles.squareCardFooter, { color: outstandingDebt > 0 ? "#F43F5E" : "#10B981" }]}>
              {outstandingDebt > 0 ? "⚠️ Cần gửi thông báo nhắc nợ" : "✅ Đã quyết toán hết"}
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
              <View style={[styles.squareIconTile, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
                <Ionicons name="construct" size={18} color="#F59E0B" />
              </View>
              {pendingRepairs > 0 && <View style={styles.amberGlowDot} />}
            </View>

            <View style={{ marginTop: 8 }}>
              <AppText style={styles.squareCardTitle}>Sự cố & Sửa chữa</AppText>
              <AppText style={styles.squareCardValue}>{pendingRepairs} Yêu cầu</AppText>
            </View>

            <AppText style={[styles.squareCardFooter, { color: pendingRepairs > 0 ? "#F59E0B" : "#10B981" }]}>
              {pendingRepairs > 0 ? `${pendingRepairs} việc cần xử lý` : "✅ Hệ thống ổn định"}
            </AppText>
          </Pressable>
        </AnimatedEntry>
      </View>
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    bentoContainer: { gap: 14, marginVertical: 8 },
    topRow: { flexDirection: "row", gap: 12 },
    revenueCardWrap: { flex: 1.15 },
    occupancyCardWrap: { flex: 0.85 },

    revenueBentoCard: {
      backgroundColor: isDark ? theme.surface : "#FFFFFF",
      borderColor: isDark ? theme.border : "rgba(16, 185, 129, 0.2)",
      borderWidth: 1,
      borderRadius: 24,
      padding: 15,
      height: 200,
      justifyContent: "space-between",
      shadowColor: "#0F5247",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    bentoHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bentoEyebrow: {
      color: theme.muted,
      fontSize: 9.5,
      fontWeight: "900",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    growthBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
      borderColor: "rgba(16, 185, 129, 0.25)",
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 999,
    },
    growthText: { color: "#10B981", fontSize: 9.5, fontWeight: "900" },
    bigRevenueText: {
      color: theme.text,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.5,
      marginTop: 2,
    },
    waveContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 38,
      marginVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 82, 71, 0.08)",
      paddingBottom: 4,
    },
    waveCol: { flex: 1, alignItems: "center" },
    waveBar: { width: 7, borderRadius: 4 },
    emptyWaveRow: { flexDirection: "row", width: "100%", justifyContent: "space-around", alignItems: "flex-end", height: "100%" },

    revenueFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meterStatBadge: {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 82, 71, 0.06)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    meterStatText: { color: theme.muted, fontSize: 9.5, fontWeight: "800" },
    detailLink: { flexDirection: "row", alignItems: "center", gap: 3 },
    detailLinkText: { color: theme.primary, fontSize: 10, fontWeight: "900" },

    occupancyBentoCard: {
      backgroundColor: isDark ? theme.surface : "#FFFFFF",
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 24,
      padding: 15,
      height: 200,
      justifyContent: "space-between",
      shadowColor: "#0F5247",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    donutContainer: { alignItems: "center", justifyContent: "center", marginVertical: 2 },
    donutOuterRing: {
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    donutInnerCenter: { alignItems: "center", justifyContent: "center" },
    donutPercentText: { color: "#10B981", fontSize: 16, fontWeight: "900" },
    occupancyFooter: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    occMetaCol: { alignItems: "center" },
    occMetaVal: { color: theme.text, fontSize: 12.5, fontWeight: "900" },
    occMetaLbl: { color: theme.muted, fontSize: 9.5, fontWeight: "700" },
    occMetaDivider: { width: 1, height: 16, backgroundColor: theme.border },

    quickActionsBentoCard: {
      backgroundColor: isDark ? theme.surface : "#FFFFFF",
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 24,
      padding: 16,
      shadowColor: "#0F5247",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    actionCardsGrid: { gap: 8, marginTop: 10 },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      padding: 10,
      borderWidth: 1,
    },
    actionCardMint: {
      backgroundColor: isDark ? "rgba(16, 185, 129, 0.08)" : "#EEF9F5",
      borderColor: "rgba(16, 185, 129, 0.2)",
    },
    actionCardBlue: {
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.08)" : "#EFF6FF",
      borderColor: "rgba(59, 130, 246, 0.2)",
    },
    actionCardAmber: {
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.08)" : "#FFFAEB",
      borderColor: "rgba(245, 158, 11, 0.2)",
    },
    actionIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    actionCardBody: { flex: 1 },
    actionCardTitle: { color: theme.text, fontSize: 12.5, fontWeight: "900" },
    actionCardSub: { color: theme.muted, fontSize: 10.5, fontWeight: "600", marginTop: 1 },

    bottomRow: { flexDirection: "row", gap: 12 },
    halfBentoWrap: { flex: 1 },
    squareBentoCard: {
      backgroundColor: isDark ? theme.surface : "#FFFFFF",
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 24,
      padding: 15,
      height: 145,
      justifyContent: "space-between",
      shadowColor: "#0F5247",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    cardIconHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    squareIconTile: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    redGlowDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#F43F5E" },
    amberGlowDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#F59E0B" },
    squareCardTitle: { color: theme.muted, fontSize: 10.5, fontWeight: "800" },
    squareCardValue: { color: theme.text, fontSize: 17, fontWeight: "900", marginTop: 2 },
    squareCardFooter: { fontSize: 10, fontWeight: "800" },
  });
}
