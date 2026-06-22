import React, { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Image } from "react-native";
import { COLORS } from "../constants/theme";
import { Invoice } from "../types/Invoice";

type PaymentMethod = "bank" | "vnpay" | "zalopay";

type Props = {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm: (invoiceId: string) => void;
};

export default function PaymentModal({
  visible,
  invoice,
  onClose,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("bank");

  if (!invoice) return null;

  const handleConfirm = () => {
    onConfirm(invoice.id);
    onClose();
  };

  const numericAmount = parseInt(invoice.amount.replace(/[^0-9]/g, ""), 10) || 0;
  const qrUrl = `https://img.vietqr.io/image/MB-0123456789-compact2.jpg?amount=${numericAmount}&addInfo=${encodeURIComponent(
    invoice.room + " thang " + invoice.month.replace("/", "-")
  )}&accountName=TROHUB`;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Thanh toán</Text>
              <Text style={styles.subtitle}>
                Hóa đơn tháng {invoice.month} • Phòng {invoice.room}
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Tổng tiền thanh toán</Text>
            <Text style={styles.amount}>{invoice.amount}</Text>
          </View>

          <View style={styles.methodRow}>
            <Pressable
              style={[styles.methodButton, method === "bank" && styles.methodActive]}
              onPress={() => setMethod("bank")}
            >
              <Text
                style={[
                  styles.methodText,
                  method === "bank" && styles.methodTextActive,
                ]}
              >
                QR ngân hàng
              </Text>
            </Pressable>

            <Pressable
              style={[styles.methodButton, method === "vnpay" && styles.methodActive]}
              onPress={() => setMethod("vnpay")}
            >
              <Text
                style={[
                  styles.methodText,
                  method === "vnpay" && styles.methodTextActive,
                ]}
              >
                VNPay
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                method === "zalopay" && styles.methodActive,
              ]}
              onPress={() => setMethod("zalopay")}
            >
              <Text
                style={[
                  styles.methodText,
                  method === "zalopay" && styles.methodTextActive,
                ]}
              >
                ZaloPay
              </Text>
            </Pressable>
          </View>

          {method === "bank" && (
            <View style={styles.qrBox}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />

              <Text style={styles.bankInfo}>Ngân hàng: MB Bank</Text>
              <Text style={styles.bankInfo}>STK: 0123456789</Text>
              <Text style={styles.bankInfo}>Chủ TK: TROHUB</Text>
              <Text style={styles.note}>
                Nội dung CK: {invoice.room} {invoice.month}
              </Text>
            </View>
          )}

          {method === "vnpay" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Thanh toán qua VNPay</Text>
              <Text style={styles.infoDesc}>
                Hệ thống sẽ chuyển sang cổng VNPay để thanh toán hóa đơn.
              </Text>
            </View>
          )}

          {method === "zalopay" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Thanh toán qua ZaloPay</Text>
              <Text style={styles.infoDesc}>
                Hệ thống sẽ mở ZaloPay để hoàn tất giao dịch.
              </Text>
            </View>
          )}

          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Xác nhận đã thanh toán</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
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
  amountBox: {
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  amount: {
    color: COLORS.orange,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  methodActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  methodText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  methodTextActive: {
    color: "#FFFFFF",
  },
  qrBox: {
    alignItems: "center",
    marginBottom: 18,
  },
  qrImage: {
    width: 160,
    height: 160,
    borderRadius: 14,
    marginBottom: 14,
  },
  bankInfo: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  note: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: "#F4F5F7",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  infoDesc: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmButton: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});