import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { invoiceService } from "../services/invoiceService";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";
import { useAppTheme } from "../contexts/ThemeContext";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import ProgressStepper from "../components/ui/ProgressStepper";
import MeterCameraModal from "../components/MeterCameraModal";
import { formatCurrency, formatMeterReading, formatNumberInput, parseMeterReading, unformatNumber } from "../utils/formatters";
import type { MeterType } from "../utils/meterReadingTarget";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const bulkSteps: { label: string; icon: IconName }[] = [
  { label: "Chọn kỳ", icon: "calendar-outline" },
  { label: "Chốt điện/nước", icon: "speedometer-outline" },
  { label: "Preview", icon: "eye-outline" },
  { label: "Phát hành", icon: "paper-plane-outline" },
];

export default function BulkInvoiceScreen({ onNavigate, params }: { onNavigate: (tab: any) => void; params?: any }) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [scanTarget, setScanTarget] = useState<{ index: number; roomCode: string; meterType: MeterType } | null>(null);

  useEffect(() => {
    void loadData();
    // Keep the original mount-only fetch contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getBulkPreview();
      setData((res || []).map((item) => ({
        ...item,
        selected: true,
        electricityNew: item.electricityDraft !== undefined ? formatMeterReading(item.electricityDraft) : "",
        waterNew: item.waterDraft !== undefined ? formatMeterReading(item.waterDraft) : "",
      })));
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải dữ liệu hóa đơn."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const action = params?.aiAction;
    if (action?.type !== "FILL_UTILITY_READING" || !data.length) return;
    setData((current) => current.map((item) => item.room?.trim().toLowerCase() === action.roomCode?.trim().toLowerCase() ? { ...item, electricityNew: formatMeterReading(action.newElec), waterNew: formatMeterReading(action.newWater), aiAction: true } : item));
  }, [params?.aiAction, data.length]);

  const handleInputChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    const isMeter = field === "electricityNew" || field === "waterNew";
    newData[index][field] = isMeter && parseMeterReading(value) !== null ? formatMeterReading(value) : isMeter ? value : formatNumberInput(value);
    setData(newData);
  };

  const toggleSelection = (index: number) => {
    const newData = [...data];
    newData[index].selected = !newData[index].selected;
    setData(newData);
  };

  const toggleSelectAll = () => {
    const allSelected = data.every((item) => item.selected);
    setData(data.map((item) => ({ ...item, selected: !allSelected })));
  };

  const calculateTotal = (item: any) => {
    const eOld = item.electricityOld || 0;
    const eNew = parseMeterReading(item.electricityNew) ?? eOld;
    const wOld = item.waterOld || 0;
    const wNew = parseMeterReading(item.waterNew) ?? wOld;
    const eAmount = Math.round(Math.max(0, eNew - eOld) * (item.electricityPrice || 0));
    const wAmount = Math.round(Math.max(0, wNew - wOld) * (item.waterPrice || 0));
    return unformatNumber(item.roomAmount) + unformatNumber(item.services) + eAmount + wAmount;
  };

  const handleSubmit = async () => {
    const selectedData = data.filter((item) => item.selected);
    if (selectedData.length === 0) {
      notification.warning("Vui lòng chọn ít nhất 1 phòng để tạo hóa đơn.");
      return;
    }

    let hasError = false;
    for (const item of selectedData) {
      if (item.electricityPrice > 0) {
        if (item.electricityNew === undefined || item.electricityNew === "") hasError = true;
        if ((parseMeterReading(item.electricityNew) ?? -1) < item.electricityOld) hasError = true;
      } else {
        item.electricityNew = item.electricityOld;
      }
      if (item.waterPrice > 0) {
        if (item.waterNew === undefined || item.waterNew === "") hasError = true;
        if ((parseMeterReading(item.waterNew) ?? -1) < item.waterOld) hasError = true;
      } else {
        item.waterNew = item.waterOld;
      }
    }

    if (hasError) {
      notification.warning("Vui lòng nhập đầy đủ chỉ số mới. Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }

    setWorkflowStep(2);
    const confirmed = await notification.confirm({
      title: "Phát hành hóa đơn",
      message: `Phát hành ${selectedData.length} hóa đơn cùng lúc?`,
      confirmText: "Phát hành",
    });
    if (!confirmed) return setWorkflowStep(1);

    setSubmitting(true);
    setWorkflowStep(3);
    const closeLoading = notification.loading("Đang phát hành hóa đơn...");
    try {
      const invoices = selectedData.map((item) => ({
        ...item,
        roomAmount: unformatNumber(item.roomAmount),
        services: unformatNumber(item.services),
        electricityNew: parseMeterReading(item.electricityNew) ?? item.electricityOld,
        waterNew: parseMeterReading(item.waterNew) ?? item.waterOld,
      }));
      await invoiceService.bulkCreate({ invoices });
      notification.success("Đã tạo hóa đơn hàng loạt.");
      onNavigate("invoice");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tạo hóa đơn."));
      setWorkflowStep(1);
    } finally {
      closeLoading();
      setSubmitting(false);
    }
  };

  const styles = createStyles(theme);
  const selectedCount = data.filter((item) => item.selected).length;
  const allSelected = data.length > 0 && data.every((item) => item.selected);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <AppText style={styles.loadingText}>Đang chuẩn bị kỳ hóa đơn...</AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Quay lại hóa đơn" accessibilityRole="button" onPress={() => onNavigate("invoice")} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" style={styles.title}>Lập hóa đơn hàng loạt</AppText>
          <AppText style={styles.headerSubtitle}>Kỳ hiện tại đã được hệ thống chuẩn bị.</AppText>
        </View>
        <Pressable
          accessibilityLabel={allSelected ? "Bỏ chọn tất cả phòng" : "Chọn tất cả phòng"}
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
                label="KỲ HÓA ĐƠN SẴN SÀNG"
                value={`${selectedCount}/${data.length} phòng`}
                detail="Kiểm tra chỉ số điện, nước và tổng tiền trước khi phát hành."
              />
            </AnimatedEntry>
            <View style={styles.sectionHeading}>
              <AppText style={styles.sectionTitle}>Chốt điện & nước</AppText>
              <AppText style={styles.sectionSubtitle}>Nhập chỉ số mới cho từng phòng được chọn.</AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            kind="invoice"
            title="Chưa có dữ liệu lập hóa đơn"
            description="Không có hợp đồng nào đang hiệu lực để lập hóa đơn trong kỳ này."
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
                    accessibilityLabel={`Chọn phòng ${item.room}`}
                    onPress={() => toggleSelection(index)}
                    style={styles.roomIdentity}
                  >
                    <View style={styles.roomIcon}>
                      <Ionicons name={item.selected ? "checkbox" : "square-outline"} size={23} color={item.selected ? theme.primary : theme.muted} />
                    </View>
                    <View>
                      <AppText style={styles.roomText}>Phòng {item.room}</AppText>
                      <AppText style={styles.tenantText}>{item.tenant}</AppText>
                    </View>
                  </Pressable>
                </View>

                <AppText style={styles.totalValue}>{formatCurrency(total)}</AppText>
                <AppText style={styles.totalLabel}>Tổng dự kiến</AppText>

                <View style={styles.tintedSection}>
                  <View style={styles.inputRow}>
                    <InvoiceField label="Tiền phòng" iconColor={theme.primary} styles={styles}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="Tiền phòng"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        value={item.roomAmount !== undefined ? formatNumberInput(item.roomAmount) : ""}
                        onChangeText={(value) => handleInputChange(index, "roomAmount", value)}
                      />
                    </InvoiceField>
                    <InvoiceField label="Phí dịch vụ" iconColor={theme.primary} styles={styles}>
                      <AppTextInput
                        style={styles.input}
                        placeholder="Dịch vụ"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        value={item.services !== undefined ? formatNumberInput(item.services) : ""}
                        onChangeText={(value) => handleInputChange(index, "services", value)}
                      />
                    </InvoiceField>
                  </View>
                  <View style={styles.inputRow}>
                    <InvoiceField label={`Điện cũ · ${formatMeterReading(item.electricityOld) || "0"} kWh`} icon="flash-outline" iconColor={theme.primary} styles={styles} accessory={<Pressable accessibilityRole="button" accessibilityLabel={`Quét đồng hồ điện phòng ${item.room}`} disabled={!item.selected || submitting || item.electricityPrice <= 0} onPress={() => setScanTarget({ index, roomCode: item.room, meterType: "electricity" })} style={styles.scanInline}><Ionicons name="camera-outline" size={14} color={theme.primary} /><AppText style={styles.scanInlineText}>Quét</AppText></Pressable>}>
                      {item.electricityPrice > 0 ? (
                        <AppTextInput
                          style={styles.input}
                          placeholder="Điện mới"
                          placeholderTextColor={theme.muted}
                          keyboardType="decimal-pad"
                          value={item.electricityNew !== undefined ? item.electricityNew : ""}
                          onChangeText={(value) => handleInputChange(index, "electricityNew", value)}
                        />
                      ) : (
                        <AppText style={styles.noMeterText}>Không tính theo khối</AppText>
                      )}
                    </InvoiceField>
                    <InvoiceField label={`Nước cũ · ${formatMeterReading(item.waterOld) || "0"} m³`} icon="water-outline" iconColor={theme.primary} styles={styles} accessory={<Pressable accessibilityRole="button" accessibilityLabel={`Quét đồng hồ nước phòng ${item.room}`} disabled={!item.selected || submitting || item.waterPrice <= 0} onPress={() => setScanTarget({ index, roomCode: item.room, meterType: "water" })} style={styles.scanInline}><Ionicons name="camera-outline" size={14} color={theme.primary} /><AppText style={styles.scanInlineText}>Quét</AppText></Pressable>}>
                      {item.waterPrice > 0 ? (
                        <AppTextInput
                          style={styles.input}
                          placeholder="Nước mới"
                          placeholderTextColor={theme.muted}
                          keyboardType="decimal-pad"
                          value={item.waterNew !== undefined ? item.waterNew : ""}
                          onChangeText={(value) => handleInputChange(index, "waterNew", value)}
                        />
                      ) : (
                        <AppText style={styles.noMeterText}>Không tính theo khối</AppText>
                      )}
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
          {`Phát hành ${selectedCount} hóa đơn`}
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
          notification.success(`Đã điền chỉ số ${meterType === "electricity" ? "điện" : "nước"} phòng ${scanTarget.roomCode}.`);
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
