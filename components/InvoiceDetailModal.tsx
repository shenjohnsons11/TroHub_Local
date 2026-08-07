import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Invoice } from "../types/Invoice";
import { useAppTheme } from "../contexts/ThemeContext";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  invoice: Invoice | null;
  role?: "admin" | "tenant";
  onClose: () => void;
  onPay?: (invoiceId: string) => void;
  onConfirmPaid?: (invoiceId: string) => void;
};

export default function InvoiceDetailModal({
  visible,
  invoice,
  role = "tenant",
  onClose,
  onPay,
  onConfirmPaid,
}: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const titleRef = useRef<Text>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} accessibilityViewIsModal>
          {invoice && (
            <>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBox}>
                  <Text
                    ref={titleRef}
                    style={styles.modalTitle}
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                  >
                    {t("invoiceDetail.title")}
                  </Text>
                  <Text style={styles.modalSub}>
                    {t("invoiceDetail.subtitle", { month: invoice.month, room: invoice.room })}
                  </Text>
                </View>

                <Pressable
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t("invoiceDetail.close")}
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.amountHero}>
                <Text style={styles.amountHeroLabel}>{t("invoiceDetail.totalDue")}</Text>
                <Text style={styles.amountHeroValue}>{invoice.amount}</Text>
              </View>
              <View style={styles.identityBlock}>
                <Text style={styles.identityText}>{t("invoiceDetail.tenant", { name: invoice.tenantName || t("invoiceDetail.notUpdated") })}</Text>
                <Text style={styles.identityText}>{t("invoiceDetail.phone", { phone: invoice.tenantPhone || t("invoiceDetail.notUpdated") })}</Text>
                <Text style={styles.identityText}>{t("invoiceDetail.room", { room: invoice.room || t("invoiceDetail.notUpdated") })}</Text>
              </View>
              <ScrollView style={styles.lines} showsVerticalScrollIndicator={false}>
              {invoice.type === "deposit" ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t("invoiceDetail.deposit")}</Text>
                <Text style={styles.detailValue}>{formatCurrency(invoice.depositAmount ?? invoice.numericAmount ?? 0)}</Text>
              </View>
              ) : (
              <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t("invoiceDetail.rent")}</Text>
                <Text style={styles.detailValue}>{invoice.details.roomFee}</Text>
              </View>

              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>{t("invoiceDetail.electricity")}</Text>
                  {invoice.details.electric.newIndex !== null && invoice.details.electric.oldIndex !== null && (
                    <Text style={styles.detailSubLabel}>
                      {t("invoiceDetail.electricReading", { next: invoice.details.electric.newIndex, previous: invoice.details.electric.oldIndex })}
                    </Text>
                  )}
                </View>
                <Text style={styles.detailValue}>{invoice.details.electric.amount}</Text>
              </View>

              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>{t("invoiceDetail.water")}</Text>
                  {invoice.details.water.newIndex !== null && invoice.details.water.oldIndex !== null && (
                    <Text style={styles.detailSubLabel}>
                      {t("invoiceDetail.waterReading", { next: invoice.details.water.newIndex, previous: invoice.details.water.oldIndex })}
                    </Text>
                  )}
                </View>
                <Text style={styles.detailValue}>{invoice.details.water.amount}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t("invoiceDetail.parking")}</Text>
                <Text style={styles.detailValue}>{invoice.details.parking}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Internet</Text>
                <Text style={styles.detailValue}>{invoice.details.internet}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t("invoiceDetail.garbage")}</Text>
                <Text style={styles.detailValue}>{invoice.details.garbage}</Text>
              </View>
              {invoice.details.otherServices !== "0đ" && invoice.details.otherServices !== "0" && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("invoiceDetail.other")}</Text>
                    <Text style={styles.detailValue}>{invoice.details.otherServices}</Text>
                  </View>
                </>
              )}
              </>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("invoiceDetail.total")}</Text>
                <Text style={styles.totalValue}>{invoice.amount}</Text>
              </View>
              </ScrollView>

              {invoice.status === "unpaid" ? (
                role === "tenant" ? (
                  <AppButton
                    icon="card-outline"
                    onPress={() => onPay && onPay(invoice.id)}
                  >
                    {t("invoiceDetail.pay")}
                  </AppButton>
                ) : (
                  <AppButton
                    icon="checkmark-circle-outline"
                    onPress={() => onConfirmPaid && onConfirmPaid(invoice.id)}
                  >
                    {t("invoiceDetail.confirm")}
                  </AppButton>
                )
              ) : (
                <View style={styles.paidBox}>
                  <Text style={styles.paidBoxText}>{t("invoiceDetail.paid")}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    maxHeight: "92%",
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  modalTitleBox: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: theme.text,
  },
  amountHero: {
    backgroundColor: theme.primarySoft,
    borderRadius: 18,
    padding: 18,
    marginBottom: 8,
  },
  amountHeroLabel: { color: theme.muted, fontSize: 12, fontWeight: "700" },
  amountHeroValue: { color: theme.primary, fontSize: 28, fontWeight: "900", marginTop: 5 },
  lines: { flexShrink: 1, flexGrow: 0 },
  identityBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  identityText: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 20,
  },
  modalSub: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 26,
    color: theme.text,
    marginTop: -2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
  },
  detailLabel: {
    color: theme.muted,
    fontSize: 14,
  },
  detailSubLabel: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  detailValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 20,
    gap: 12,
  },
  totalLabel: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "900",
  },
  totalValue: {
    color: theme.primary,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  payButton: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "900",
  },
  paidBox: {
    height: 52,
    backgroundColor: theme.positiveSoft,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paidBoxText: {
    color: theme.positive,
    fontSize: 15,
    fontWeight: "900",
  },
});
