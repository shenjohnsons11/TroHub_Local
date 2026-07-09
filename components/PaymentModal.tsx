import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../constants/theme";
import { invoiceService } from "../services/invoiceService";
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

type VietQRPaymentData = {
  transactionId: string;
  invoiceId: string;
  amount: number;
  method: string;
  status: number;
  orderCode: string;
  description: string;
  qrUrl: string;
};

export default function PaymentModal({
  visible,
  invoice,
  onClose,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [paymentData, setPaymentData] = useState<VietQRPaymentData | null>(
    null
  );
  const [isCreatingQR, setIsCreatingQR] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const hasCompletedRef = useRef(false);
  const currentInvoice = invoice as InvoiceWithBank | null;

  const BANK_INFO = {
    bankId: "Cake",
    bankAccountNo: "0967145600",
    bankAccountName: "DUONG VY KIET",
  };

  const getBankInfo = () => {
    return {
      bankId: currentInvoice?.bankId || BANK_INFO.bankId,
      bankAccountNo: currentInvoice?.bankAccountNo || BANK_INFO.bankAccountNo,
      bankAccountName:
        currentInvoice?.bankAccountName || BANK_INFO.bankAccountName,
    };
  };

  const createVietQRPayment = async () => {
    if (!currentInvoice?.id) return;

    try {
      setIsCreatingQR(true);
      setErrorMessage("");

      const data = await invoiceService.createVietQRPayment(currentInvoice.id);

      setPaymentData(data);
    } catch (error: any) {
      console.log("Lỗi tạo QR VietQR:", error);
      setErrorMessage(error?.message || "Không tạo được mã VietQR");
    } finally {
      setIsCreatingQR(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setPaymentData(null);
      setErrorMessage("");
      setIsCreatingQR(false);
      setIsChecking(false);
      setIsSuccess(false);
      setMethod("bank");
      hasCompletedRef.current = false;
      return;
    }

    if (visible && currentInvoice?.id && method === "bank") {
      createVietQRPayment();
    }
  }, [visible, currentInvoice?.id, method]);

  useEffect(() => {
    if (
      !visible ||
      method !== "bank" ||
      !paymentData?.transactionId ||
      !currentInvoice?.id
    ) {
      return;
    }

    const timer = setInterval(async () => {
      if (hasCompletedRef.current) return;

      try {
        const statusData = await invoiceService.getPaymentStatus(
          paymentData.transactionId
        );

        if (statusData.status === 1 || statusData.statusText === "success") {
          hasCompletedRef.current = true;

          setIsSuccess(true);

          await onConfirm(currentInvoice.id);
        }
      } catch (error) {
        console.log("Lỗi tự động kiểm tra thanh toán:", error);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [
    visible,
    method,
    paymentData?.transactionId,
    currentInvoice?.id,
  ]);

  const handleCheckPaymentStatus = async () => {
    if (!paymentData?.transactionId || !currentInvoice?.id) {
      Alert.alert("Thông báo", "Chưa có giao dịch để kiểm tra.");
      return;
    }

    try {
      setIsChecking(true);

      const statusData = await invoiceService.getPaymentStatus(
        paymentData.transactionId
      );

      if (statusData.status === 1 || statusData.statusText === "success") {
        setIsSuccess(true);

        await onConfirm(currentInvoice.id);
        return;
      }

      Alert.alert(
        "Đang chờ thanh toán",
        "Hệ thống chưa ghi nhận giao dịch. Vui lòng kiểm tra lại sau."
      );
    } catch (error: any) {
      console.log("Lỗi kiểm tra trạng thái:", error);
      Alert.alert(
        "Lỗi",
        error?.message || "Không kiểm tra được trạng thái thanh toán"
      );
    } finally {
      setIsChecking(false);
    }
  };

  if (!currentInvoice) return null;

  if (isSuccess) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Thanh toán thành công</Text>

            <Text style={styles.successAmount}>{currentInvoice.amount}</Text>

            <Text style={styles.successDesc}>
              Hóa đơn tháng {currentInvoice.month} • Phòng {currentInvoice.room}
            </Text>

            <Pressable
              style={styles.confirmButton}
              onPress={() => {
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Xem chi tiết</Text>
            </Pressable>

            <Pressable
              style={styles.backHomeButton}
              onPress={() => {
                onClose();
              }}
            >
              <Text style={styles.backHomeText}>Trở về danh sách hóa đơn</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

  const bankInfo = getBankInfo();

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
              {isCreatingQR ? (
                <View style={styles.loadingQRBox}>
                  <ActivityIndicator size="large" color={COLORS.orange} />
                  <Text style={styles.loadingText}>Đang tạo mã VietQR...</Text>
                </View>
              ) : errorMessage ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>
                    Không tạo được mã thanh toán
                  </Text>
                  <Text style={styles.warningText}>{errorMessage}</Text>

                  <Pressable
                    style={styles.retryButton}
                    onPress={createVietQRPayment}
                  >
                    <Text style={styles.retryText}>Tạo lại mã QR</Text>
                  </Pressable>
                </View>
              ) : paymentData?.qrUrl ? (
                <>
                  <View style={styles.qrImageWrap}>
                    <Image
                      source={{ uri: paymentData.qrUrl }}
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
                      Nội dung CK: {paymentData.description}
                    </Text>

                    <Text style={styles.transactionText}>
                      Mã GD: {paymentData.transactionId}
                    </Text>

                    <Text style={styles.pendingText}>
                      Trạng thái: Đang chờ thanh toán
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>
                    Chưa có mã thanh toán
                  </Text>
                  <Text style={styles.warningText}>
                    Vui lòng bấm tạo lại mã QR.
                  </Text>

                  <Pressable
                    style={styles.retryButton}
                    onPress={createVietQRPayment}
                  >
                    <Text style={styles.retryText}>Tạo mã QR</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {method === "vnpay" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Thanh toán qua VNPay</Text>
              <Text style={styles.infoDesc}>
                Chức năng VNPay sẽ được tích hợp sau.
              </Text>
            </View>
          )}

          {method === "zalopay" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Thanh toán qua ZaloPay</Text>
              <Text style={styles.infoDesc}>
                Chức năng ZaloPay sẽ được tích hợp sau.
              </Text>
            </View>
          )}

          {method === "bank" ? (
            <Pressable
              style={[
                styles.confirmButton,
                (!paymentData || isChecking) && styles.disabledButton,
              ]}
              disabled={!paymentData || isChecking}
              onPress={handleCheckPaymentStatus}
            >
              {isChecking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Đang chờ xác nhận thanh toán</Text>
              )}
            </Pressable>
          ) : (
            <Pressable style={styles.confirmButton}>
              <Text style={styles.confirmText}>Chưa hỗ trợ phương thức này</Text>
            </Pressable>
          )}
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
  loadingQRBox: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
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
  transactionText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  pendingText: {
    color: "#D48806",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  warningBox: {
    width: "100%",
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
  retryButton: {
    height: 42,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "900",
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
  disabledButton: {
    opacity: 0.55,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  successBox: {
  alignItems: "center",
  paddingVertical: 18,
},

successIcon: {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: "#EAFBEF",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
},

successIconText: {
  color: COLORS.green,
  fontSize: 42,
  fontWeight: "900",
},

successTitle: {
  color: COLORS.text,
  fontSize: 22,
  fontWeight: "900",
  marginBottom: 10,
},

successAmount: {
  color: COLORS.orange,
  fontSize: 32,
  fontWeight: "900",
  marginBottom: 10,
},

successDesc: {
  color: COLORS.muted,
  fontSize: 14,
  fontWeight: "700",
  textAlign: "center",
  marginBottom: 22,
},

backHomeButton: {
  marginTop: 14,
  paddingVertical: 8,
},

backHomeText: {
  color: COLORS.muted,
  fontSize: 14,
  fontWeight: "800",
},
});