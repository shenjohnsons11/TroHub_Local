import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Contract } from "../types/Contract";

type Props = {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSign: (contract: Contract) => Promise<void>;
};

export default function SignContractWizard({ visible, contract, onClose, onSign }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
            <Text style={styles.sectionTitle}>Thông tin Phòng & Tiền thuê</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phòng:</Text>
              <Text style={styles.infoValue}>{contract.room}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền thuê hàng tháng:</Text>
              <Text style={styles.infoValue}>{contract.rentFee}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền cọc:</Text>
              <Text style={styles.infoValue}>{contract.deposit}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời hạn hợp đồng:</Text>
              <Text style={styles.infoValue}>{contract.startDate} - {contract.endDate}</Text>
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Phí Dịch vụ</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền điện:</Text>
              <Text style={styles.infoValue}>{contract.serviceFees.electric}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền nước:</Text>
              <Text style={styles.infoValue}>{contract.serviceFees.water}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gửi xe:</Text>
              <Text style={styles.infoValue}>{contract.serviceFees.parking}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Internet:</Text>
              <Text style={styles.infoValue}>{contract.serviceFees.internet}</Text>
            </View>
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Điều khoản Hợp đồng</Text>
            <Text style={styles.termsText}>
              1. Bên thuê cam kết thanh toán đầy đủ tiền thuê và phí dịch vụ đúng hạn.{"\n\n"}
              2. Không sử dụng phòng cho các mục đích vi phạm pháp luật.{"\n\n"}
              3. Giữ gìn vệ sinh chung, không làm ồn ào ảnh hưởng đến người khác.{"\n\n"}
              4. Bồi thường nếu làm hư hỏng tài sản trong phòng.{"\n\n"}
              5. Báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước hạn.
            </Text>
          </ScrollView>
        );
      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Ký xác nhận</Text>
            <Text style={styles.confirmText}>
              Tôi, {contract.tenantName}, đã đọc và đồng ý với tất cả các điều khoản trong hợp đồng thuê phòng {contract.room}.
            </Text>
            <Pressable 
              style={[styles.checkboxContainer, agreed && styles.checkboxActive]} 
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Tôi đồng ý ký kết hợp đồng này</Text>
            </Pressable>
            <Text style={styles.warningText}>
              Lưu ý: Sau khi ký xác nhận, hệ thống sẽ tạo một hóa đơn Tiền Cọc. Hợp đồng chỉ có hiệu lực khi bạn hoàn tất thanh toán hóa đơn cọc.
            </Text>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.wizardContent}>
          {/* Header */}
          <View style={styles.wizardHeader}>
            <View>
              <Text style={styles.wizardTitle}>Ký hợp đồng thuê phòng</Text>
              <Text style={styles.wizardSubtitle}>Đọc kỹ thông tin trước khi xác nhận.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </Pressable>
          </View>

          {/* Stepper (Progress Bar Style 1) */}
          <View style={styles.stepperContainer}>
            {[
              { num: 1, label: 'Thông tin' },
              { num: 2, label: 'Dịch vụ' },
              { num: 3, label: 'Điều khoản' },
              { num: 4, label: 'Ký tên' },
            ].map((step, index) => {
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <View key={step.num} style={styles.stepItemWrapper}>
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepCircle,
                      isCompleted ? styles.stepCircleCompleted : isActive ? styles.stepCircleActive : styles.stepCircleInactive
                    ]}>
                      <Text style={[
                        styles.stepNumText,
                        (isCompleted || isActive) ? styles.stepNumTextActive : styles.stepNumTextInactive
                      ]}>
                        {isCompleted ? '✓' : step.num}
                      </Text>
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
                    </View>
                  </View>
                  {index < 3 && (
                    <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Body */}
          <View style={styles.wizardBody}>
            {renderStepContent()}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.footerActions}>
              {currentStep > 1 && (
                <Pressable style={styles.backBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
                  <Ionicons name="chevron-back" size={16} color={COLORS.text} />
                  <Text style={styles.backBtnText}>Quay lại</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.nextBtn,
                  currentStep === 1 && { marginLeft: 'auto' },
                  (currentStep === 4 && !agreed) && styles.nextBtnDisabled,
                  submitting && styles.nextBtnDisabled
                ]}
                onPress={() => {
                  if (currentStep < 4) setCurrentStep(prev => prev + 1);
                  else handleSign();
                }}
                disabled={(currentStep === 4 && !agreed) || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.nextBtnText}>{currentStep < 4 ? 'Tiếp tục' : 'Ký xác nhận'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    justifyContent: "flex-start",
    paddingTop: 45, // Safe area
  },
  wizardContent: {
    backgroundColor: "#F4F5F7",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  wizardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  wizardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
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
    backgroundColor: "#FFFFFF",
  },
  stepCircleInactive: {
    borderColor: "#E8E9ED",
  },
  stepCircleActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange,
  },
  stepCircleCompleted: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange,
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepNumTextInactive: {
    color: COLORS.muted,
  },
  stepNumTextActive: {
    color: "#FFFFFF",
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
    color: COLORS.muted,
    fontWeight: "700",
    textAlign: "center",
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: "900",
  },
  stepLine: {
    position: "absolute",
    top: 15,
    left: "50%",
    width: "100%",
    height: 3,
    backgroundColor: "#E8E9ED",
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.orange,
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
    color: COLORS.text,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  termsText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  confirmText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    marginBottom: 20,
  },
  checkboxActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeSoft,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.red,
    lineHeight: 20,
    fontStyle: "italic",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E9ED",
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
    backgroundColor: "#F4F5F7",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 4,
  },
  nextBtn: {
    backgroundColor: COLORS.orange,
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
