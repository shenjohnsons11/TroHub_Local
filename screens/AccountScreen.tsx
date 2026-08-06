import React, { useState, useEffect } from "react";
import { ActivityIndicator, Modal, ScrollView, Switch, Text, StyleSheet, View, Pressable } from "react-native";
import Card from "../components/Card";
import ThemeToggle from "../components/ThemeToggle";
import { useAppTheme } from "../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { UserProfile } from "../types/UserProfile";
import { invoiceService } from "../services/invoiceService";
import { repairService } from "../services/repairService";
import { contractService } from "../services/contractService";
import { formatPhone } from "../utils/formatters";
import { getExpoPushToken, isPushEnabled, notificationPlatform, openNotificationSettings, requestNotificationPermission, setPushEnabled } from "../services/pushNotificationService";
import { notificationService } from "../services/notificationService";

type Props = {
  profile: UserProfile;
  onLogout: () => void;
  onNavigate?: (screen: "invoice" | "contract" | "profile", params?: any) => void;
  onPushTokenChange?: (token: string | null) => void;
};

const menuItems = [
  {
    key: "profile",
    icon: "person-outline",
    title: "Thông tin cá nhân",
    desc: "Xem và cập nhật thông tin người thuê",
  },
  {
    key: "contract",
    icon: "document-text-outline",
    title: "Hợp đồng",
    desc: "Xem hợp đồng thuê phòng hiện tại",
  },
  {
    key: "payment",
    icon: "receipt-outline",
    title: "Lịch sử thanh toán",
    desc: "Xem các hóa đơn đã thanh toán",
  },
  {
    key: "password",
    icon: "lock-closed-outline",
    title: "Đổi mật khẩu",
    desc: "Cập nhật mật khẩu đăng nhập",
  },
];

