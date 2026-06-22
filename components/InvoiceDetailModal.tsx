import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
import { Invoice } from "../types/Invoice";

type Props = {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onPay: (invoiceId: string) => void;
};

export default function InvoiceDetailModal({
  visible,
  invoice,
  onClose,
  onPay,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          {invoice && (
            <>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBox}>
                  <Text style={styles.modalTitle}>Chi tiết hóa đơn</Text>
                  <Text style={styles.modalSub}>
                    Tháng {invoice.month} • Phòng {invoice.room}
                  </Text>
                </View>

                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tiền phòng</Text>
                <Text style={styles.detailValue}>{invoice.details.roomFee}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tiền điện</Text>
                <Text style={styles.detailValue}>{invoice.details.electric}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tiền nước</Text>
                <Text style={styles.detailValue}>{invoice.details.water}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phí xe</Text>
                <Text style={styles.detailValue}>{invoice.details.parking}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Internet</Text>
                <Text style={styles.detailValue}>{invoice.details.internet}</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>{invoice.amount}</Text>
              </View>

              {invoice.status === "unpaid" ? (
                <Pressable
                  style={styles.payButton}
                  onPress={() => onPay(invoice.id)}
                >
                  <Text style={styles.payText}>Thanh toán ngay</Text>
                </Pressable>
              ) : (
                <View style={styles.paidBox}>
                  <Text style={styles.paidBoxText}>Hóa đơn đã thanh toán</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
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
    color: COLORS.text,
  },
  modalSub: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 26,
    color: COLORS.text,
    marginTop: -2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F3",
    gap: 12,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.text,
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
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  totalValue: {
    color: COLORS.orange,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  payButton: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  paidBox: {
    height: 52,
    backgroundColor: "#EAFBEF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paidBoxText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: "900",
  },
});