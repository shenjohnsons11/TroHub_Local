import React, { useEffect, useState } from "react";
import { View, StyleSheet, SafeAreaView, useColorScheme } from "react-native";
import Toast from "react-native-toast-message";

import BottomNav from "../components/BottomNav";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import InvoiceScreen from "../screens/InvoiceScreen";
import RepairScreen from "../screens/RepairScreen";
import ContractScreen from "../screens/ContractScreen";
import AccountScreen from "../screens/AccountScreen";
import UtilityScreen from "../screens/UtilityScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminRoomsScreen from "../screens/AdminRoomsScreen";
import AdminContractsScreen from "../screens/AdminContractsScreen";
import AdminInvoicesScreen from "../screens/AdminInvoicesScreen";
import AdminRepairsScreen from "../screens/AdminRepairsScreen";
import AdminTenantsScreen from "../screens/AdminTenantsScreen";
import BulkInvoiceScreen from "../screens/BulkInvoiceScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import AdminSettingsScreen from "../screens/AdminSettingsScreen";
import AppLoadingScreen from "../components/AppLoadingScreen";
import { TROHUB_THEMES } from "../constants/theme";

import { UserProfile } from "../types/UserProfile";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import NotificationsScreen from "../screens/NotificationsScreen";
import { useInboxNotifications } from "../hooks/useInboxNotifications";
import { useNotification } from "../hooks/useNotification";
import { listenForNotificationResponses, registerDeviceForPush } from "../services/push-notifications";
import { InboxNotification } from "../services/notification-api";

type Tab =
  | "home"
  | "invoice"
  | "invoice_bulk"
  | "repair"
  | "contract"
  | "account"
  | "utility"
  | "profile"
  | "rooms"
  | "tenants"
  | "change_password"
  | "settings"
  | "notifications";

export default function App() {
  const notification = useNotification();
  const {
    refresh: refreshInbox,
    reset: resetInbox,
    unreadCount: notificationUnreadCount,
  } = useInboxNotifications();
  const theme = TROHUB_THEMES[useColorScheme() === "dark" ? "dark" : "light"];
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [actionParams, setActionParams] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  useEffect(() => {
    loadAppData();
  }, []);

  useEffect(() => listenForNotificationResponses((data) => {
    if (data.entityType === "CONTRACT" && data.entityId) {
      handleChangeTab("contract", { contractId: String(data.entityId) });
    }
    if (data.entityType === "INVOICE" && data.entityId) {
      handleChangeTab("invoice", { paymentInvoiceId: String(data.entityId) });
    }
  }), []);

  useEffect(() => {
    if (isLoggedIn && profile?.role === 2) {
      void refreshInbox();
      void notification.confirm({
        title: "Nhận thông báo quan trọng",
        message: "Cho phép TroHub thông báo khi có hợp đồng mới hoặc hóa đơn sắp đến hạn?",
        confirmText: "Cho phép",
        cancelText: "Để sau",
      }).then((accepted) => {
        if (accepted) {
          void registerDeviceForPush().then((result) => {
            if (result.status === "missing-project-id") {
              notification.warning("Push notification cần EAS Project ID; hộp thư trong ứng dụng vẫn hoạt động.");
            }
          });
        }
      });
    }
  }, [isLoggedIn, notification, profile?.role, refreshInbox]);

  const loadAppData = async () => {
    try {
      const loggedIn = await authService.checkLogin();

      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const userProfile = await userService.getProfile();
        setProfile(userProfile);
      }
    } catch (error) {
      console.log("Lỗi tải dữ liệu app:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogin = async (identifier: string, password: string) => {
    try {
      const mustChangePassword = await authService.login(identifier, password);

      const userProfile = await userService.getProfile();

      setProfile(userProfile);
      setIsLoggedIn(true);
      setActiveTab(mustChangePassword ? "change_password" : "home");
      setHomeRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.log("Lỗi xử lý đăng nhập:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();

      setIsLoggedIn(false);
      setProfile(null);
      resetInbox();
      setActiveTab("home");
      setHomeRefreshKey(0);
    } catch (error) {
      console.log("Lỗi xử lý đăng xuất:", error);
    }
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    try {
      const updatedProfile = await userService.updateProfile(newProfile);
      setProfile(updatedProfile);
      setHomeRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.log("Lỗi lưu profile:", error);
    }
  };

  const handleChangeTab = (tab: Tab, params?: any) => {
    if (tab === "home") {
      setHomeRefreshKey((prev) => prev + 1);
    }
    setActionParams(params || null);
    setActiveTab(tab);
  };

  if (isChecking) {
    return <AppLoadingScreen />;
  }

  if (!isLoggedIn || !profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.phone, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          {activeTab === "change_password" ? (
            <ChangePasswordScreen 
              onSuccess={() => setActiveTab("home")} 
              onLogout={handleLogout} 
            />
          ) : profile.role === 1 ? (
            <>
              {activeTab === "home" && (
                <AdminDashboardScreen
                  profile={profile}
                  onNavigate={handleChangeTab}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "rooms" && <AdminRoomsScreen params={actionParams} />}

              {activeTab === "contract" && <AdminContractsScreen params={actionParams} />}

              {activeTab === "invoice" && <AdminInvoicesScreen params={actionParams} onNavigate={handleChangeTab} />}

              {activeTab === "invoice_bulk" && <BulkInvoiceScreen onNavigate={handleChangeTab} />}

              {activeTab === "repair" && <AdminRepairsScreen />}

              {activeTab === "tenants" && <AdminTenantsScreen />}

              {activeTab === "settings" && (
                <AdminSettingsScreen
                  profile={profile!}
                  onSave={handleSaveProfile}
                  onBack={() => setActiveTab("home")}
                  onLogout={handleLogout}
                />
              )}
            </>
          ) : (
            <>
              {activeTab === "home" && (
                <HomeScreen
                  refreshKey={homeRefreshKey}
                  onNavigate={(screen) => setActiveTab(screen)}
                  onLogout={handleLogout}
                  onOpenNotifications={() => setActiveTab("notifications")}
                  notificationUnreadCount={notificationUnreadCount}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationsScreen
                  onBack={() => setActiveTab("home")}
                  onOpen={(item: InboxNotification) => {
                    if (item.entityType === "CONTRACT") {
                      handleChangeTab("contract", { contractId: item.entityId });
                    } else {
                      handleChangeTab("invoice", { paymentInvoiceId: item.entityId });
                    }
                  }}
                />
              )}

              {activeTab === "invoice" && <InvoiceScreen params={actionParams} />}

              {activeTab === "repair" && <RepairScreen />}

              {activeTab === "contract" && <ContractScreen params={actionParams} onNavigate={handleChangeTab as any} />}

              {activeTab === "utility" && (
                <UtilityScreen onBack={() => setActiveTab("home")} />
              )}

              {activeTab === "profile" && (
                <ProfileScreen
                  profile={profile}
                  onSave={handleSaveProfile}
                  onBack={() => setActiveTab("account")}
                />
              )}

              {activeTab === "account" && (
                <AccountScreen
                  profile={profile}
                  onLogout={handleLogout}
                  onNavigate={(screen) => setActiveTab(screen)}
                />
              )}
            </>
          )}
        </View>

        {activeTab !== "change_password" && activeTab !== "notifications" && (
          <BottomNav activeTab={activeTab} onChangeTab={handleChangeTab} role={profile.role} />
        )}
        <Toast />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  phone: {
    flex: 1, 
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    backgroundColor: "#F4F5F7",
  },
  content: {
    flex: 1,
  },
});
