import React, { useEffect, useState } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
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
import NotificationsScreen from "../screens/NotificationsScreen";
import MeterScannerScreen from "../screens/MeterScannerScreen";
import AppLoadingScreen from "../components/AppLoadingScreen";
import { useAppTheme } from "../contexts/ThemeContext";

import { UserProfile } from "../types/UserProfile";
import { authService } from "../services/authService";
import { userService } from "../services/userService";

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
  | "scan_meter";

export default function App() {
  const { theme } = useAppTheme();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [actionParams, setActionParams] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

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

              {activeTab === "notifications" && <NotificationsScreen onBack={() => setActiveTab("home")} />}
            </>
          ) : (
            <>
              {activeTab === "home" && (
                <HomeScreen
                  refreshKey={homeRefreshKey}
                  onNavigate={(screen) => setActiveTab(screen)}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "invoice" && <InvoiceScreen params={actionParams} />}

              {activeTab === "repair" && <RepairScreen />}

              {activeTab === "contract" && <ContractScreen onNavigate={handleChangeTab as any} />}

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
                  onNavigate={(screen) => setActiveTab(screen)}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationsScreen onBack={() => setActiveTab("home")} onNavigate={handleChangeTab} />
              )}

              {activeTab === "scan_meter" && (
                <MeterScannerScreen onBack={() => setActiveTab("home")} onSuccess={() => setActiveTab("utility")} />
              )}
            </>
          )}
        </View>

        {activeTab !== "change_password" && (
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