export default function AccountScreen({
  profile,
  onLogout,
  onNavigate,
  onPushTokenChange,
}: Props) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [stats, setStats] = useState({ invoices: 0, repairs: 0, months: 0, hasContract: false });

  useEffect(() => {
    async function loadStats() {
      try {
        const [invoices, repairs, contract] = await Promise.all([
          invoiceService.getInvoices(),
          repairService.getRequests(),
          contractService.getContract()
        ]);
        const isSigned = contract && ["active", "awaiting_approval", "requesting_termination"].includes(contract.status);
        setStats({
          invoices: invoices.length,
          repairs: repairs.length,
          months: contract?.usedMonths || 0,
          hasContract: !!isSigned
        });
      } catch (error) {
        console.log("Lỗi tải thống kê AccountScreen:", error);
      }
    }
    loadStats();
  }, []);

  const openSettings = async () => {
    setPushError("");
    setPushPreference(await isPushEnabled(profile.id));
    setSettingsVisible(true);
  };

  const handlePushChange = async (next: boolean) => {
    const previous = pushEnabled;
    setPushLoading(true);
    setPushError("");
    try {
      if (next) {
        const status = await requestNotificationPermission();
        if (status !== "granted") {
          setPushError("Bạn chưa cho phép thông báo trên iPhone.");
          return;
        }
        const token = await getExpoPushToken();
        if (!token) throw new Error("Chưa thể đăng ký thiết bị này nhận thông báo.");
        await notificationService.registerDevice(token, notificationPlatform());
        await setPushEnabled(profile.id, true);
        setPushPreference(true);
        onPushTokenChange?.(token);
      } else {
        const token = await getExpoPushToken();
        if (token) await notificationService.deactivateDevice(token);
        await setPushEnabled(profile.id, false);
        setPushPreference(false);
        onPushTokenChange?.(null);
      }
    } catch (error) {
      setPushPreference(previous);
      setPushError(error instanceof Error ? error.message : "Không thể cập nhật thông báo.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleMenuPress = (key: string) => {
    if (key === "profile") {
      onNavigate?.("profile");
      return;
    }

    if (key === "password") {
      setPasswordVisible(true);
      return;
    }

    if (key === "contract") {
      onNavigate?.("contract");
      return;
    }

    if (key === "payment") {
      onNavigate?.("invoice", { filter: "paid" });
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Tài khoản</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => void openSettings()} style={[styles.settingsButton, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="settings-outline" size={22} color={theme.primary} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.phone}>{formatPhone(profile.phone)}</Text>

          <View style={styles.roomBadge}>
            <Text style={styles.roomText}>
              {stats.hasContract ? `Phòng ${profile.room}` : "Chưa có phòng"}
            </Text>
          </View>
        </View>

        {stats.hasContract && (
          <View style={styles.statRow}>
            <Card style={[styles.card, styles.statCard]}>
              <Text style={styles.statNumber}>{stats.invoices}</Text>
              <Text style={styles.statLabel}>Hóa đơn</Text>
            </Card>

            <Card style={[styles.card, styles.statCard]}>
              <Text style={styles.statNumber}>{stats.repairs}</Text>
              <Text style={styles.statLabel}>Sửa chữa</Text>
            </Card>

            <Card style={[styles.card, styles.statCard]}>
              <Text style={styles.statNumber}>{stats.months}</Text>
              <Text style={styles.statLabel}>Tháng thuê</Text>
            </Card>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Cài đặt tài khoản</Text>
        <ThemeToggle />

        {menuItems.map((item) => (
          <Pressable key={item.key} onPress={() => handleMenuPress(item.key)}>
            <Card style={[styles.card, styles.menuCard]}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={theme.primary} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={theme.muted} />
            </Card>
          </Pressable>
        ))}

      </ScrollView>

      <Modal transparent animationType="slide" visible={settingsVisible} onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.drawerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsVisible(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerTitle}>Cài đặt</Text>
            <Pressable style={styles.drawerRow} onPress={() => { setSettingsVisible(false); onNavigate?.("profile"); }}>
              <Ionicons name="person-outline" size={21} color="#CFEDE1" /><Text style={styles.drawerText}>Thông tin cá nhân</Text><Ionicons name="chevron-forward" size={19} color="#9BC9B7" />
            </Pressable>
            <Pressable style={styles.drawerRow} onPress={() => { setSettingsVisible(false); setPasswordVisible(true); }}>
              <Ionicons name="lock-closed-outline" size={21} color="#CFEDE1" /><Text style={styles.drawerText}>Đổi mật khẩu</Text><Ionicons name="chevron-forward" size={19} color="#9BC9B7" />
            </Pressable>
            <View style={styles.drawerRow}>
              <Ionicons name="notifications-outline" size={21} color="#CFEDE1" /><Text style={styles.drawerText}>Bật thông báo</Text>
              {pushLoading ? <ActivityIndicator color="#CFEDE1" /> : <Switch value={pushEnabled} onValueChange={(next) => void handlePushChange(next)} trackColor={{ false: "#3A685A", true: "#22C55E" }} thumbColor="#F8FFFB" />}
            </View>
            {!!pushError && <View style={styles.pushError}><Text style={styles.pushErrorText}>{pushError}</Text><Pressable onPress={() => void openNotificationSettings()}><Text style={styles.openSettingsText}>Mở Cài đặt iPhone</Text></Pressable></View>}
            <Pressable style={styles.logoutAction} onPress={() => { setSettingsVisible(false); onLogout(); }}>
              <Ionicons name="log-out-outline" size={20} color="#FFE2E5" /><Text style={styles.logoutActionText}>Đăng xuất</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ChangePasswordModal
        visible={passwordVisible}
        onClose={() => setPasswordVisible(false)}
      />
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    shadowColor: theme.text,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
    backgroundColor: theme.surfaceElevated,
    shadowColor: theme.text,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 4,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: theme.background,
    fontSize: 34,
    fontWeight: "900",
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.text,
    textAlign: "center",
  },
  phone: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 6,
  },
  roomBadge: {
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  roomText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 12,
  },
  menuCard: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuInfo: {
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.text,
  },
  menuDesc: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 28,
    color: theme.muted,
    marginLeft: 10,
  },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "flex-end" },
  drawer: { backgroundColor: "#063D32", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
  drawerHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#74AB98", alignSelf: "center", marginBottom: 18 },
  drawerTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900", marginBottom: 12 },
  drawerRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#2D6858" },
  drawerText: { color: "#F5FFFA", fontSize: 15, fontWeight: "700", flex: 1 },
  pushError: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "rgba(239, 68, 68, 0.16)" },
  pushErrorText: { color: "#FFE2E5", fontSize: 13, lineHeight: 18 },
  openSettingsText: { color: "#8DE0BD", fontSize: 13, fontWeight: "800", marginTop: 8 },
  logoutAction: { minHeight: 52, marginTop: 22, borderRadius: 14, backgroundColor: "#B73D4B", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 },
  logoutActionText: { color: "#FFE2E5", fontSize: 15, fontWeight: "900" },
});
