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
import { COLORS } from "../constants/theme";
import { homeService } from "../services/homeService";
import { Invite, inviteService } from "../services/inviteService";
import { HomeData } from "../types/HomeData";

type Props = {
  refreshKey: number;
  onNavigate: (screen: "invoice" | "repair" | "contract" | "utility") => void;
  onLogout: () => void;
};

export default function HomeScreen({ refreshKey, onNavigate, onLogout }: Props) {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, [refreshKey]);

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
    }
  };

  if (isLoading || !homeData) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
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
      <View style={styles.headerRow}>
  <View style={styles.header}>
    <Text style={styles.hello}>Xin chào Người thuê {homeData.tenantName}</Text>
    <Text style={styles.room}>
      {homeData.room === "Chưa có phòng" ? "Chưa có phòng" : `Phòng ${homeData.room}`}
    </Text>
  </View>
</View>

      {invites.length > 0 && invites.map(invite => (
        <Card key={invite.id} style={[styles.amountCard, { backgroundColor: '#FFF9E6', borderColor: '#FFE58F' }]}>
          <Text style={[styles.cardTitle, { color: '#D48806', marginBottom: 4 }]}>🏠 Lời mời vào nhà trọ</Text>
          <Text style={styles.smallText}>
            Chủ trọ <Text style={{fontWeight: 'bold'}}>{invite.landlordName}</Text> ({invite.phone}) vừa thêm bạn vào danh sách quản lý.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
              onPress={() => handleAcceptInvite(invite.id)}
            >
              <Text style={styles.primaryText}>Chấp nhận</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { flex: 1, marginTop: 0, backgroundColor: '#FFE58F' }]}
              onPress={() => handleRejectInvite(invite.id)}
            >
              <Text style={[styles.primaryText, { color: '#D48806' }]}>Từ chối</Text>
            </Pressable>
          </View>
        </Card>
      ))}

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