import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { UtilityRecord } from "../types/UtilityRecord";
import { utilityService } from "../services/utilityService";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../components/ui/AppButton";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import { MeterReadingCard } from "../components/ui/meter-reading-card";
import { formatCurrency, formatMeterReading, parseMeterReading, unformatNumber } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

type Props = {
  onBack?: () => void;
};

export default function UtilityScreen({ onBack }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [current, setCurrent] = useState<UtilityRecord | null>(null);
  const [utilityHistory, setUtilityHistory] = useState<UtilityRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [draftElec, setDraftElec] = useState("");
  const [draftWater, setDraftWater] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [currentData, historyData] = await Promise.all([
        utilityService.getCurrentUtility(),
        utilityService.getUtilityHistory(),
      ]);
      setCurrent(currentData);
      setUtilityHistory(historyData);
    } catch (error) {
      console.log("Lỗi load dữ liệu điện nước:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async () => {
    const electricity = parseMeterReading(draftElec);
    const water = parseMeterReading(draftWater);
    if (electricity === null || water === null) {
      notification.error(t("common.error"));
      return;
    }
    const success = await utilityService.reportUtility(electricity, water);
    if (success) {
      setModalVisible(false);
      setDraftElec("");
      setDraftWater("");
      notification.success(t("common.success"));
      loadData();
    }
  };

  const electricUnitPrice = current && current.electricUsed > 0 ? Math.round(unformatNumber(current.electricMoney) / current.electricUsed) : 0;
  const waterUnitPrice = current && current.waterUsed > 0 ? Math.round(unformatNumber(current.waterMoney) / current.waterUsed) : 0;

  if (isLoading) {
    return <ContentSkeleton rows={3} />;
  }

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
            {onBack && (
              <Pressable style={styles.backButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={18} color={theme.primary} />
                <AppText style={styles.backText}>{t("common.back")}</AppText>
              </Pressable>
            )}
            <AppText style={styles.title}>{t("nav.utilities")}</AppText>
            <AppText style={styles.subtitle}>{t("dashboard.property")}</AppText>
            {current ? (
              <>
                <AnimatedEntry>
                  <GradientHero
                    icon="speedometer-outline"
                    iconToken={FEATURE_ICONS.utility}
                    label={`${t("invoices.period")} ${current.month}`}
                    value={`${formatCurrency(unformatNumber(current.electricMoney))} + ${formatCurrency(unformatNumber(current.waterMoney))}`}
                    detail={t("invoices.title")}
                  >
                    <View style={styles.meterRow}>
                      <View style={styles.meterItem}>
                        <Ionicons name="flash-outline" size={20} color="#8CF2C9" />
                        <AppText style={styles.meterValue}>{formatMeterReading(current.electricUsed)} kWh</AppText>
                      </View>
                      <View style={styles.meterItem}>
                        <Ionicons name="water-outline" size={20} color="#8CF2C9" />
                        <AppText style={styles.meterValue}>{formatMeterReading(current.waterUsed)} m³</AppText>
                      </View>
                    </View>
                  </GradientHero>
                </AnimatedEntry>
                <View style={styles.summaryRow}>
                  <Card style={styles.summaryCard}>
                    <AppText style={styles.summaryLabel}>{t("utilities.oldElec")}</AppText>
                    <AppText style={styles.summaryNumber}>{formatMeterReading(current.electricUsed)} kWh</AppText>
                    <AppText style={styles.summaryMoney}>{formatCurrency(unformatNumber(current.electricMoney))}</AppText>
                  </Card>

                  <Card style={styles.summaryCard}>
                    <AppText style={styles.summaryLabel}>{t("utilities.oldWater")}</AppText>
                    <AppText style={styles.summaryNumber}>{formatMeterReading(current.waterUsed)} m³</AppText>
                    <AppText style={styles.summaryMoney}>{formatCurrency(unformatNumber(current.waterMoney))}</AppText>
                  </Card>
                </View>

                <View style={styles.meterCards}>
                  <MeterReadingCard icon="flash-outline" label={t("nav.utilities")} unit="kWh" previous={current.electricOld} current={current.electricNew} unitPrice={electricUnitPrice} />
                  <MeterReadingCard icon="water-outline" label={t("nav.utilities")} unit="m³" previous={current.waterOld} current={current.waterNew} unitPrice={waterUnitPrice} />
                </View>
              </>
            ) : null}
            <AppButton icon="speedometer-outline" onPress={() => setModalVisible(true)} style={styles.reportButton}>
              {t("invoices.recordMeter")}
            </AppButton>
            <AppText style={styles.historyTitle}>{t("invoices.title")}</AppText>
          </>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Ionicons name="speedometer-outline" size={34} color={theme.primary} />
            <AppText style={styles.emptyText}>{t("common.noData")}</AppText>
          </Card>
        }
        renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 5) * 35}>
            <Card style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <AppText style={styles.historyMonth}>{t("invoices.period")} {item.month}</AppText>
                <AppText style={styles.historyTotal}>{formatCurrency(unformatNumber(item.electricMoney))} + {formatCurrency(unformatNumber(item.waterMoney))}</AppText>
              </View>
              <View style={styles.historyRow}>
                <AppText style={styles.historyText}>{t("utilities.oldElec")}: {formatMeterReading(item.electricUsed)} kWh</AppText>
                <AppText style={styles.historyText}>{t("utilities.oldWater")}: {formatMeterReading(item.waterUsed)} m³</AppText>
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
              <AppText style={styles.modalTitle}>{t("invoices.recordMeter")}</AppText>
              <AppText style={styles.label}>{t("utilities.newElec")}:</AppText>
              <AppTextInput
                style={styles.input} 
                keyboardType="decimal-pad"
                value={draftElec} 
                onChangeText={(value) => setDraftElec(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                placeholder="0" 
                placeholderTextColor={theme.muted}
              />
              
              <AppText style={styles.label}>{t("utilities.newWater")}:</AppText>
              <AppTextInput
                style={styles.input} 
                keyboardType="decimal-pad"
                value={draftWater} 
                onChangeText={(value) => setDraftWater(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                placeholder="0" 
                placeholderTextColor={theme.muted}
              />

              <View style={styles.modalActions}>
                <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-outline" size={18} color={theme.text} />
                  <AppText style={styles.btnText}>{t("common.cancel")}</AppText>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnSubmit]} onPress={handleReport}>
                  <Ionicons name="send-outline" size={18} color={theme.background} />
                  <AppText style={[styles.btnText, { color: theme.background }]}>{t("common.confirm")}</AppText>
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
    paddingTop: 34,
    paddingBottom: 26,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 18,
  },
  meterRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },
  meterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meterValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.muted,
    marginBottom: 4,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.text,
  },
  summaryMoney: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.primary,
    marginTop: 2,
  },
  meterCards: {
    gap: 12,
    marginTop: 14,
  },
  reportButton: {
    marginTop: 18,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginTop: 24,
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 10,
    padding: 14,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyMonth: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.text,
  },
  historyTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.primary,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyText: {
    fontSize: 12,
    color: theme.muted,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginTop: 10,
  },
  emptyHint: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 4,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnCancel: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSubmit: {
    backgroundColor: theme.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
});
