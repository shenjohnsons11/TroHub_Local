import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import AppButton from "../ui/AppButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";
import { formatCurrency, formatMeterReading, formatNumberInput, parseMeterReading, unformatNumber } from "../../utils/formatters";
import { getMeterPreview } from "../../utils/meter-reading";
import { MeterReadingCard } from "../ui/meter-reading-card";
import type { CheckoutPreview } from "../../services/adminService";

type CheckoutModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { electricityNew: string; waterNew: string; damage: string; note: string }) => void;
  loading?: boolean;
  preview?: CheckoutPreview | null;
  previewLoading?: boolean;
};

export default function CheckoutModal({ visible, onClose, onConfirm, loading, preview, previewLoading }: CheckoutModalProps) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const [electricityNew, setElectricityNew] = useState("");
  const [waterNew, setWaterNew] = useState("");
  const [damage, setDamage] = useState("0");
  const [note, setNote] = useState("");
  const [meterError, setMeterError] = useState("");

  useEffect(() => {
    if (!visible || !preview) return;
    setElectricityNew(formatMeterReading(preview.electricityOld));
    setWaterNew(formatMeterReading(preview.waterOld));
    setDamage("0");
    setNote("");
    setMeterError("");
  }, [preview, visible]);

  const electricityReading = parseMeterReading(electricityNew);
  const waterReading = parseMeterReading(waterNew);
  const electricityPreview = preview && electricityReading !== null ? getMeterPreview(preview.electricityOld, electricityReading, preview.electricityPrice) : null;
  const waterPreview = preview && waterReading !== null ? getMeterPreview(preview.waterOld, waterReading, preview.waterPrice) : null;
  const electricityAmount = electricityPreview?.amount || 0;
  const waterAmount = waterPreview?.amount || 0;
  const utilitiesAmount = electricityAmount + waterAmount;
  const totalDebt = (preview?.unpaidAmount || 0) + utilitiesAmount + unformatNumber(damage);
  const balance = (preview?.depositAmount || 0) - totalDebt;

  const handleConfirm = () => {
    if (!preview || electricityReading === null || electricityReading < preview.electricityOld || waterReading === null || waterReading < preview.waterOld) {
      setMeterError("Chỉ số kỳ này phải hợp lệ và không nhỏ hơn chỉ số kỳ trước.");
      return;
    }
    onConfirm({
      electricityNew: String(electricityReading),
      waterNew: String(waterReading),
      damage: String(unformatNumber(damage)),
      note,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <View style={styles.backdrop} />
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <ScrollView>
            <AppText style={[styles.title, { color: theme.text }]}>{t("mobile.checkout.title")}</AppText>

            {previewLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : preview ? (
              <View style={[styles.summary, { backgroundColor: theme.surfaceElevated }]}>
                <SummaryRow label={t("mobile.checkout.deposit")} value={formatCurrency(preview.depositAmount)} color={theme.text} />
                <SummaryRow label={t("mobile.checkout.unpaid")} value={formatCurrency(preview.unpaidAmount)} color={theme.text} />
                <SummaryRow label={t("mobile.checkout.utilities")} value={formatCurrency(utilitiesAmount)} color={theme.text} />
                <SummaryRow label={t("mobile.checkout.damage")} value={formatCurrency(unformatNumber(damage))} color={theme.text} />
                <SummaryRow label={t("mobile.checkout.totalDebt")} value={formatCurrency(totalDebt)} color={theme.text} strong />
                <AppText style={[styles.result, { color: balance < 0 ? theme.danger : theme.positive }]}>
                  {balance < 0
                    ? t("mobile.checkout.extraDebt", { amount: formatCurrency(-balance) })
                    : t("mobile.checkout.refund", { amount: formatCurrency(balance) })}
                </AppText>
              </View>
            ) : null}
            
            {preview ? <View style={styles.meterCards}>
              <MeterReadingCard icon="flash-outline" label={t("mobile.checkout.electricity")} unit="kWh" previous={preview.electricityOld} current={electricityReading ?? preview.electricityOld} unitPrice={preview.electricityPrice} editable currentInput={electricityNew} onChangeCurrent={(value) => { setMeterError(""); setElectricityNew(value); }} />
              <MeterReadingCard icon="water-outline" label={t("mobile.checkout.water")} unit="m³" previous={preview.waterOld} current={waterReading ?? preview.waterOld} unitPrice={preview.waterPrice} editable currentInput={waterNew} onChangeCurrent={(value) => { setMeterError(""); setWaterNew(value); }} />
            </View> : null}
            {meterError ? <AppText accessibilityLiveRegion="polite" style={[styles.meterError, { color: theme.danger }]}>{meterError}</AppText> : null}

            <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.checkout.damageInput")}</AppText>
            <AppTextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              keyboardType="number-pad"
              value={damage}
              onChangeText={(value) => setDamage(formatNumberInput(value))}
              placeholder="0"
              placeholderTextColor={theme.muted}
            />

            <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.checkout.note")}</AppText>
            <AppTextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, height: 80 }]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder={t("mobile.checkout.notePlaceholder")}
              placeholderTextColor={theme.muted}
            />

            <View style={styles.actions}>
              <AppButton variant="secondary" onPress={onClose} style={styles.btn}>{t("common.cancel")}</AppButton>
              <AppButton loading={loading || previewLoading} disabled={!preview || !electricityPreview || !waterPreview} onPress={handleConfirm} style={styles.btn}>{t("mobile.checkout.approve")}</AppButton>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({ label, value, color, strong = false }: { label: string; value: string; color: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <AppText style={[styles.summaryText, strong && styles.strong, { color }]}>{label}</AppText>
      <AppText style={[styles.summaryText, strong && styles.strong, { color }]}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 400 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 20 },
  summary: { padding: 16, borderRadius: 16, gap: 9 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryText: { flexShrink: 1, fontSize: 13 },
  strong: { fontWeight: "900" },
  result: { marginTop: 4, textAlign: "center", fontSize: 14, fontWeight: "900" },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  meterCards: { gap: 12, marginTop: 16 },
  meterError: { fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 10 },
  actions: { flexDirection: "row", gap: 12, marginTop: 30, marginBottom: 20 },
  btn: { flex: 1 },
});
