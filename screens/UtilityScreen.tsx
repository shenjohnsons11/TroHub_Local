import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { UtilityRecord } from "../types/UtilityRecord";
import { utilityService } from "../services/utilityService";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";
import { Ionicons } from "@expo/vector-icons";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import { formatNumberInput, unformatNumber } from "../utils/formatters";

type Props = {
  onBack: () => void;
};

export default function UtilityScreen({ onBack }: Props) {
  const notification = useNotification();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [utilityHistory, setUtilityHistory] = useState<UtilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [draftElec, setDraftElec] = useState("");
  const [draftWater, setDraftWater] = useState("");

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

  const handleReport = async () => {
    if (!draftElec || !draftWater) {
      notification.warning("Vui lòng nhập đầy đủ chỉ số điện và nước.");
      return;
    }
    try {
      const res = await utilityService.reportUtility(unformatNumber(draftElec), unformatNumber(draftWater));
      if (!res.success) throw new Error(res.message || "Có lỗi xảy ra");
      notification.success("Đã gửi số liệu điện nước cho chủ trọ chờ duyệt.");
      setModalVisible(false);
      setDraftElec("");
      setDraftWater("");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể gửi chỉ số điện nước."));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const current = utilityHistory[0];

  return (
    <>
      <FlatList
        contentContainerStyle={styles.content}
        data={utilityHistory}
        keyExtractor={(item) => item.id}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Pressable style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={18} color={theme.primary} />
              <Text style={styles.backText}>Quay lại</Text>
            </Pressable>
            <Text style={styles.title}>Điện nước</Text>
            <Text style={styles.subtitle}>Theo dõi chỉ số điện nước và chi phí sử dụng hằng tháng.</Text>
            {current ? (
              <>
          <AnimatedEntry>
            <GradientHero
              icon="speedometer-outline"
              label={`CHỈ SỐ THÁNG ${current.month}`}
              value={`${current.electricMoney} + ${current.waterMoney}`}
              detail="Chi phí điện nước hiện tại"
            >
              <View style={styles.meterRow}>
                <View style={styles.meterItem}>
                  <Ionicons name="flash-outline" size={20} color="#8CF2C9" />
                  <Text style={styles.meterValue}>{formatNumberInput(current.electricUsed)} kWh</Text>
                </View>
                <View style={styles.meterItem}>
                  <Ionicons name="water-outline" size={20} color="#8CF2C9" />
                  <Text style={styles.meterValue}>{formatNumberInput(current.waterUsed)} m³</Text>
                </View>
              </View>
            </GradientHero>
          </AnimatedEntry>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Điện đã dùng</Text>
              <Text style={styles.summaryNumber}>{formatNumberInput(current.electricUsed)} kWh</Text>
              <Text style={styles.summaryMoney}>{current.electricMoney}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Nước đã dùng</Text>
              <Text style={styles.summaryNumber}>{formatNumberInput(current.waterUsed)} m³</Text>
              <Text style={styles.summaryMoney}>{current.waterMoney}</Text>
            </Card>
          </View>

          <Card style={styles.currentCard}>
            <Text style={styles.sectionTitle}>Tháng {current.month}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số điện cũ</Text>
              <Text style={styles.infoValue}>{formatNumberInput(current.electricOld)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số điện mới</Text>
              <Text style={styles.infoValue}>{formatNumberInput(current.electricNew)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số nước cũ</Text>
              <Text style={styles.infoValue}>{formatNumberInput(current.waterOld)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chỉ số nước mới</Text>
              <Text style={styles.infoValue}>{formatNumberInput(current.waterNew)}</Text>
            </View>

            <View style={styles.priceNote}>
              <Ionicons name="information-circle-outline" size={19} color={theme.primary} />
              <Text style={styles.priceNoteText}>
                Đơn giá áp dụng được thể hiện trong chi tiết hóa đơn.
              </Text>
            </View>
          </Card>
              </>
            ) : null}
            <AppButton icon="speedometer-outline" onPress={() => setModalVisible(true)} style={styles.reportButton}>
              Chốt số điện nước tháng này
            </AppButton>
            <Text style={styles.historyTitle}>Lịch sử điện nước</Text>
          </>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có dữ liệu điện nước.</Text>
          </Card>
        }
        renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 5) * 35}>
            <Card style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyMonth}>Tháng {item.month}</Text>
                <Text style={styles.historyTotal}>{item.electricMoney} + {item.waterMoney}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyText}>Điện: {formatNumberInput(item.electricUsed)} kWh</Text>
                <Text style={styles.historyText}>Nước: {formatNumberInput(item.waterUsed)} m³</Text>
              </View>
            </Card>
          </AnimatedEntry>
        )}
      />

      <Modal
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Báo cáo chỉ số điện nước</Text>
            <Text style={styles.label}>Số điện mới:</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={draftElec} 
              onChangeText={(value) => setDraftElec(formatNumberInput(value))}
              placeholder="Nhập số điện trên đồng hồ..." 
              placeholderTextColor={theme.muted}
            />
            
            <Text style={styles.label}>Số nước mới:</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={draftWater} 
              onChangeText={(value) => setDraftWater(formatNumberInput(value))}
              placeholder="Nhập số nước trên đồng hồ..." 
              placeholderTextColor={theme.muted}
            />

              <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={18} color={theme.text} />
                <Text style={styles.btnText}>Hủy</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnSubmit]} onPress={handleReport}>
                <Ionicons name="send-outline" size={18} color={theme.background} />
                <Text style={[styles.btnText, { color: theme.background }]}>Gửi báo cáo</Text>
              </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 14,
  },
  backText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  summaryLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryNumber: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  summaryMoney: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  currentCard: {
    marginBottom: 20,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  infoLabel: {
    color: theme.muted,
    fontSize: 13,
  },
  infoValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
  },
  priceNote: {
    alignItems: "center",
    backgroundColor: theme.primarySoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    padding: 12,
  },
  priceNoteText: { color: theme.text, flex: 1, fontSize: 12, lineHeight: 18 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: theme.surface,
    borderColor: "transparent",
    marginBottom: 20,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 12,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyMonth: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "900",
  },
  historyTotal: {
    color: theme.primary,
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
    color: theme.muted,
    fontSize: 13,
  },
  reportButton: {
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: "center" },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.surfaceElevated,
    color: theme.text,
    padding: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: theme.surfaceElevated,
  },
  btnSubmit: {
    backgroundColor: theme.primary,
  },
  btnText: {
    color: theme.text,
    fontWeight: "bold",
  },
  meterRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  meterItem: {
    alignItems: "center",
    backgroundColor: "rgba(221,251,240,0.12)",
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    padding: 12,
  },
  meterValue: { color: "#DDFBF0", fontSize: 13, fontWeight: "900" },
});
