import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminDashboardStats } from "../services/adminService";
import { UserProfile } from "../types/UserProfile";
import { useAppTheme } from "../contexts/ThemeContext";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import PriorityCard from "../components/calm-ops/PriorityCard";
import { getRealtimeGreeting } from "../utils/dateHelpers";
import MiniCalendarPopover from "../components/MiniCalendarPopover";
import TroHubWidgetView from "../components/widgets/TroHubWidgetView";
import { notificationService } from "../services/notificationService";
import { formatCurrency } from "../utils/formatters";

type Props = { profile?: UserProfile; onNavigate: (tab: any, params?: any) => void; onLogout: () => void };

export default function AdminDashboardScreen({ profile, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadStats = async () => {
    try {
      setStats(await adminService.getDashboardStats());
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    }
    catch (error) { console.log("Lỗi tải thống kê:", error); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void loadStats(); }, []);
  if (loading) return <AppLoadingScreen />;

  const name = profile?.fullName || (profile as any)?.name || "Chủ trọ";
  const occupancyRate = stats?.totalRooms ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;
  const quickActions = [
    ["Trợ lý AI 🤖", "sparkles-outline", () => onNavigate("ai_chat")],
    ["Thêm phòng", "add-circle-outline", () => onNavigate("rooms", { action: "create" })],
    ["Người thuê", "people-outline", () => onNavigate("tenants")],
    ["Tạo hợp đồng", "document-text-outline", () => onNavigate("contract", { action: "create" })],
    ["Xử lý sự cố", "construct-outline", () => onNavigate("repair")],
  ] as const;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadStats(); }} colors={[theme.primary]} tintColor={theme.primary} />}>
      <View style={styles.heading}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>TỔNG QUAN VẬN HÀNH</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {getRealtimeGreeting().slice(0, -1)} {name},
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{stats?.pendingRepairs || 0} việc cần xem hôm nay.</Text>
          <MiniCalendarPopover />
        </View>

        <View style={styles.headerActions}>
          {/* Trợ lý AI */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trợ lý AI"
            style={[styles.headerBtn, { backgroundColor: "#064E3B" }]}
            onPress={() => onNavigate("ai_chat")}
          >
            <Ionicons name="sparkles" size={20} color="#34D399" />
          </Pressable>

          {/* Quả chuông Thông báo */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}
            onPress={() => onNavigate("notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.danger }]}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Bánh răng Cài đặt */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở cài đặt"
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
            <Text style={[styles.propertyTitle, { color: theme.text }]}>🏠 Nhà trọ TroHub</Text>
            <Text style={[styles.propertyAddress, { color: theme.muted }]}>{profile.propertyAddress}</Text>
          </View>
        </View>
      ) : null}

      <AnimatedEntry>
        <GradientHero icon="wallet-outline" label="DOANH THU ĐÃ THU TRONG KỲ" value={formatCurrency(stats?.totalRevenue)} detail={`${stats?.occupiedRooms || 0}/${stats?.totalRooms || 0} phòng đang được thuê · ${occupancyRate}% lấp đầy`} />
      </AnimatedEntry>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Native Home Widget (4x2)</Text>
      <TroHubWidgetView
        size="medium"
        data={{
          totalRevenue: stats?.totalRevenue || 186883000,
          occupancyRate,
          occupiedRooms: stats?.occupiedRooms || 8,
          totalRooms: stats?.totalRooms || 10,
          outstandingDebt: 12500000,
          utilityReadingProgress: `${(stats?.occupiedRooms || 8) - 2}/${stats?.occupiedRooms || 8} phòng`,
          openRepairsCount: stats?.pendingRepairs || 2,
          lastSyncedAt: new Date().toISOString(),
        }}
        onNavigate={onNavigate}
        onScanCamera={() => onNavigate("scan_meter")}
      />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Cần xử lý</Text>
      <PriorityCard title="sửa chữa đang mở" count={stats?.pendingRepairs || 0} description="Tiếp nhận và cập nhật tiến độ cho người thuê." urgent={Boolean(stats?.pendingRepairs)} onPress={() => onNavigate("repair")} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Thao tác nhanh</Text>
      <View style={styles.quickRow}>{quickActions.map(([label, icon, onPress], index) => <AnimatedEntry key={label} delay={index * 45} style={styles.quickWrap}><Pressable accessibilityRole="button" onPress={onPress} style={[styles.quick, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}><View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name={icon} size={22} color={theme.primary} /></View><Text style={[styles.quickText, { color: theme.text }]}>{label}</Text></Pressable></AnimatedEntry>)}</View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Tổng quan</Text>
      <View style={styles.grid}>
        <Metric theme={theme} label="Phòng trọ" value={`${stats?.occupiedRooms || 0}/${stats?.totalRooms || 0}`} detail={`${occupancyRate}% lấp đầy`} icon="home-outline" />
        <Metric theme={theme} label="Người thuê" value={stats?.totalTenants || 0} detail="Đang hoạt động" icon="people-outline" />
        <Metric theme={theme} label="Sửa chữa" value={stats?.pendingRepairs || 0} detail="Đang mở" icon="construct-outline" urgent />
      </View>
    </ScrollView>
  );
}

function Metric({ theme, label, value, detail, icon, urgent = false }: { theme: any; label: string; value: React.ReactNode; detail: string; icon: React.ComponentProps<typeof Ionicons>["name"]; urgent?: boolean }) {
  const accent = urgent ? theme.warning : theme.primary;
  return <AnimatedEntry style={styles.metricWrap}><View style={[styles.metric, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}><View style={[styles.metricIcon, { backgroundColor: urgent ? theme.warningSoft : theme.primarySoft }]}><Ionicons name={icon} size={20} color={accent} /></View><Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.metricDetail, { color: urgent ? accent : theme.muted }]}>{detail}</Text></View></AnimatedEntry>;
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
  metricWrap: { width: "48%" },
  metric: { minHeight: 154, padding: 16, borderRadius: 22, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 11 },
  metricIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  metricValue: { marginTop: 16, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  metricLabel: { marginTop: 3, fontSize: 12, fontWeight: "800" },
  metricDetail: { marginTop: 5, fontSize: 11, lineHeight: 16 },
});
