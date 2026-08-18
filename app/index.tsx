import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import { io } from "socket.io-client";

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
import NotificationsScreen from "../screens/NotificationsScreen";
import AdminNotificationsScreen from "../screens/AdminNotificationsScreen";
import MeterScannerScreen from "../screens/MeterScannerScreen";
import CCCDScannerScreen from "../screens/CCCDScannerScreen";
import AIChatScreen from "../screens/AIChatScreen";

import AppSplashScreen from "../components/AppSplashScreen";
import { useAppTheme } from "../contexts/ThemeContext";

import { UserProfile } from "../types/UserProfile";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { notificationService } from "../services/notificationService";
import { getExpoPushToken, isPushEnabled, notificationPlatform } from "../services/pushNotificationService";
import { resolveNotificationTarget } from "../utils/notificationNavigation";
import { API_BASE_URL } from "../constants/api";
import * as Linking from "expo-linking";
import { resolveAppDeepLink } from "../utils/deepLinks";
import type { AIChatAction } from "../services/aiService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});


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
  | "notifications"
  | "scan_meter"
  | "cccd_scan"
  | "ai_chat";

export default function App() {
  const { theme } = useAppTheme();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [actionParams, setActionParams] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    loadAppData();
  }, []);

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
      if (pushTokenRef.current) await notificationService.deactivateDevice(pushTokenRef.current).catch(() => undefined);
      pushTokenRef.current = null;
      await authService.logout();

      setIsLoggedIn(false);
      setProfile(null);
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

  useEffect(() => {
    if (!isLoggedIn) return;
    const openDeepLink = (url: string | null | undefined) => {
      if (resolveAppDeepLink(url) === "cccd_scan") handleChangeTab("cccd_scan");
    };
    const subscription = Linking.addEventListener("url", ({ url }) => openDeepLink(url));
    void Linking.getInitialURL().then(openDeepLink);
    return () => subscription.remove();
  }, [isLoggedIn]);
  const handleAIAction = (action: AIChatAction) => {
    if (profile?.role !== 1 || !action || (action.type !== "FILL_CONTRACT_FORM" && action.type !== "FILL_UTILITY_READING")) return;
    handleChangeTab(action.type === "FILL_CONTRACT_FORM" ? "contract" : "invoice_bulk", action.type === "FILL_CONTRACT_FORM" ? { action: "create", aiAction: action } : { aiAction: action });
  };

  useEffect(() => {
    if (!isLoggedIn || !profile) return;
    let socket: ReturnType<typeof io> | null = null;
    let responseSubscription: Notifications.EventSubscription | null = null;
    let receivedSubscription: Notifications.EventSubscription | null = null;
    const refresh = () => setNotificationRefreshKey((value) => value + 1);
    const openPush = async (data: any) => {
      if (data?.notificationId) {
        await notificationService.markAsRead(String(data.notificationId)).catch(() => undefined);
        refresh();
      }
      const target = resolveNotificationTarget({ type: data?.category || "system", deepLink: data?.deepLink, metadata: data?.metadata });
      handleChangeTab(target.tab as Tab, target.params);
    };

    void (async () => {
      const token = await authService.getToken();
      if (!token) return;
      if (await isPushEnabled(profile.id)) {
        const expoPushToken = await getExpoPushToken();
        if (expoPushToken) {
          pushTokenRef.current = expoPushToken;
          await notificationService.registerDevice(expoPushToken, notificationPlatform());
        }
      }
      socket = io(API_BASE_URL.replace(/\/api$/, ""), { auth: { token }, transports: ["websocket"] });
      socket.on("new_notification", refresh);
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) await openPush(lastResponse.notification.request.content.data);
    })().catch((error) => console.log("Lỗi khởi tạo thông báo:", error));

    receivedSubscription = Notifications.addNotificationReceivedListener(refresh);
    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => void openPush(response.notification.request.content.data));
    return () => {
      socket?.disconnect();
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [isLoggedIn, profile?.id]);

  const splash = <AppSplashScreen visible={isChecking} key="app-splash" />;

  if (isChecking) {
    return <View style={styles.root}>{splash}</View>;
  }

  if (!isLoggedIn || !profile) {
    return (
      <View style={styles.root}>
        <LoginScreen onLogin={handleLogin} />
        {splash}
      </View>
    );
  }

  return (
    <View style={styles.root}>
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
                  refreshKey={notificationRefreshKey}
                  onNavigate={handleChangeTab}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "rooms" && <AdminRoomsScreen params={actionParams} />}

              {activeTab === "contract" && <AdminContractsScreen params={actionParams} />}

              {activeTab === "invoice" && <AdminInvoicesScreen params={actionParams} onNavigate={handleChangeTab} />}

              {activeTab === "invoice_bulk" && <BulkInvoiceScreen onNavigate={handleChangeTab} params={actionParams} />}

              {activeTab === "repair" && <AdminRepairsScreen params={actionParams} />}

              {activeTab === "tenants" && <AdminTenantsScreen />}

              {activeTab === "settings" && (
                <AdminSettingsScreen
                  profile={profile!}
                  onSave={handleSaveProfile}
                  onBack={() => setActiveTab("home")}
                  onLogout={handleLogout}
                  onPushTokenChange={(token) => { pushTokenRef.current = token; }}
                />
              )}

              {activeTab === "notifications" && <AdminNotificationsScreen onBack={() => handleChangeTab("home")} onNavigate={handleChangeTab} refreshKey={notificationRefreshKey} onUnreadChanged={() => setNotificationRefreshKey((value) => value + 1)} />}

              {activeTab === "ai_chat" && <AIChatScreen profile={profile} onBack={() => setActiveTab("home")} onAction={handleAIAction} />}
            </>
          ) : (
            <>
              {activeTab === "home" && (
                <HomeScreen
                  profile={profile}
                  refreshKey={homeRefreshKey + notificationRefreshKey}
                  onNavigate={(screen) => setActiveTab(screen as any)}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "invoice" && <InvoiceScreen params={actionParams} />}

              {activeTab === "repair" && <RepairScreen />}

              {activeTab === "contract" && <ContractScreen onNavigate={handleChangeTab as any} params={actionParams} />}

              {activeTab === "utility" && (
                <UtilityScreen onBack={() => setActiveTab("home")} />
              )}

              {activeTab === "profile" && (
                <ProfileScreen
                  profile={profile}
                  onSave={handleSaveProfile}
                  onBack={() => setActiveTab("account")}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "account" && (
                <AccountScreen
                  profile={profile}
                  onLogout={handleLogout}
                  onNavigate={(screen) => setActiveTab(screen as any)}
                  onPushTokenChange={(token) => { pushTokenRef.current = token; }}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationsScreen onBack={() => handleChangeTab("home")} onNavigate={handleChangeTab} refreshKey={notificationRefreshKey} onUnreadChanged={() => setNotificationRefreshKey((value) => value + 1)} />
              )}

              {activeTab === "scan_meter" && (
                <MeterScannerScreen onBack={() => setActiveTab("home")} onSuccess={() => setActiveTab("utility")} />
              )}

              {activeTab === "cccd_scan" && <CCCDScannerScreen onBack={() => setActiveTab("home")} />}

              {activeTab === "ai_chat" && <AIChatScreen profile={profile} onBack={() => setActiveTab("home")} />}
            </>
          )}
          </View>

          {activeTab !== "change_password" && (
            <BottomNav activeTab={activeTab} onChangeTab={handleChangeTab} role={profile.role} />
          )}
          <Toast />
        </View>
      </SafeAreaView>
      {splash}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#04100e",
  },
  safe: {
    flex: 1,
    backgroundColor: "#FAF8F4",
  },
  phone: {
    flex: 1, 
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    backgroundColor: "#FAF8F4",
  },
  content: {
    flex: 1,
  },
});
