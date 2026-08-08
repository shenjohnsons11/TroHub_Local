import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { Contract } from "../types/Contract";
import { useAppTheme } from "../contexts/ThemeContext";
import ProgressStepper from "./ui/ProgressStepper";
import AppButton from "./ui/AppButton";

const steps = [
  { label: "Thông tin", icon: "home-outline" as const },
  { label: "Dịch vụ", icon: "flash-outline" as const },
  { label: "Điều khoản", icon: "document-text-outline" as const },
  { label: "Ký tên", icon: "create-outline" as const },
];

type Props = {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSign: (contract: Contract) => Promise<void>;
};

export default function SignContractWizard({ visible, contract, onClose, onSign }: Props) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);

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
      // Đóng modal sẽ do component cha tự xử lý sau khi ký xong
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>Thông tin Phòng & Tiền thuê</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Phòng:</AppText>
              <AppText style={styles.infoValue}>{contract.room}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Tiền thuê hàng tháng:</AppText>
              <AppText style={styles.infoValue}>{contract.rentFee}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Tiền cọc:</AppText>
              <AppText style={styles.infoValue}>{contract.deposit}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Thời hạn hợp đồng:</AppText>
              <AppText style={styles.infoValue}>{contract.startDate} - {contract.endDate}</AppText>
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>Phí Dịch vụ</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Tiền điện:</AppText>
              <AppText style={styles.infoValue}>{contract.serviceFees.electric}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Chỉ số điện đầu:</AppText>
              <AppText style={styles.infoValue}>{contract.meterTerms.initialElectricity}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Tiền nước:</AppText>
              <AppText style={styles.infoValue}>{contract.serviceFees.water}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Chỉ số nước đầu:</AppText>
              <AppText style={styles.infoValue}>{contract.meterTerms.initialWater}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Gửi xe:</AppText>
              <AppText style={styles.infoValue}>{contract.serviceFees.parking}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Internet:</AppText>
              <AppText style={styles.infoValue}>{contract.serviceFees.internet}</AppText>
            </View>
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>Điều khoản Hợp đồng</AppText>
            <AppText style={styles.termsText}>
              1. Bên thuê cam kết thanh toán đầy đủ tiền thuê và phí dịch vụ đúng hạn.{"\n\n"}
              2. Không sử dụng phòng cho các mục đích vi phạm pháp luật.{"\n\n"}
              3. Giữ gìn vệ sinh chung, không làm ồn ào ảnh hưởng đến người khác.{"\n\n"}
              4. Bồi thường nếu làm hư hỏng tài sản trong phòng.{"\n\n"}
              5. Báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước hạn.
            </AppText>
          </ScrollView>
        );
      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>Ký xác nhận</AppText>
            <AppText style={styles.confirmText}>
              Tôi, {contract.tenantName}, đã đọc và đồng ý với tất cả các điều khoản trong hợp đồng thuê phòng {contract.room}.
            </AppText>
            <Pressable 
              style={[styles.checkboxContainer, agreed && styles.checkboxActive]} 
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color={theme.background} />}
              </View>
              <AppText style={styles.checkboxLabel}>Tôi đồng ý ký kết hợp đồng này</AppText>
            </Pressable>
            <AppText style={styles.warningText}>
              Lưu ý: Sau khi ký xác nhận, hệ thống sẽ tạo một hóa đơn Tiền Cọc. Hợp đồng chỉ có hiệu lực khi bạn hoàn tất thanh toán hóa đơn cọc.
            </AppText>
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
          {/* Header */}
          <View style={styles.wizardHeader}>
            <View>
              <AppText
                ref={titleRef}
                style={styles.wizardTitle}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                Ký hợp đồng thuê phòng
              </AppText>
              <AppText style={styles.wizardSubtitle}>Đọc kỹ thông tin trước khi xác nhận.</AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Đóng ký hợp đồng"
            >
              <Ionicons name="close" size={24} color={theme.muted} />
            </Pressable>
          </View>

          {/* Stepper (Progress Bar Style 1) */}
          <View style={styles.stepperContainer}>
            <ProgressStepper steps={steps} currentStep={currentStep - 1} />
          </View>

          {/* Body */}
          <View style={styles.wizardBody}>
            {renderStepContent()}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.footerActions}>
              {currentStep > 1 && (
                <AppButton variant="secondary" icon="chevron-back" onPress={() => setCurrentStep(prev => prev - 1)}>
                  Quay lại
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
                {currentStep < 4 ? "Tiếp tục" : "Ký xác nhận"}
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
    paddingTop: 45, // Safe area
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
    marginBottom: 4,
  },
  wizardSubtitle: {
    fontSize: 13,
    color: theme.muted,
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
  stepItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stepItem: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: theme.surfaceElevated,
  },
  stepCircleInactive: {
    borderColor: theme.border,
  },
  stepCircleActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  stepCircleCompleted: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepNumTextInactive: {
    color: theme.muted,
  },
  stepNumTextActive: {
    color: theme.background,
  },
  stepTextContainer: {
    alignItems: "center",
    marginTop: 8,
    position: "absolute",
    top: 36,
    width: 80,
  },
  stepLabel: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700",
    textAlign: "center",
  },
  stepLabelActive: {
    color: theme.text,
    fontWeight: "900",
  },
  stepLine: {
    position: "absolute",
    top: 15,
    left: "50%",
    width: "100%",
    height: 3,
    backgroundColor: theme.border,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: theme.primary,
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
    marginBottom: 20,
  },
  checkboxActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.border,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  warningText: {
    fontSize: 13,
    color: theme.danger,
    lineHeight: 20,
    fontStyle: "italic",
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
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.surfaceElevated,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginLeft: 4,
  },
  nextBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "800",
  },
});
