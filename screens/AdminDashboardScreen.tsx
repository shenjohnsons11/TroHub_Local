import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { adminService, AdminDashboardStats } from "../services/adminService";
import TroHubLogo from "../components/TroHubLogo";

import { UserProfile } from "../types/UserProfile";

type Props = {
  profile?: UserProfile;
  onNavigate: (tab: any, params?: any) => void;
  onLogout: () => void;
};

export default function AdminDashboardScreen({ profile, onNavigate, onLogout }: Props) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.log("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  const formatRevenue = (value?: number) => {
    const amount = value || 0;
    return `${amount.toLocaleString("vi-VN")}đ`;
  };

  const occupancyRate = stats?.totalRooms
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />}
    >
      <View style={styles.brandRow}>
        <TroHubLogo compact />
        <Pressable style={styles.settingsButton} onPress={() => onNavigate("settings")}>
          <Ionicons name="settings-outline" size={26} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={styles.dashboardHero}>
        <Text style={styles.heroKicker}>TỔNG QUAN VẬN HÀNH</Text>
        <Text style={styles.heroTitle}>Xin chào, {(profile as any)?.fullName || (profile as any)?.name || "Chủ trọ"}</Text>
        <View style={styles.heroStats}>
          <View><Text style={styles.heroValue}>{occupancyRate}%</Text><Text style={styles.heroLabel}>Lấp đầy</Text></View>
          <View><Text style={styles.heroValue}>{stats?.pendingRepairs || 0}</Text><Text style={styles.heroLabel}>Sự cố chờ xử lý</Text></View>
        </View>
      </View>

      {/* Grid thống kê */}
      <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => onNavigate("rooms")}>
          <View style={[styles.iconContainer, { backgroundColor: "#FFF1E8" }]}>
            <Ionicons name="home" size={24} color={COLORS.orange} />
          </View>
          <Text style={styles.cardLabel}>Phòng trọ</Text>
          <Text style={styles.cardValue}>
            {stats?.occupiedRooms}/{stats?.totalRooms}
          </Text>
          <Text style={styles.cardSub}>{occupancyRate}% tỉ lệ lấp đầy</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => onNavigate("tenants")}>
          <View style={[styles.iconContainer, { backgroundColor: "#EAF9F1" }]}>
            <Ionicons name="people" size={24} color={COLORS.green} />
          </View>
          <Text style={styles.cardLabel}>Người thuê</Text>
          <Text style={styles.cardValue}>{stats?.totalTenants}</Text>
          <Text style={styles.cardSub}>Đang hoạt động</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => onNavigate("repair")}>
          <View style={[styles.iconContainer, { backgroundColor: "#FFF1F1" }]}>
            <Ionicons name="alert-circle" size={24} color={COLORS.red} />
          </View>
          <Text style={styles.cardLabel}>Sự cố</Text>
          <Text style={styles.cardValue}>{stats?.pendingRepairs}</Text>
          <Text style={styles.cardSub}>Đang chờ xử lý</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => onNavigate("invoice")}>
          <View style={[styles.iconContainer, { backgroundColor: "#E8F4FD" }]}>
            <Ionicons name="cash" size={24} color="#007AFF" />
          </View>
          <Text style={styles.cardLabel}>Doanh thu đã thu</Text>
          <Text style={styles.cardValue}>{formatRevenue(stats?.totalRevenue)}</Text>
          <Text style={styles.cardSub}>Tháng hiện tại</Text>
        </Pressable>
      </View>

      {/* Lối tắt nhanh */}
      <Text style={styles.sectionTitle}>Lối tắt nhanh</Text>
      <View style={styles.actionGrid}>
        <Pressable style={styles.actionButton} onPress={() => onNavigate("rooms", { action: "create" })}>
          <Ionicons name="add-circle-outline" size={26} color={COLORS.orange} />
          <Text style={styles.actionText}>Thêm phòng</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={() => onNavigate("contract", { action: "create" })}>
          <Ionicons name="document-text-outline" size={26} color={COLORS.orange} />
          <Text style={styles.actionText}>Tạo hợp đồng</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={() => onNavigate("invoice_bulk")}>
          <Ionicons name="receipt-outline" size={26} color={COLORS.orange} />
          <Text style={styles.actionText}>Tạo hóa đơn</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={() => onNavigate("repair")}>
          <Ionicons name="construct-outline" size={26} color={COLORS.orange} />
          <Text style={styles.actionText}>Xử lý sự cố</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  scrollContent: {
    padding: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  brandRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  dashboardHero: {
    minHeight: 206,
    justifyContent: "flex-end",
    marginBottom: 18,
    padding: 22,
    borderRadius: 16,
    backgroundColor: "#25292D",
  },
  heroKicker: { color: "#67D69A", fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginBottom: 10 },
  heroTitle: { maxWidth: 300, color: "#F4F5F3", fontSize: 27, lineHeight: 32, fontWeight: "900" },
  heroStats: { flexDirection: "row", gap: 28, marginTop: 22 },
  heroValue: { color: "#FF8D52", fontSize: 20, fontWeight: "900" },
  heroLabel: { color: "#B6BCC0", fontSize: 11, fontWeight: "700", marginTop: 2 },
  header: {
    flex: 1,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginVertical: 4,
  },
  cardSub: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "22%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
});
