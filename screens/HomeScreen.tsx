import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { formatPhone } from "../utils/formatters";

type Props = {
  refreshKey: number;
  onNavigate: (screen: "invoice" | "repair" | "contract" | "utility" | "notifications") => void;
  onLogout: () => void;
};

export default function HomeScreen({ refreshKey, onNavigate, onLogout }: Props) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadHomeData();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const checkNotifications = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      const [data, inviteData] = await Promise.all([
        homeService.getHomeData(),
        inviteService.getInvites(),
      ]);
      setHomeData(data);
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
            accessibilityLabel="Đăng xuất"
            onPress={onLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.warningForeground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            onPress={() => onNavigate("notifications")}
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.homeHero}>
        <Text style={styles.heroKicker}>KHÔNG GIAN CỦA BẠN</Text>
        <Text style={styles.heroTitle}>
          {getRealtimeGreeting().slice(0, -1)}, {homeData.tenantName}
        </Text>
        <Text style={styles.heroRoom}>
          {homeData.room === "Chưa có phòng" ? "Chưa có phòng" : `Phòng ${homeData.room}`}
        </Text>
        <MiniCalendarPopover />
      </View>

      {invites.length > 0 && invites.map((invite, index) => (
        <AnimatedEntry delay={index * 40} key={invite.id}>
        <Card style={[styles.amountCard, styles.inviteCard]}>
          <Text style={[styles.cardTitle, { color: theme.warningForeground, marginBottom: 4 }]}>Lời mời vào nhà trọ</Text>
          <Text style={styles.smallText}>
            Chủ trọ <Text style={{fontWeight: 'bold'}}>{invite.landlordName}</Text> ({formatPhone(invite.phone)}) vừa thêm bạn vào danh sách quản lý.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
              onPress={() => handleAcceptInvite(invite.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.background} />
              <Text style={styles.primaryText}>Chấp nhận</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => handleRejectInvite(invite.id)}
            >
              <Ionicons name="close-circle-outline" size={18} color={theme.warningForeground} />
              <Text style={[styles.primaryText, { color: theme.warningForeground }]}>Từ chối</Text>
            </Pressable>
          </View>
        </Card>
        </AnimatedEntry>
      ))}

      <AnimatedEntry delay={60}>
        <GradientHero
          actionIcon="card-outline"
          actionLabel={isUnpaid ? "Thanh toán qua VNPay" : undefined}
          detail={`${homeData.paymentStatusText} · Hạn thanh toán: ${homeData.dueDate}`}
          icon="wallet-outline"
          label="HÓA ĐƠN HIỆN TẠI"
          onAction={isUnpaid ? () => onNavigate("invoice") : undefined}
          value={homeData.totalAmount}
        />
      </AnimatedEntry>

      <SectionHeader title="Tiện ích của bạn" />
      <AnimatedEntry delay={100} style={styles.quickGrid}>
        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("contract")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="document-text-outline" size={22} color={theme.primary} /></View>
            <Text style={styles.quickText}>Hợp đồng</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("utility")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="water-outline" size={22} color={theme.primary} /></View>
            <Text style={styles.quickText}>Điện nước</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("repair")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="construct-outline" size={22} color={theme.primary} /></View>
            <Text style={styles.quickText}>Sửa chữa</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("invoice")}
        >
          <Card style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons name="receipt-outline" size={22} color={theme.primary} /></View>
            <Text style={styles.quickText}>Hóa đơn</Text>
          </Card>
        </Pressable>
      </AnimatedEntry>

      <AnimatedEntry delay={140}>
      <Pressable onPress={() => onNavigate("contract")}>
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Hợp đồng</Text>
          <Text style={styles.cardDesc}>
            Ngày hết hạn: {homeData.contractEndDate}
          </Text>
        </Card>
      </Pressable>
      </AnimatedEntry>

      <AnimatedEntry delay={180}>
      <Pressable onPress={() => onNavigate("repair")}>
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>{homeData.recentRepair.title}</Text>
          <StatusBadge label={homeData.recentRepair.status || "Đang xử lý"} />
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
