import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { homeService } from "../services/homeService";
import { Invite, inviteService } from "../services/inviteService";
import { HomeData } from "../types/HomeData";
import TroHubLogo from "../components/TroHubLogo";
import { Ionicons } from "@expo/vector-icons";
import { notificationService } from "../services/notificationService";
import StatusBadge from "../components/calm-ops/StatusBadge";
import SectionHeader from "../components/calm-ops/SectionHeader";
import GradientHero from "../components/ui/GradientHero";
import { getRealtimeGreeting } from "../utils/dateHelpers";
import MiniCalendarPopover from "../components/MiniCalendarPopover";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import TenantPersonalTimeline from "../components/TenantPersonalTimeline";
import { formatCurrency, formatPhone, unformatNumber } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";

import { UserProfile } from "../types/UserProfile";
import TenantRoomSwitcher from "../components/TenantRoomSwitcher";

type Props = {
  profile?: UserProfile | null;
  refreshKey: number;
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  onNavigate: (screen: "invoice" | "repair" | "contract" | "utility" | "notifications" | "ai_chat", params?: any) => void;
  onOpenSearch?: () => void;
  onLogout: () => void;
};

export default function HomeScreen({ profile, refreshKey, selectedRoomId, onRoomSelect, onNavigate, onOpenSearch, onLogout }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(theme);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadHomeData();
  }, [refreshKey, selectedRoomId]);

  const checkNotifications = async () => {
    try {
      setUnreadCount(await notificationService.getUnreadCount());
    } catch {
      setUnreadCount(0);
    }
  };

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      const [data, inviteData] = await Promise.all([
        homeService.getHomeData(selectedRoomId),
        inviteService.getInvites(),
      ]);
      setHomeData(data);
      if (!selectedRoomId) {
        const firstRoom = data.contracts.find((contract) => ["active", "reserved", "requesting_termination"].includes(contract.status) && contract.roomId)?.roomId;
        if (firstRoom) onRoomSelect(firstRoom);
      }
      setInvites(inviteData);
    } catch (error) {
      console.log("Lỗi load trang chủ:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      checkNotifications();
    }
  };

  if (isLoading || !homeData) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const handleAcceptInvite = async (id: string) => {
    const success = await inviteService.acceptInvite(id);
    if (success) loadHomeData();
  };

  const handleRejectInvite = async (id: string) => {
    const success = await inviteService.rejectInvite(id);
    if (success) loadHomeData();
  };

  const isUnpaid = homeData.paymentStatus === "unpaid";
  const openPropertyMap = () => {
    const destination = homeData.propertyLatitude != null && homeData.propertyLongitude != null
      ? `${homeData.propertyLatitude},${homeData.propertyLongitude}`
      : homeData.propertyAddress;
    if (destination) void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`);
  };

  const userDisplayName =
    (profile?.fullName && profile.fullName !== t("mobile.home.tenantFallback") && profile.fullName.trim())
      ? profile.fullName.trim()
      : (homeData?.tenantName && homeData.tenantName !== t("mobile.home.tenantFallback") && homeData.tenantName.trim())
        ? homeData.tenantName.trim()
        : profile?.phone || t("mobile.home.you");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <TroHubLogo compact />
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.search") || "Tìm kiếm"}
            onPress={onOpenSearch || (() => onNavigate("ai_chat"))}
            style={styles.bellButton}
          >
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mobile.home.unread", { count: unreadCount })}
            onPress={() => onNavigate("notifications")}
            style={styles.bellButton}
          >

            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <AppText style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</AppText>
              </View>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nav.settings")}
            onPress={() => onNavigate("account" as any)}
            style={styles.bellButton}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <TenantRoomSwitcher contracts={homeData.contracts} selectedRoomId={selectedRoomId || homeData.activeContract?.roomId} onSelect={onRoomSelect} />

      <View style={styles.homeHero}>
        <AppText style={styles.heroKicker}>{t("mobile.home.hero")}</AppText>
        <AppText style={styles.heroTitle}>
          {getRealtimeGreeting().slice(0, -1)}, {userDisplayName}
        </AppText>
        <AppText style={styles.heroRoom}>
          {homeData.room === t("mobile.home.noRoom") ? t("mobile.home.noRoom") : t("mobile.home.room", { room: homeData.room })}
        </AppText>
        <MiniCalendarPopover />
      </View>

      <TenantPersonalTimeline
        myInvoices={homeData.myInvoices}
        activeContract={homeData.activeContract}
        activeRepairs={homeData.activeRepairs}
        onNavigate={onNavigate}
      />

      {homeData.propertyAddress ? (
        <Card style={styles.propertyCard}>
          <AppText style={[styles.propertyTitle, { color: theme.text }]}>{t("dashboard.property")}</AppText>
          <AppText style={[styles.propertyAddress, { color: theme.muted }]}>{homeData.propertyAddress}</AppText>
          <Pressable accessibilityRole="button" onPress={openPropertyMap} style={[styles.mapButton, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="map-outline" size={18} color={theme.primary} />
            <AppText style={[styles.mapButtonText, { color: theme.primary }]}>{t("common.openMaps")}</AppText>
          </Pressable>
        </Card>
      ) : null}

      {invites.length > 0 && invites.map((invite, index) => (
        <AnimatedEntry delay={index * 40} key={invite.id}>
        <Card style={[styles.amountCard, styles.inviteCard]}>
          <AppText style={[styles.cardTitle, { color: theme.warningForeground, marginBottom: 4 }]}>{t("mobile.home.inviteTitle")}</AppText>
          <AppText style={styles.smallText}>
            {t("mobile.home.inviteMessage", { name: invite.landlordName, phone: formatPhone(invite.phone) })}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
              onPress={() => handleAcceptInvite(invite.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.background} />
              <AppText style={styles.primaryText}>{t("mobile.home.accept")}</AppText>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => handleRejectInvite(invite.id)}
            >
              <Ionicons name="close-circle-outline" size={18} color={theme.warningForeground} />
              <AppText style={[styles.primaryText, { color: theme.warningForeground }]}>{t("mobile.home.reject")}</AppText>
            </Pressable>
          </View>
        </Card>
        </AnimatedEntry>
      ))}

      <AnimatedEntry delay={60}>
        <GradientHero
          actionIcon="card-outline"
          actionLabel={isUnpaid ? t("mobile.home.pay") : undefined}
          detail={t("mobile.home.due", { status: homeData.paymentStatusText, date: homeData.dueDate })}
          icon="wallet-outline"
          label={t("mobile.home.invoice")}
          onAction={isUnpaid ? () => onNavigate("invoice") : undefined}
          value={formatCurrency(unformatNumber(homeData.totalAmount))}
        />
      </AnimatedEntry>

      <AnimatedEntry delay={80}>
        <Pressable onPress={() => onNavigate("ai_chat")}>
          <Card style={[styles.infoCard, { backgroundColor: "#064E3B", borderColor: "rgba(16, 185, 129, 0.4)", borderWidth: 1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#042F2E", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={20} color="#34D399" />
                </View>
                <View>
                  <AppText style={[styles.cardTitle, { color: "#ECFDF5", marginBottom: 2 }]}>{t("mobile.home.aiTitle")}</AppText>
                  <AppText style={{ fontSize: 12, color: "#A7F3D0" }}>{t("mobile.home.aiDescription")}</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#34D399" />
            </View>
          </Card>
        </Pressable>
      </AnimatedEntry>

      <SectionHeader title={t("mobile.home.utilities")} />

      <AnimatedEntry delay={100} style={styles.quickGrid}>
        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("contract")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="document-text-outline" size={22} color={theme.primary} /></View>
            <AppText style={styles.quickText}>{t("mobile.home.contract")}</AppText>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("utility")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="water-outline" size={22} color={theme.primary} /></View>
            <AppText style={styles.quickText}>{t("mobile.home.utility")}</AppText>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("repair")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="construct-outline" size={22} color={theme.primary} /></View>
            <AppText style={styles.quickText}>{t("mobile.home.repair")}</AppText>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("invoice")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="receipt-outline" size={22} color={theme.primary} /></View>
            <AppText style={styles.quickText}>{t("mobile.home.invoiceShort")}</AppText>
          </Card>
        </Pressable>
      </AnimatedEntry>

      <AnimatedEntry delay={140}>
      <Pressable onPress={() => onNavigate("contract")}>
        <Card style={styles.infoCard}>
          <AppText style={styles.cardTitle}>{t("mobile.home.contract")}</AppText>
          <AppText style={styles.cardDesc}>
            {t("mobile.home.expires", { date: homeData.contractEndDate })}
          </AppText>
        </Card>
      </Pressable>
      </AnimatedEntry>

      <AnimatedEntry delay={180}>
      <Pressable onPress={() => onNavigate("repair")}>
        <Card style={styles.infoCard}>
          <AppText style={styles.cardTitle}>{homeData.recentRepair.title}</AppText>
          <StatusBadge label={homeData.recentRepair.status || t("mobile.home.processing")} />
        </Card>
      </Pressable>
      </AnimatedEntry>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 26,
  },
  header: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
    marginTop: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 6,
    right: 8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  homeHero: {
    minHeight: 176,
    justifyContent: "flex-end",
    marginBottom: 18,
    padding: 22,
    borderRadius: 16,
    backgroundColor: theme.primarySoft,
  },
  propertyCard: { marginBottom: 18, padding: 16 },
  propertyTitle: { fontSize: 14, fontWeight: "900" },
  propertyAddress: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  mapButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, marginTop: 12, minHeight: 42, paddingHorizontal: 12 },
  mapButtonText: { fontSize: 12, fontWeight: "900" },
  heroKicker: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heroTitle: {
    maxWidth: 270,
    color: theme.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
  },
  heroRoom: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 44,
    height: 44,
    justifyContent: "center",
    borderRadius: 16,
  },
  hello: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    color: theme.text,
  },
  room: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 4,
  },
  amountCard: {
    marginBottom: 18,
    backgroundColor: theme.surface,
    borderColor: "transparent",
  },
  inviteCard: {
    backgroundColor: theme.warningSoft,
  },
  smallText: {
    fontSize: 13,
    color: theme.muted,
  },
  amount: {
    fontSize: 31,
    fontWeight: "900",
    color: theme.text,
    marginTop: 10,
    marginBottom: 4,
  },
  unpaid: {
    color: theme.warningForeground,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  paid: {
    color: theme.positive,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  primaryButton: {
    height: 46,
    backgroundColor: theme.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: {
    color: theme.background,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.surfaceElevated,
    borderRadius: 16,
    flexDirection: "row",
    gap: 7,
    height: 46,
    justifyContent: "center",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 18,
  },
  quickItem: {
    flex: 1,
  },
  quickCard: {
    height: 84,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: theme.primarySoft,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  quickText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.text,
    textAlign: "center",
  },
  infoCard: {
    marginBottom: 14,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 8,
  },
  cardDesc: {
    color: theme.muted,
    fontSize: 13,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E6FAFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeText: {
    color: "#00A2C7",
    fontSize: 12,
    fontWeight: "800",
  },
});
