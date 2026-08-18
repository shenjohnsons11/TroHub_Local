import React, { useState, useEffect } from "react";
import { ActivityIndicator, Modal, ScrollView, Switch, StyleSheet, View, Pressable } from "react-native";
import { AppText } from "@/components/ui/typography";
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
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  profile: UserProfile;
  onLogout: () => void;
  onNavigate?: (screen: "invoice" | "contract" | "profile", params?: any) => void;
  onPushTokenChange?: (token: string | null) => void;
};

export default function AccountScreen({
  profile,
  onLogout,
  onNavigate,
  onPushTokenChange,
}: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [stats, setStats] = useState({ invoices: 0, repairs: 0, months: 0, hasContract: false });

  const menuItems = [
    {
      key: "profile",
      icon: "person-outline",
      title: t("auth.account"),
      desc: t("auth.account"),
    },
    {
      key: "contract",
      icon: "document-text-outline",
      title: t("nav.contracts"),
      desc: t("nav.contracts"),
    },
    {
      key: "payment",
      icon: "receipt-outline",
      title: t("payments.title"),
      desc: t("payments.title"),
    },
    {
      key: "password",
      icon: "lock-closed-outline",
      title: t("auth.resetPassword"),
      desc: t("auth.resetPassword"),
    },
  ];

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
          setPushError(t("common.error"));
          return;
        }
        const token = await getExpoPushToken();
        if (!token) throw new Error(t("common.error"));
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
      setPushError(error instanceof Error ? error.message : t("common.error"));
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
          <AppText style={[styles.title, { color: theme.text }]}>{t("auth.account")}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={t("nav.settings")} onPress={() => void openSettings()} style={[styles.settingsButton, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="settings-outline" size={22} color={theme.primary} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>
              {profile.fullName.charAt(0).toUpperCase()}
            </AppText>
          </View>

          <AppText style={styles.name}>{profile.fullName}</AppText>
          <AppText style={styles.phone}>{formatPhone(profile.phone)}</AppText>

          <View style={styles.roomBadge}>
            <AppText style={styles.roomText}>
              {stats.hasContract ? `${t("common.room")} ${profile.room}` : t("common.noData")}
            </AppText>
          </View>
        </View>

        {stats.hasContract && (
          <View style={styles.statRow}>
            <Card style={[styles.card, styles.statCard]}>
              <AppText style={styles.statNumber}>{stats.invoices}</AppText>
              <AppText style={styles.statLabel}>{t("nav.invoices")}</AppText>
            </Card>

            <Card style={[styles.card, styles.statCard]}>
              <AppText style={styles.statNumber}>{stats.repairs}</AppText>
              <AppText style={styles.statLabel}>{t("nav.repairs")}</AppText>
            </Card>

            <Card style={[styles.card, styles.statCard]}>
              <AppText style={styles.statNumber}>{stats.months}</AppText>
              <AppText style={styles.statLabel}>{t("common.month")}</AppText>
            </Card>
          </View>
        )}

        <AppText style={[styles.sectionTitle, { color: theme.text }]}>{t("nav.settings")}</AppText>
        <ThemeToggle />

        {menuItems.map((item) => (
          <Pressable key={item.key} onPress={() => handleMenuPress(item.key)}>
            <Card style={[styles.card, styles.menuCard]}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={theme.primary} />
              </View>
              <View style={styles.menuInfo}>
                <AppText style={styles.menuTitle}>{item.title}</AppText>
                <AppText style={styles.menuDesc}>{item.desc}</AppText>
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
            <AppText style={styles.drawerTitle}>{t("nav.settings")}</AppText>
            <Pressable style={styles.drawerRow} onPress={() => { setSettingsVisible(false); onNavigate?.("profile"); }}>
              <Ionicons name="person-outline" size={21} color="#CFEDE1" /><AppText style={styles.drawerText}>{t("auth.account")}</AppText><Ionicons name="chevron-forward" size={19} color="#9BC9B7" />
            </Pressable>
            <Pressable style={styles.drawerRow} onPress={() => { setSettingsVisible(false); setPasswordVisible(true); }}>
              <Ionicons name="lock-closed-outline" size={21} color="#CFEDE1" /><AppText style={styles.drawerText}>{t("auth.resetPassword")}</AppText><Ionicons name="chevron-forward" size={19} color="#9BC9B7" />
            </Pressable>
            <View style={styles.drawerRow}>
              <Ionicons name="notifications-outline" size={21} color="#CFEDE1" /><AppText style={styles.drawerText}>{t("notifications.title")}</AppText>
              {pushLoading ? <ActivityIndicator color="#CFEDE1" /> : <Switch value={pushEnabled} onValueChange={(next) => void handlePushChange(next)} trackColor={{ false: "#3A685A", true: "#22C55E" }} thumbColor="#F8FFFB" />}
            </View>
            {!!pushError && <View style={styles.pushError}><AppText style={styles.pushErrorText}>{pushError}</AppText><Pressable onPress={() => void openNotificationSettings()}><AppText style={styles.openSettingsText}>{t("nav.settings")}</AppText></Pressable></View>}
            <Pressable style={styles.logoutAction} onPress={() => { setSettingsVisible(false); onLogout(); }}>
              <Ionicons name="log-out-outline" size={20} color="#FFE2E5" /><AppText style={styles.logoutActionText}>{t("auth.logout")}</AppText>
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
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 10,
  },
  roomBadge: {
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roomText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: theme.muted,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  drawer: {
    backgroundColor: "#1A3026",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#3A685A",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 20,
  },
  drawerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3A685A",
  },
  drawerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#CFEDE1",
    marginLeft: 14,
  },
  pushError: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  pushErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginBottom: 4,
  },
  openSettingsText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 10,
  },
  logoutActionText: {
    color: "#FFE2E5",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 14,
  },
});
