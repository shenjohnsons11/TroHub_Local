import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import { UtilityRecord } from "../types/UtilityRecord";
import { utilityService } from "../services/utilityService";

type Props = {
  onBack: () => void;
};

export default function UtilityScreen({ onBack }: Props) {
  const [utilityHistory, setUtilityHistory] = useState<UtilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUtilities();
  }, []);

  const loadUtilities = async () => {
    try {
      setIsLoading(true);
      const data = await utilityService.getUtilities();
      setUtilityHistory(data);
    } catch (error) {
      console.log("Lỗi load điện nước:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  const current = utilityHistory[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </Pressable>

      <Text style={styles.title}>Điện nước</Text>
      <Text style={styles.subtitle}>
        Theo dõi chỉ số điện nước và chi phí sử dụng hằng tháng.
      </Text>

      {current ? (
        <>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Điện đã dùng</Text>
              <Text style={styles.summaryNumber}>{current.electricUsed} kWh</Text>
              <Text style={styles.summaryMoney}>{current.electricMoney}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Nước đã dùng</Text>
              <Text style={styles.summaryNumber}>{current.waterUsed} m³</Text>
              <Text style={styles.summaryMoney}>{current.waterMoney}</Text>
            </Card>
          </View>

          <Card style={styles.currentCard}>
            <Text style={styles.sectionTitle}>Tháng {current.month}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số điện cũ</Text>
              <Text style={styles.infoValue}>{current.electricOld}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số điện mới</Text>
              <Text style={styles.infoValue}>{current.electricNew}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Đơn giá điện</Text>
              <Text style={styles.infoValue}>4.000đ / kWh</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số nước cũ</Text>
              <Text style={styles.infoValue}>{current.waterOld}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số nước mới</Text>
              <Text style={styles.infoValue}>{current.waterNew}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Đơn giá nước</Text>
              <Text style={styles.infoValue}>15.000đ / m³</Text>
            </View>
          </Card>
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có dữ liệu điện nước.</Text>
        </Card>
      )}

      <Text style={styles.historyTitle}>Lịch sử điện nước</Text>

      {utilityHistory.map((item) => (
        <Card key={item.id} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyMonth}>Tháng {item.month}</Text>
            <Text style={styles.historyTotal}>
              {item.electricMoney} + {item.waterMoney}
            </Text>
          </View>

          <View style={styles.historyRow}>
            <Text style={styles.historyText}>Điện: {item.electricUsed} kWh</Text>
            <Text style={styles.historyText}>Nước: {item.waterUsed} m³</Text>
          </View>
        </Card>
      ))}
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
    paddingTop: 28,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryNumber: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  summaryMoney: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  currentCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F1F3",
    marginVertical: 8,
  },
  emptyCard: {
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyMonth: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  historyTotal: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    flex: 1,
  },
  historyRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  historyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
});