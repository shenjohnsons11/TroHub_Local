import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "./ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import AnimatedEntry from "./ui/AnimatedEntry";
import FeatureIconBox from "./ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";
import { HomeData } from "../types/HomeData";
import { formatCurrency, unformatNumber } from "../utils/formatters";

type Props = {
  homeData: HomeData;
  onNavigate: (screen: "invoice" | "repair" | "contract" | "utility", params?: any) => void;
  openPropertyMap: () => void;
};

export default function TenantBentoDashboard({ homeData, onNavigate, openPropertyMap }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(theme);

  const isUnpaid = homeData.paymentStatus === "unpaid";
  const numAmount = unformatNumber(homeData.totalAmount);
  const activeRepairsCount = homeData.activeRepairs?.length || 0;
  const recentRepairTitle =
    homeData.recentRepair?.title && homeData.recentRepair.title !== "Không có yêu cầu sửa chữa"
      ? homeData.recentRepair.title
      : "Thiết bị ổn định";

  return (
    <View style={styles.bentoContainer}>
      {/* Top Row: Asymmetric 2 Cards */}
      <View style={styles.topRow}>
        {/* Card 1: Hóa đơn & Tiền phòng (Linear Gradient) */}
        <AnimatedEntry delay={100} style={styles.invoiceCardWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hóa đơn kỳ này"
            style={styles.invoiceBentoCard}
            onPress={() => onNavigate("invoice")}
          >
            <LinearGradient
              colors={
                isUnpaid
                  ? ["rgba(239, 68, 68, 0.28)", "rgba(127, 29, 29, 0.7)"]
                  : ["rgba(16, 185, 129, 0.22)", "rgba(6, 78, 59, 0.6)"]
              }
              style={styles.cardGradient}
            >
              <View style={styles.bentoHeaderRow}>
                <AppText style={styles.bentoEyebrow}>HÓA ĐƠN KỲ NÀY</AppText>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isUnpaid
                        ? "rgba(239, 68, 68, 0.25)"
                        : "rgba(16, 185, 129, 0.2)",
                    },
                  ]}
                >
                  <Ionicons
                    name={isUnpaid ? "time-outline" : "checkmark-circle"}
                    size={11}
                    color={isUnpaid ? "#F87171" : "#10B981"}
                  />
                  <AppText
                    style={[
                      styles.statusBadgeText,
                      { color: isUnpaid ? "#F87171" : "#10B981" },
                    ]}
                  >
                    {isUnpaid ? "Chưa nộp" : "Đã thanh toán"}
                  </AppText>
                </View>
              </View>

              <View style={styles.amountMiddle}>
                <AppText style={styles.bigAmountText}>
                  {formatCurrency(numAmount)}
                </AppText>
                <AppText style={styles.dueText}>
                  {isUnpaid
                    ? `Hạn nộp: ${homeData.dueDate}`
                    : "Không còn dư nợ phòng"}
                </AppText>
              </View>

              <View
                style={[
                  styles.actionPill,
                  isUnpaid && { backgroundColor: theme.primary },
                ]}
              >
                <Ionicons
                  name={isUnpaid ? "card-outline" : "receipt-outline"}
                  size={12}
                  color={isUnpaid ? theme.background : "#34D399"}
                />
                <AppText
                  style={[
                    styles.actionPillText,
                    isUnpaid && { color: theme.background, fontWeight: "900" },
                  ]}
                >
                  {isUnpaid ? "Thanh toán ngay" : "Lịch sử hóa đơn"}
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={isUnpaid ? theme.background : "#34D399"}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </AnimatedEntry>

        {/* Card 2: Phòng thuê & Hợp đồng */}
        <AnimatedEntry delay={150} style={styles.roomCardWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Phòng thuê và hợp đồng"
            style={styles.roomBentoCard}
            onPress={() => onNavigate("contract")}
          >
            <View style={styles.bentoHeaderRow}>
              <AppText style={styles.bentoEyebrow}>PHÒNG THUÊ</AppText>
              <Ionicons name="chevron-forward" size={14} color={theme.muted} />
            </View>

            {/* Glowing Room Circle */}
            <View style={styles.donutContainer}>
              <View
                style={[
                  styles.donutOuterRing,
                  { borderColor: "rgba(16, 185, 129, 0.28)" },
                ]}
              >
                <View style={styles.donutInnerCenter}>
                  <AppText style={styles.roomNumberText}>
                    {homeData.room && homeData.room !== "Chưa có phòng"
                      ? homeData.room
                      : "--"}
                  </AppText>
                  <AppText style={styles.roomStatusSub}>Đang ở</AppText>
                </View>
              </View>
            </View>

            <View style={styles.roomFooter}>
              <View style={styles.roomMetaCol}>
                <AppText style={styles.roomMetaVal}>
                  {homeData.activeContract?.remainingMonths != null
                    ? `${homeData.activeContract.remainingMonths} tháng`
                    : "Hợp đồng"}
                </AppText>
                <AppText style={styles.roomMetaLbl}>
                  {homeData.contractEndDate !== "Không có"
                    ? `HSD: ${homeData.contractEndDate}`
                    : "Đang hiệu lực"}
                </AppText>
              </View>
            </View>
          </Pressable>
        </AnimatedEntry>
      </View>

      {/* Middle Row: Quick Actions Bento Pills */}
      <AnimatedEntry delay={200}>
        <View style={styles.quickActionsBentoCard}>
          <AppText style={styles.bentoEyebrow}>TIỆN ÍCH NHANH</AppText>
          <View style={styles.actionPillsGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.home.utility")}
              style={styles.quickTile}
              onPress={() => onNavigate("utility")}
            >
              <FeatureIconBox token={FEATURE_ICONS.utility} size={18} />
              <AppText style={styles.quickTileText}>{t("mobile.home.utility")}</AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.home.repair")}
              style={styles.quickTile}
              onPress={() => onNavigate("repair")}
            >
              <FeatureIconBox token={FEATURE_ICONS.repairs} size={18} />
              <AppText style={styles.quickTileText}>{t("mobile.home.repair")}</AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.home.contract")}
              style={styles.quickTile}
              onPress={() => onNavigate("contract")}
            >
              <FeatureIconBox token={FEATURE_ICONS.contractCreate} size={18} />
              <AppText style={styles.quickTileText}>{t("mobile.home.contract")}</AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.home.invoiceShort")}
              style={styles.quickTile}
              onPress={() => onNavigate("invoice")}
            >
              <FeatureIconBox token={FEATURE_ICONS.invoiceCreate} size={18} />
              <AppText style={styles.quickTileText}>{t("mobile.home.invoiceShort")}</AppText>
            </Pressable>
          </View>
        </View>
      </AnimatedEntry>

      {/* Bottom Row: 2 Equal Square Bento Cards */}
      <View style={styles.bottomRow}>
        {/* Card 1: Địa chỉ & Nhà trọ */}
        <AnimatedEntry delay={250} style={styles.halfBentoWrap}>
          <View style={styles.squareBentoCard}>
            <View style={styles.cardIconHeader}>
              <FeatureIconBox token={FEATURE_ICONS.rooms} size={18} />
              <View style={styles.verifiedDotWrap}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <AppText style={styles.verifiedDotText}>Đang thuê</AppText>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <AppText style={styles.squareCardTitle}>Nhà trọ TroHub</AppText>
              <AppText numberOfLines={2} style={styles.propertyAddressText}>
                {homeData.propertyAddress || "TroHub Co-living"}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.openMaps")}
              onPress={openPropertyMap}
              style={({ pressed }) => [
                styles.mapBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="map-outline" size={13} color={theme.primary} />
              <AppText style={[styles.mapBtnText, { color: theme.primary }]}>
                {t("common.openMaps")}
              </AppText>
              <Ionicons name="open-outline" size={12} color={theme.primary} />
            </Pressable>
          </View>
        </AnimatedEntry>

        {/* Card 2: Sự cố & Sửa chữa */}
        <AnimatedEntry delay={300} style={styles.halfBentoWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sự cố và sửa chữa"
            style={styles.squareBentoCard}
            onPress={() => onNavigate("repair")}
          >
            <View style={styles.cardIconHeader}>
              <FeatureIconBox token={FEATURE_ICONS.repairs} size={18} />
              {activeRepairsCount > 0 ? (
                <View style={styles.amberGlowDot} />
              ) : (
                <View style={styles.greenGlowDot} />
              )}
            </View>

            <View style={{ marginTop: 8 }}>
              <AppText style={styles.squareCardTitle}>Sự cố & Sửa chữa</AppText>
              <AppText style={styles.squareCardValue}>
                {activeRepairsCount > 0
                  ? `${activeRepairsCount} yêu cầu`
                  : "Bình thường"}
              </AppText>
            </View>

            <View style={styles.repairFooterRow}>
              <Ionicons name="build-outline" size={13} color={theme.muted} />
              <AppText numberOfLines={1} style={styles.repairCategoryText}>
                {activeRepairsCount > 0 ? "Đang xử lý" : recentRepairTitle}
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
    invoiceCardWrap: { flex: 1.25 },
    roomCardWrap: { flex: 0.85 },
    invoiceBentoCard: {
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
    bentoHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bentoEyebrow: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    statusBadgeText: { fontSize: 10, fontWeight: "900" },
    amountMiddle: { marginVertical: 4 },
    bigAmountText: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    dueText: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 4,
    },
    actionPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    actionPillText: { color: theme.text, fontSize: 10, fontWeight: "800" },
    roomBentoCard: {
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
      borderWidth: 1,
      borderColor: theme.border,
    },
    donutContainer: { alignItems: "center", justifyContent: "center" },
    donutOuterRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    donutInnerCenter: { alignItems: "center", justifyContent: "center" },
    roomNumberText: { color: theme.text, fontSize: 18, fontWeight: "900" },
    roomStatusSub: {
      color: "#10B981",
      fontSize: 10,
      fontWeight: "800",
      marginTop: 1,
    },
    roomFooter: { alignItems: "center" },
    roomMetaCol: { alignItems: "center" },
    roomMetaVal: { color: theme.text, fontSize: 12, fontWeight: "900" },
    roomMetaLbl: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },
    quickActionsBentoCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 24,
      padding: 16,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionPillsGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
    quickTile: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    quickTileText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    bottomRow: { flexDirection: "row", gap: 12 },
    halfBentoWrap: { flex: 1 },
    squareBentoCard: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 24,
      padding: 16,
      height: 165,
      justifyContent: "space-between",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardIconHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    verifiedDotWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
    },
    verifiedDotText: { color: "#10B981", fontSize: 9, fontWeight: "800" },
    squareCardTitle: { color: theme.text, fontSize: 13, fontWeight: "900" },
    propertyAddressText: {
      color: theme.muted,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 4,
      fontWeight: "600",
    },
    mapBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: theme.primarySoft,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    mapBtnText: { fontSize: 11, fontWeight: "800" },
    amberGlowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#F59E0B",
    },
    greenGlowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#10B981",
    },
    squareCardValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 4,
    },
    repairFooterRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    repairCategoryText: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: "700",
      flex: 1,
    },
  });
}
