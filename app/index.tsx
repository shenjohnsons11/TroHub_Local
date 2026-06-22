import React, { useEffect, useState } from "react";
import { View, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";

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
  | "tenants";

export default function App() {
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

  const handleLogin = async (email: string, password: string) => {
    try {
      await authService.login(email, password);

      const userProfile = await userService.getProfile();

      setProfile(userProfile);
      setIsLoggedIn(true);
      setActiveTab("home");
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
    return (
      <SafeAreaView style={styles.loadingSafe}>
        <ActivityIndicator size="large" color="#FF6A21" />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn || !profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.phone}>
        <View style={styles.content}>
          {profile.role === 1 ? (
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

              {activeTab === "invoice" && <InvoiceScreen />}

              {activeTab === "repair" && <RepairScreen />}

              {activeTab === "contract" && <ContractScreen />}

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

        <BottomNav activeTab={activeTab} onChangeTab={handleChangeTab} role={profile.role} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafe: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
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