import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import { HomeData } from "../types/HomeData";
import { homeService } from "../services/homeService";

type Props = {
  refreshKey: number;
  onNavigate: (screen: "invoice" | "repair" | "contract" | "utility") => void;
  onLogout: () => void;
};

export default function HomeScreen({ refreshKey, onNavigate, onLogout }: Props) {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, [refreshKey]);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      const data = await homeService.getHomeData();
      setHomeData(data);
    } catch (error) {
      console.log("Lỗi load trang chủ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !homeData) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  const isUnpaid = homeData.paymentStatus === "unpaid";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.hello}>Xin chào Người thuê {homeData.tenantName}</Text>
          <Text style={styles.room}>
            {homeData.room === "Chưa có phòng" ? "Chưa có phòng" : `Phòng ${homeData.room}`}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </View>

      <Card style={styles.amountCard}>
        <Text style={styles.smallText}>Tổng tiền</Text>

        <Text style={styles.amount}>{homeData.totalAmount}</Text>

        <Text style={isUnpaid ? styles.unpaid : styles.paid}>
          {homeData.paymentStatusText}
        </Text>

        <Text style={styles.smallText}>Hạn thanh toán: {homeData.dueDate}</Text>

        {isUnpaid && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => onNavigate("invoice")}
          >
            <Text style={styles.primaryText}>Thanh toán ngay</Text>
          </Pressable>
        )}
      </Card>

      <View style={styles.quickGrid}>
        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("contract")}
        >
          <Card style={styles.quickCard}>
            <Text style={styles.quickText}>Hợp đồng</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("utility")}
        >
          <Card style={styles.quickCard}>
            <Text style={styles.quickText}>Điện nước</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("repair")}
        >
          <Card style={styles.quickCard}>
            <Text style={styles.quickText}>Sửa chữa</Text>
          </Card>
        </Pressable>

        <Pressable
          style={styles.quickItem}
          onPress={() => onNavigate("invoice")}
        >
          <Card style={styles.quickCard}>
            <Text style={styles.quickText}>Hóa đơn</Text>
          </Card>
        </Pressable>
      </View>

      <Pressable onPress={() => onNavigate("contract")}>
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Hợp đồng</Text>
          <Text style={styles.cardDesc}>
            Ngày hết hạn: {homeData.contractEndDate}
          </Text>
        </Card>
      </Pressable>

      <Pressable onPress={() => onNavigate("repair")}>
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>{homeData.recentRepair.title}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{homeData.recentRepair.status}</Text>
          </View>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD4D4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.red,
  },
  hello: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.text,
  },
  room: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  amountCard: {
    marginBottom: 18,
  },
  smallText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  amount: {
    fontSize: 31,
    fontWeight: "900",
    color: COLORS.orange,
    marginTop: 10,
    marginBottom: 4,
  },
  unpaid: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  paid: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  primaryButton: {
    height: 46,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickItem: {
    flex: 1,
  },
  quickCard: {
    height: 68,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  infoCard: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDesc: {
    color: COLORS.muted,
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