import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { Contract } from "../types/Contract";
import { useAppTheme } from "../contexts/ThemeContext";
import ProgressStepper from "./ui/ProgressStepper";
import AppButton from "./ui/AppButton";
import { formatCurrency, formatMeterReading, unformatNumber } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSign: (contract: Contract) => Promise<void>;
};

export default function SignContractWizard({ visible, contract, onClose, onSign }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);

  const steps = [
    { label: t("contracts.roomInfo"), icon: "home-outline" as const },
    { label: t("nav.services"), icon: "flash-outline" as const },
    { label: t("contracts.terms"), icon: "document-text-outline" as const },
    { label: t("contracts.signContract"), icon: "create-outline" as const },
  ];

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!contract) return null;

  const handleSign = async () => {
    if (!agreed) return;
    try {
      setSubmitting(true);
      await onSign(contract);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.roomInfo")}</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("common.room")}:</AppText>
              <AppText style={styles.infoValue}>{contract.room}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.rentFee")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.rentFee))}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.deposit")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.deposit))}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.startDate")} - {t("contracts.endDate")}:</AppText>
              <AppText style={styles.infoValue}>{contract.startDate} - {contract.endDate}</AppText>
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("nav.services")}</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.electricityPrice")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.electric))} / kWh</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.initialElec")}:</AppText>
              <AppText style={styles.infoValue}>{formatMeterReading(contract.meterTerms.initialElectricity)} kWh</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.waterPrice")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.water))} / m³</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.initialWater")}:</AppText>
              <AppText style={styles.infoValue}>{formatMeterReading(contract.meterTerms.initialWater)} m³</AppText>
            </View>

            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.parking")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.parking))}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Internet:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.internet))}</AppText>
            </View>
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.terms")}</AppText>
            <AppText style={styles.termsText}>
              1. {t("contracts.deposit")} & {t("contracts.rentFee")}{"\n\n"}
              2. {t("contracts.startDate")} - {t("contracts.endDate")}{"\n\n"}
              3. TroHub Standard Terms.
            </AppText>
          </ScrollView>
        );
      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.signContract")}</AppText>
            <AppText style={styles.confirmText}>
              {contract.tenantName} - {t("common.room")} {contract.room}.
            </AppText>
            <Pressable 
              style={[styles.checkboxContainer, agreed && styles.checkboxActive]} 
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color={theme.background} />}
              </View>
              <AppText style={styles.checkboxLabel}>{t("contracts.signContract")}</AppText>
            </Pressable>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={submitting ? () => undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.wizardContent} accessibilityViewIsModal>
          <View style={styles.wizardHeader}>
            <View>
              <AppText
                ref={titleRef}
                style={styles.wizardTitle}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                {t("contracts.signContract")}
              </AppText>
              <AppText style={styles.wizardSubtitle}>{t("contracts.roomInfo")}</AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={24} color={theme.muted} />
            </Pressable>
          </View>

          <View style={styles.stepperContainer}>
            <ProgressStepper steps={steps} currentStep={currentStep - 1} />
          </View>

          <View style={styles.wizardBody}>
            {renderStepContent()}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerActions}>
              {currentStep > 1 && (
                <AppButton variant="secondary" icon="chevron-back" onPress={() => setCurrentStep(prev => prev - 1)}>
                  {t("common.back")}
                </AppButton>
              )}
              <AppButton
                style={currentStep === 1 ? { marginLeft: "auto" } : undefined}
                onPress={() => {
                  if (currentStep < 4) setCurrentStep(prev => prev + 1);
                  else handleSign();
                }}
                disabled={(currentStep === 4 && !agreed) || submitting}
                loading={submitting}
                icon={currentStep < 4 ? "arrow-forward" : "create-outline"}
                iconPosition="right"
              >
                {currentStep < 4 ? t("common.confirm") : t("contracts.signContract")}
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "flex-start",
    paddingTop: 45,
  },
  wizardContent: {
    backgroundColor: theme.background,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  wizardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: theme.surface,
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.text,
  },
  wizardSubtitle: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    justifyContent: "space-between",
  },
  wizardBody: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  infoLabel: {
    fontSize: 15,
    color: theme.muted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  termsText: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 24,
  },
  confirmText: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  checkboxActive: {
    borderColor: theme.primary,
    backgroundColor: theme.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.muted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  warningText: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});
