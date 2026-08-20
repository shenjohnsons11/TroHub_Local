import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { adminService } from "../services/adminService";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import AppButton from "../components/ui/AppButton";
import ProgressStepper from "../components/ui/ProgressStepper";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import MeterCameraModal from "../components/MeterCameraModal";
import { formatCurrency, formatMeterReading, formatNumberInput, parseMeterReading, unformatNumber } from "../utils/formatters";
import { consumePendingAIAction } from "../utils/aiActions";
import { useTranslation } from "../contexts/LanguageContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type BulkInvoiceItem = {
  contractId: string;
  roomId: string;
  room: string;
  tenant: string;
  tenantUserId: string;
  roomAmount: number;
  electricityOld: number;
  electricityNew: string;
  electricityPrice: number;
  waterOld: number;
  waterNew: string;
  waterPrice: number;
  services: number;
  selected: boolean;
};

type Props = {
  onNavigate: (tab: any, params?: any) => void;
};

export default function BulkInvoiceScreen({ onNavigate }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<BulkInvoiceItem[]>([]);
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [workflowStep, setWorkflowStep] = useState(1);
  const [scanTarget, setScanTarget] = useState<{ index: number; roomCode: string; meterType: "electricity" | "water" } | null>(null);

  const bulkSteps = [
    { label: t("invoices.period"), icon: "calendar-outline" as IconName },
    { label: t("invoices.recordMeter"), icon: "speedometer-outline" as IconName },
    { label: "Preview", icon: "eye-outline" as IconName },
    { label: t("common.send"), icon: "paper-plane-outline" as IconName },
  ];

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getBulkInvoicePreview();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      setPeriod(`${currentMonth.toString().padStart(2, "0")}/${currentYear}`);
      setDueDate(`${currentYear}-${currentMonth.toString().padStart(2, "0")}-10`);

      const initialData: BulkInvoiceItem[] = (res.previews || []).map((item: any) => ({
        contractId: item.contractId,
        roomId: item.roomId,
        room: item.room,
        tenant: item.tenant,
        tenantUserId: item.tenantUserId,
        roomAmount: item.roomAmount,
        electricityOld: item.electricityOld ?? 0,
        electricityNew: formatMeterReading(item.electricityDraft ?? item.electricityOld ?? 0),
        electricityPrice: item.electricityPrice ?? 3500,
        waterOld: item.waterOld ?? 0,
        waterNew: formatMeterReading(item.waterDraft ?? item.waterOld ?? 0),
        waterPrice: item.waterPrice ?? 15000,
        services: item.services ?? 0,
        selected: true,
      }));
      setData(initialData);
    } catch {
      notification.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, field: keyof BulkInvoiceItem, value: any) => {
    setData((current) => current.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const toggleSelection = (index: number) => {
    setData((current) => current.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const toggleSelectAll = () => {
    const nextState = !data.every((i) => i.selected);
    setData((current) => current.map((item) => ({ ...item, selected: nextState })));
  };

  const calculateTotal = (item: BulkInvoiceItem) => {
    const elecUsage = Math.max(0, (parseMeterReading(item.electricityNew) ?? item.electricityOld) - item.electricityOld);
    const waterUsage = Math.max(0, (parseMeterReading(item.waterNew) ?? item.waterOld) - item.waterOld);
    return (item.roomAmount || 0) + (elecUsage * item.electricityPrice) + (waterUsage * item.waterPrice) + (item.services || 0);
  };

  const handleSubmit = async () => {
    const selected = data.filter((i) => i.selected);
    if (selected.length === 0) {
      notification.error(t("common.noData"));
      return;
    }

    try {
      setSubmitting(true);
      const invoicesPayload = selected.map((item) => ({
        contractId: item.contractId,
        roomId: item.roomId,
        tenantUserId: item.tenantUserId,
        period,
        dueDate,
        room: item.room,
        tenant: item.tenant,
        roomAmount: item.roomAmount,
        electricityOld: item.electricityOld,
        electricityNew: parseMeterReading(item.electricityNew) ?? item.electricityOld,
        electricityPrice: item.electricityPrice,
        waterOld: item.waterOld,
        waterNew: parseMeterReading(item.waterNew) ?? item.waterOld,
        waterPrice: item.waterPrice,
        services: item.services,
        discount: 0,
        total: calculateTotal(item),
        status: 1,
      }));

      await adminService.createBulkInvoices({ invoices: invoicesPayload });
      notification.success(t("common.success"));
      onNavigate("invoice");
    } catch {
      notification.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = data.filter((i) => i.selected).length;
  const allSelected = data.length > 0 && selectedCount === data.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} size="large" />
        <AppText style={styles.loadingText}>{t("common.loading")}</AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t("common.back")} accessibilityRole="button" onPress={() => onNavigate("invoice")} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" style={styles.title}>{t("invoices.title")}</AppText>
          <AppText style={styles.headerSubtitle}>{t("invoices.period")}: {period}</AppText>
        </View>
        <Pressable
          accessibilityLabel={t("common.all")}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allSelected }}
          onPress={toggleSelectAll}
          style={styles.headerButton}
        >
          <Ionicons name={allSelected ? "checkbox" : "square-outline"} size={23} color={theme.primary} />
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.contractId}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.stepperCard}>
              <ProgressStepper steps={bulkSteps} currentStep={workflowStep} />
            </View>
            <AnimatedEntry>
              <GradientHero
                icon="receipt-outline"
                label={t("invoices.title")}
                value={`${selectedCount}/${data.length} ${t("nav.rooms")}`}
                detail={t("invoices.period")}
              />
            </AnimatedEntry>
            <View style={styles.sectionHeading}>
              <AppText style={styles.sectionTitle}>{t("invoices.recordMeter")}</AppText>
              <AppText style={styles.sectionSubtitle}>{t("dashboard.property")}</AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            kind="invoice"
            title={t("common.noData")}
            description={t("invoices.emptyDescription")}
          />
        }
        renderItem={({ item, index }) => {
          const total = calculateTotal(item);
          return (
            <AnimatedEntry delay={Math.min(index, 5) * 45}>
              <View style={[styles.card, !item.selected && styles.cardUnselected]}>
                <View style={styles.cardHeader}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.selected }}
                    accessibilityLabel={item.room}
                    onPress={() => toggleSelection(index)}
                    style={styles.roomIdentity}
                  >
                    <View style={styles.roomIcon}>
                      <Ionicons name={item.selected ? "checkbox" : "square-outline"} size={23} color={item.selected ? theme.primary : theme.muted} />
                    </View>
                    <View>
                      <AppText style={styles.roomText}>{t("common.room")} {item.room}</AppText>
                      <AppText style={styles.tenantText}>{item.tenant}</AppText>
                    </View>
                  </Pressable>
                </View>

                <AppText style={styles.totalValue}>{formatCurrency(total)}</AppText>
                <AppText style={styles.totalLabel}>{t("invoices.totalAmount")}</AppText>

                <View style={styles.tintedSection}>
                  <View style={styles.inputRow}>
                    <InvoiceField label={t("invoices.roomFee")} iconColor={theme.primary} styles={styles}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        value={item.roomAmount !== undefined ? formatNumberInput(item.roomAmount) : ""}
                        onChangeText={(value) => handleInputChange(index, "roomAmount", unformatNumber(value))}
                      />
                    </InvoiceField>
                    <InvoiceField label={`${t("invoices.serviceFee")} (Internet, Xe, Rác...)`} iconColor={theme.primary} styles={styles}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        value={item.services !== undefined ? formatNumberInput(item.services) : ""}
                        onChangeText={(value) => handleInputChange(index, "services", unformatNumber(value))}
                      />
                    </InvoiceField>

                  </View>
                  <View style={styles.inputRow}>
                    <InvoiceField label={`${t("utilities.oldElec")} · ${formatMeterReading(item.electricityOld) || "0"} kWh`} icon="flash-outline" iconColor={theme.primary} styles={styles} accessory={<Pressable accessibilityRole="button" accessibilityLabel={`Scan ${item.room}`} disabled={!item.selected || submitting || item.electricityPrice <= 0} onPress={() => setScanTarget({ index, roomCode: item.room, meterType: "electricity" })} style={styles.scanInline}><Ionicons name="camera-outline" size={14} color={theme.primary} /><AppText style={styles.scanInlineText}>OCR</AppText></Pressable>}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.muted}
                        keyboardType="decimal-pad"
                        value={item.electricityNew !== undefined ? item.electricityNew : ""}
                        onChangeText={(value) => handleInputChange(index, "electricityNew", value)}
                      />
                    </InvoiceField>
                    <InvoiceField label={`${t("utilities.oldWater")} · ${formatMeterReading(item.waterOld) || "0"} m³`} icon="water-outline" iconColor={theme.primary} styles={styles} accessory={<Pressable accessibilityRole="button" accessibilityLabel={`Scan ${item.room}`} disabled={!item.selected || submitting || item.waterPrice <= 0} onPress={() => setScanTarget({ index, roomCode: item.room, meterType: "water" })} style={styles.scanInline}><Ionicons name="camera-outline" size={14} color={theme.primary} /><AppText style={styles.scanInlineText}>OCR</AppText></Pressable>}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.muted}
                        keyboardType="decimal-pad"
                        value={item.waterNew !== undefined ? item.waterNew : ""}
                        onChangeText={(value) => handleInputChange(index, "waterNew", value)}
                      />
                    </InvoiceField>
                  </View>
                </View>
              </View>
            </AnimatedEntry>
          );
        }}
      />

      <View style={styles.footer}>
        <AppButton
          icon="paper-plane-outline"
          iconPosition="right"
          loading={submitting}
          disabled={submitting || data.length === 0}
          onPress={() => void handleSubmit()}
        >
          {`${t("common.send")} (${selectedCount})`}
        </AppButton>
      </View>
      <MeterCameraModal
        visible={Boolean(scanTarget)}
        roomCode={scanTarget?.roomCode || ""}
        initialMeterType={scanTarget?.meterType || "electricity"}
        onClose={() => setScanTarget(null)}
        onRead={(meterType, digits) => {
          if (!scanTarget) return;
          setData((current) => current.map((item, index) => index === scanTarget.index ? { ...item, [meterType === "electricity" ? "electricityNew" : "waterNew"]: formatMeterReading(digits) } : item));
          notification.success(t("common.success"));
        }}
      />
    </KeyboardAvoidingView>
  );
}

