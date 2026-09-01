import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminDashboardStats } from "../services/adminService";
import { UserProfile } from "../types/UserProfile";
import { useAppTheme } from "../contexts/ThemeContext";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import PriorityCard from "../components/calm-ops/PriorityCard";
import MiniCalendarPopover from "../components/MiniCalendarPopover";
import { notificationService } from "../services/notificationService";
import { formatCurrency } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";
import TroHubLogo from "../components/TroHubLogo";
import VisualAnalyticsDashboard from "../components/VisualAnalyticsDashboard";
import BentoGridDashboard from "../components/BentoGridDashboard";
import StandardOperationsDashboard from "../components/StandardOperationsDashboard";
import AutomationStatusCard from "../components/AutomationStatusCard";
import QuickAutoBillingModal from "../components/QuickAutoBillingModal";
import FeatureSearchModal from "../components/FeatureSearchModal";

type Props = { profile?: UserProfile; refreshKey?: number; onNavigate: (tab: any, params?: any) => void; onLogout: () => void };

export default function AdminDashboardScreen({ profile, refreshKey = 0, onNavigate }: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewMode, setViewMode] = useState<"standard" | "analytics" | "bento">("bento");
  const [months, setMonths] = useState<6 | 12>(6);
  const [error, setError] = useState(false);
  const [automationVisible, setAutomationVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);


  const loadStats = async () => {
    try {
      setError(false);
      setStats(await adminService.getDashboardStats(months));
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    }
    catch (error) { console.log("Lỗi tải thống kê:", error); setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void loadStats(); }, [refreshKey, months]);
  if (loading) return <AppLoadingScreen />;
  if (error || !stats) return <View style={[styles.errorState, { backgroundColor: theme.background }]}><Ionicons name="cloud-offline-outline" size={34} color={theme.primary} /><AppText style={[styles.errorTitle, { color: theme.text }]}>Không thể tải Dashboard</AppText><Pressable onPress={() => { setLoading(true); void loadStats(); }} style={[styles.retry, { backgroundColor: theme.primary }]}><AppText style={[styles.retryText, { color: theme.background }]}>Thử lại</AppText></Pressable></View>;

  const name = profile?.fullName || (profile as any)?.name || t("dashboard.greetingFallback");
  const hour = new Date().getHours();
  const greetingKey = hour >= 5 && hour < 12 ? "dashboard.morning" : hour >= 12 && hour < 18 ? "dashboard.afternoon" : "dashboard.evening";
  const totalRooms = stats?.totalRooms || 0;
  const occupiedRooms = stats?.occupiedRooms || 0;
  const vacantRooms = stats?.vacantRooms || Math.max(0, totalRooms - occupiedRooms);
  const maintenanceRooms = stats?.maintenanceRooms || 0;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const quickActions = [
    [`${t("dashboard.aiAssistant")} 🤖`, "sparkles-outline", () => onNavigate("ai_chat")],
    [t("dashboard.scanMeter"), "camera-outline", () => onNavigate("scan_meter")],
    [t("dashboard.addRoom"), "add-circle-outline", () => onNavigate("rooms", { action: "create" })],
    [t("dashboard.tenantList"), "people-outline", () => onNavigate("tenants")],
    [t("dashboard.createContract"), "document-text-outline", () => onNavigate("contract", { action: "create" })],
    [t("dashboard.handleRepair"), "construct-outline", () => onNavigate("repair")],
  ] as const;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadStats(); }} colors={[theme.primary]} tintColor={theme.primary} />}>
      <View style={styles.heading}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ marginBottom: 6 }}>
            <TroHubLogo compact />
          </View>
          <AppText style={[styles.eyebrow, { color: theme.primary }]}>{t("dashboard.eyebrow")}</AppText>
          <AppText style={[styles.title, { color: theme.text }]}>
            {t(greetingKey)} {name},
          </AppText>
          <AppText style={[styles.subtitle, { color: theme.muted }]}>{t("dashboard.pendingToday", { count: stats?.pendingRepairs || 0 })}</AppText>
          <MiniCalendarPopover />
        </View>

        <View style={styles.headerActions}>
          {/* Nút Tìm kiếm chức năng */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm chức năng"
            style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}
            onPress={() => setSearchModalVisible(true)}
          >
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </Pressable>

          {/* Quả chuông Thông báo */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nav.notifications")}
            style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}
            onPress={() => onNavigate("notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.danger }]}>
                <AppText style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </AppText>
              </View>
            )}
          </Pressable>

          {/* Bánh răng Cài đặt */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nav.settings")}
            style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}
            onPress={() => onNavigate("settings")}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {profile?.propertyAddress ? (
        <View style={[styles.propertyBanner, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="location-outline" size={18} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <AppText style={[styles.propertyTitle, { color: theme.text }]}>{t("dashboard.property")}</AppText>
            <AppText style={[styles.propertyAddress, { color: theme.muted }]}>{profile.propertyAddress}</AppText>
          </View>
        </View>
      ) : null}

      {/* Segmented Mode Switcher (Matching WebAdmin) */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: isDark ? theme.surface : "#EDF3EF",
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 4,
          marginBottom: 14,
        }}
      >
        <Pressable
          accessibilityRole="button"
          style={[
            { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", justifyContent: "center" },
            viewMode === "bento" && {
              backgroundColor: isDark ? "#B8F5DA" : "#0F5247",
              shadowColor: "#0F5247",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
          onPress={() => setViewMode("bento")}
        >
          <AppText
            style={[
              { fontSize: 11.5, fontWeight: "800", color: isDark ? "#A5BCB1" : "#52635C" },
              viewMode === "bento" && { color: isDark ? "#04100E" : "#FFFFFF", fontWeight: "900" },
            ]}
          >
            {t("dashboard.viewBento")}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[
            { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", justifyContent: "center" },
            viewMode === "analytics" && {
              backgroundColor: isDark ? "#B8F5DA" : "#0F5247",
              shadowColor: "#0F5247",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
          onPress={() => setViewMode("analytics")}
        >
          <AppText
            style={[
              { fontSize: 11.5, fontWeight: "800", color: isDark ? "#A5BCB1" : "#52635C" },
              viewMode === "analytics" && { color: isDark ? "#04100E" : "#FFFFFF", fontWeight: "900" },
            ]}
          >
            {t("dashboard.viewReport")}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[
            { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", justifyContent: "center" },
            viewMode === "standard" && {
              backgroundColor: isDark ? "#B8F5DA" : "#0F5247",
              shadowColor: "#0F5247",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
          onPress={() => setViewMode("standard")}
        >
          <AppText
            style={[
              { fontSize: 11.5, fontWeight: "800", color: isDark ? "#A5BCB1" : "#52635C" },
              viewMode === "standard" && { color: isDark ? "#04100E" : "#FFFFFF", fontWeight: "900" },
            ]}
          >
            {t("dashboard.viewStandard")}
          </AppText>
        </Pressable>
      </View>

      <AutomationStatusCard policy={stats.automation} onConfigure={() => setAutomationVisible(true)} compact />

      {viewMode === "bento" ? (
        <BentoGridDashboard stats={stats} onNavigate={onNavigate} />
      ) : viewMode === "analytics" ? (
        <VisualAnalyticsDashboard stats={stats} months={months} onMonthsChange={setMonths} onNavigate={onNavigate} />
      ) : (
        <StandardOperationsDashboard stats={stats} onNavigate={onNavigate} />
      )}

      {viewMode === "bento" ? <><AppText style={[styles.sectionTitle, { color: theme.text }]}>{t("dashboard.today")}</AppText><PriorityCard title={t("dashboard.repairs")} count={stats.pendingRepairs} description={t("dashboard.repairHint")} urgent={Boolean(stats.pendingRepairs)} onPress={() => onNavigate("repair")} /><AppText style={[styles.sectionTitle, { color: theme.text }]}>{t("dashboard.quickActions")}</AppText><View style={styles.quickRow}>{quickActions.map(([label, icon, onPress], index) => <AnimatedEntry key={label} delay={index * 45} style={styles.quickWrap}><Pressable accessibilityRole="button" onPress={onPress} style={[styles.quick, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}><View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name={icon} size={22} color={theme.primary} /></View><AppText style={[styles.quickText, { color: theme.text }]}>{label}</AppText></Pressable></AnimatedEntry>)}</View></> : null}
      <QuickAutoBillingModal visible={automationVisible} policy={stats.automation} onClose={() => setAutomationVisible(false)} onSaved={(automation) => setStats((current) => current ? { ...current, automation: { ...automation, issueTime: current.automation.issueTime } } : current)} />
      <FeatureSearchModal
        visible={searchModalVisible}
        role={1}
        onClose={() => setSearchModalVisible(false)}
        onSelectFeature={(tab, params) => onNavigate(tab, params)}
      />
    </ScrollView>
  );
}

function Metric({ theme, label, value, detail, icon, urgent = false, danger = false, onPress }: { theme: any; label: string; value: React.ReactNode; detail: string; icon: React.ComponentProps<typeof Ionicons>["name"]; urgent?: boolean; danger?: boolean; onPress?: () => void }) {
  const accent = danger ? theme.danger : urgent ? theme.warning : theme.primary;
  return (
    <AnimatedEntry style={styles.metricWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.metric,
          { backgroundColor: theme.surfaceElevated, shadowColor: theme.text, opacity: pressed && onPress ? 0.8 : 1 }
        ]}
      >
        <View style={[styles.metricIcon, { backgroundColor: urgent ? theme.warningSoft : theme.primarySoft }]}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <AppText style={[styles.metricValue, { color: theme.text }]}>{value}</AppText>
        <AppText style={[styles.metricLabel, { color: theme.text }]}>{label}</AppText>
        <AppText style={[styles.metricDetail, { color: urgent ? accent : theme.muted }]}>{detail}</AppText>
      </Pressable>
    </AnimatedEntry>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 36 },
  heading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  propertyBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 18, padding: 14, marginBottom: 18 },
  propertyTitle: { fontSize: 13, fontWeight: "900" },
  propertyAddress: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, elevation: 4, shadowOpacity: .12, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10, position: "relative" },
  unreadBadge: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { color: "#ffffff", fontSize: 9, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginTop: 26, marginBottom: 12 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  quickWrap: { width: "48%" },
  quick: { width: "100%", minHeight: 104, alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 20, elevation: 3, shadowOpacity: .1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 9 },
  quickIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  quickText: { fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "center", marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricWrap: { width: "48%" },
  metric: { minHeight: 154, padding: 16, borderRadius: 22, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 11 },
  metricIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  metricValue: { marginTop: 16, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  metricLabel: { marginTop: 3, fontSize: 12, fontWeight: "800" },
  metricDetail: { marginTop: 5, fontSize: 11, lineHeight: 16 },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, errorTitle: { fontSize: 18, fontWeight: "900", marginTop: 12 }, retry: { borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, marginTop: 16 }, retryText: { fontSize: 12, fontWeight: "900" },
});
