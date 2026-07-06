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

type InvoiceWithBank = Invoice & {
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  numericAmount?: number;
  amount?: string;
  room?: string;
  month?: string;
};

export default function PaymentModal({
  visible,
  invoice,
  onClose,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("bank");

  if (!invoice) return null;

  const currentInvoice = invoice as InvoiceWithBank;

  // FIX NHANH: fallback thông tin ngân hàng nếu invoice chưa có bankId/bankAccountNo/bankAccountName
  const BANK_INFO = {
    bankId: "MB",
    bankAccountNo: "0983692870",
    bankAccountName: "DUONG VY KIET",
  };

  // Bảng mapping tên ngắn ngân hàng → Mã BIN VietQR
  const BANK_BIN_MAP: Record<string, string> = {
    MB: "970422",
    MBBANK: "970422",

    VCB: "970436",
    VIETCOMBANK: "970436",

    TCB: "970407",
    TECHCOMBANK: "970407",

    BIDV: "970418",

    AGRIBANK: "970405",
    AGR: "970405",

    ACB: "970416",

    VPB: "970432",
    VPBANK: "970432",

    TPB: "970423",
    TPBANK: "970423",

    STB: "970403",
    SACOMBANK: "970403",

    HDB: "970437",
    HDBANK: "970437",

    VIB: "970441",
    SHB: "970443",

    EIB: "970431",
    EXIMBANK: "970431",

    MSB: "970426",
    OCB: "970448",

    LPB: "970449",
    LIENVIETPOSTBANK: "970449",

    SEABANK: "970440",
    ABBANK: "970425",
    NCB: "970419",

    CAKE: "546034",
    TIMO: "963388",
  };

  const getBankBin = (shortName?: string): string | null => {
    if (!shortName) return null;

    const cleaned = shortName.toUpperCase().trim();

    // Nếu đã nhập thẳng mã BIN 6 số thì dùng luôn
    if (/^\d{6}$/.test(cleaned)) return cleaned;

    return BANK_BIN_MAP[cleaned] || null;
  };

  const getInvoiceAmount = () => {
    if (currentInvoice.numericAmount) {
      return currentInvoice.numericAmount;
    }

    const rawAmount = String(currentInvoice.amount || "0");
    return parseInt(rawAmount.replace(/\D/g, ""), 10) || 0;
  };

  const getPaymentContent = () => {
    return `TroHub ${currentInvoice.id} P${currentInvoice.room || ""} T${
      currentInvoice.month || ""
    }`.substring(0, 50);
  };

  const getBankInfo = () => {
    return {
      bankId: currentInvoice.bankId || BANK_INFO.bankId,
      bankAccountNo: currentInvoice.bankAccountNo || BANK_INFO.bankAccountNo,
      bankAccountName:
        currentInvoice.bankAccountName || BANK_INFO.bankAccountName,
    };
  };

  const getVietQRUrl = () => {
    const bankInfo = getBankInfo();

    const bankBin = getBankBin(bankInfo.bankId);
    const accountNo = bankInfo.bankAccountNo;
    const accountName = encodeURIComponent(bankInfo.bankAccountName);
    const amount = getInvoiceAmount();
    const addInfo = encodeURIComponent(getPaymentContent());

    if (!bankBin || !accountNo) {
      return null;
    }

    return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
  };

  const handleConfirm = async () => {
    try {
      await onConfirm(currentInvoice.id);
      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  const bankInfo = getBankInfo();
  const qrUrl = getVietQRUrl();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Thanh toán</Text>
              <Text style={styles.subtitle}>
                Hóa đơn tháng {currentInvoice.month} • Phòng{" "}
                {currentInvoice.room}
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Tổng tiền thanh toán</Text>
            <Text style={styles.amount}>{currentInvoice.amount}</Text>
          </View>

          <View style={styles.methodRow}>
            <Pressable
              style={[
                styles.methodButton,
                method === "bank" && styles.methodActive,
              ]}
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
              style={[
                styles.methodButton,
                method === "vnpay" && styles.methodActive,
              ]}
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
              {qrUrl ? (
                <>
                  <View style={styles.qrImageWrap}>
                    <Image
                      source={{ uri: qrUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.bankInfoBox}>
                    <Text style={styles.bankInfo}>
                      Ngân hàng: {bankInfo.bankId.toUpperCase()}
                    </Text>

                    <Text style={styles.bankInfo}>
                      STK: {bankInfo.bankAccountNo}
                    </Text>

                    <Text style={styles.bankInfo}>
                      Chủ TK: {bankInfo.bankAccountName}
                    </Text>

                    <Text style={styles.note}>
                      Nội dung CK: {getPaymentContent()}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>
                    ⚠️ Chưa thiết lập ngân hàng
                  </Text>
                  <Text style={styles.warningText}>
                    Chủ trọ chưa cài đặt thông tin ngân hàng. Vui lòng liên hệ
                    chủ trọ để được hỗ trợ thanh toán.
                  </Text>
                </View>
              )}
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
  qrImageWrap: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 14,
  },
  bankInfoBox: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
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
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE58F",
  },
  warningTitle: {
    color: "#D48806",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 6,
  },
  warningText: {
    color: "#D48806",
    fontSize: 13,
    lineHeight: 20,
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