function InvoiceField({ label, icon, iconColor, children, styles, accessory }: { label: string; icon?: IconName; iconColor: string; children: React.ReactNode; styles: any; accessory?: React.ReactNode }) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        {icon ? <Ionicons name={icon} size={15} color={iconColor} /> : null}
        <AppText style={styles.inputLabel}>{label}</AppText>
        {accessory}
      </View>
      {children}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: theme.background },
    loadingText: { color: theme.muted, fontSize: 13, fontWeight: "700" },
    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 50 : 18, paddingBottom: 14, backgroundColor: theme.surface },
    headerButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    headerCopy: { flex: 1 },
    title: { color: theme.text, fontSize: 18, fontWeight: "900" },
    headerSubtitle: { color: theme.muted, fontSize: 10, marginTop: 2 },
    listContainer: { padding: 16, paddingBottom: 28 },
    stepperCard: { backgroundColor: theme.surface, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 16, marginBottom: 14 },
    sectionHeading: { marginTop: 22, marginBottom: 12 },
    sectionTitle: { color: theme.text, fontSize: 20, fontWeight: "900" },
    sectionSubtitle: { color: theme.muted, fontSize: 12, marginTop: 3 },
    card: { backgroundColor: theme.surface, borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: theme.text, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 4 },
    cardUnselected: { opacity: 0.55 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between" },
    roomIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    roomIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    roomText: { color: theme.text, fontSize: 16, fontWeight: "900" },
    tenantText: { color: theme.muted, fontSize: 12, marginTop: 2 },
    totalValue: { color: theme.text, fontSize: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 18 },
    totalLabel: { color: theme.muted, fontSize: 11, marginTop: 2, marginBottom: 16 },
    tintedSection: { padding: 14, borderRadius: 18, backgroundColor: theme.primarySoft, gap: 12 },
    inputRow: { flexDirection: "row", gap: 10 },
    inputGroup: { flex: 1 },
    inputLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
    inputLabel: { color: theme.muted, fontSize: 11, fontWeight: "800" },
    input: { minHeight: 46, borderRadius: 15, paddingHorizontal: 12, backgroundColor: theme.surfaceElevated, color: theme.text, fontSize: 14 },
    noMeterText: { minHeight: 46, color: theme.muted, fontSize: 11, paddingTop: 14 },
    scanInline: { marginLeft: "auto", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 8, backgroundColor: theme.surfaceElevated },
    scanInlineText: { color: theme.primary, fontSize: 10, fontWeight: "900" },
    footer: { padding: 14, paddingBottom: Platform.OS === "ios" ? 28 : 14, backgroundColor: theme.surface, shadowColor: theme.text, shadowOpacity: 0.1, shadowOffset: { width: 0, height: -5 }, shadowRadius: 14, elevation: 8 },
  });
}
