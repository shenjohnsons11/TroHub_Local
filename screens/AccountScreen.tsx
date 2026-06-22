import React, { useState, useEffect } from "react";
import { ScrollView, Text, StyleSheet, View, Pressable } from "react-native";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { UserProfile } from "../types/UserProfile";
import { invoiceService } from "../services/invoiceService";
import { repairService } from "../services/repairService";
import { contractService } from "../services/contractService";

type Props = {
  profile: UserProfile;
  onLogout: () => void;
  onNavigate?: (screen: "invoice" | "contract" | "profile") => void;
};

const menuItems = [
  {
    key: "profile",
    title: "Thông tin cá nhân",
    desc: "Xem và cập nhật thông tin người thuê",
  },
  {
    key: "contract",
    title: "Hợp đồng",
    desc: "Xem hợp đồng thuê phòng hiện tại",
  },
  {
    key: "payment",
    title: "Lịch sử thanh toán",
    desc: "Xem các hóa đơn đã thanh toán",
  },
  {
    key: "password",
    title: "Đổi mật khẩu",
    desc: "Cập nhật mật khẩu đăng nhập",
  },
];

export default function AccountScreen({
  profile,
  onLogout,
  onNavigate,
}: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      onNavigate?.("invoice");
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tài khoản</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>

          <View style={styles.roomBadge}>
            <Text style={styles.roomText}>
              {stats.hasContract ? `Phòng ${profile.room}` : "Chưa có phòng"}
            </Text>
          </View>
        </Card>

        {stats.hasContract && (
          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.invoices}</Text>
              <Text style={styles.statLabel}>Hóa đơn</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.repairs}</Text>
              <Text style={styles.statLabel}>Sửa chữa</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.months}</Text>
              <Text style={styles.statLabel}>Tháng thuê</Text>
            </Card>
          </View>
        )}

        <Text style={styles.sectionTitle}>Cài đặt tài khoản</Text>

        {menuItems.map((item) => (
          <Pressable key={item.key} onPress={() => handleMenuPress(item.key)}>
            <Card style={styles.menuCard}>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Card>
          </Pressable>
        ))}

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>

      <ChangePasswordModal
        visible={passwordVisible}
        onClose={() => setPasswordVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
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
    color: COLORS.text,
    marginBottom: 18,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },
  phone: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
  },
  roomBadge: {
    backgroundColor: COLORS.orangeSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  roomText: {
    color: COLORS.orange,
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
    color: COLORS.orange,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
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
  menuTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },
  menuDesc: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 28,
    color: COLORS.muted,
    marginLeft: 10,
  },
  logoutButton: {
    height: 52,
    borderRadius: 11,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD4D4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  logoutText: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: "900",
  },
});