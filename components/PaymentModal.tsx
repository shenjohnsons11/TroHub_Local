import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { WebView } from "react-native-webview";
import { invoiceService } from "../services/invoiceService";
import { Invoice } from "../types/Invoice";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, unformatNumber } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

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
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [method, setMethod] = useState<PaymentMethod>("vnpay");
  const [paymentData, setPaymentData] = useState<VietQRPaymentData | null>(
    null
  );
  const [isCreatingQR, setIsCreatingQR] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasCompletedRef = useRef(false);
  const currentInvoice = invoice as InvoiceWithBank | null;
  const currentInvoiceId = currentInvoice?.id;

  // VNPay states
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);
  const [isCreatingVNPay, setIsCreatingVNPay] = useState(false);
  const [vnpayError, setVnpayError] = useState("");
  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);
  const paymentBusy = isCreatingQR || isCreatingVNPay || isChecking;
  const handleClose = () => {
    if (paymentBusy) return;
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

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

  const createVietQRPayment = useCallback(async () => {
    if (!currentInvoiceId) return;

    try {
      setIsCreatingQR(true);
      setErrorMessage("");

      const data = await invoiceService.createVietQRPayment(currentInvoiceId);

      setPaymentData(data);
    } catch (error: any) {
      console.log("Lỗi tạo QR VietQR:", error);
      setErrorMessage(error?.message || "Không tạo được mã VietQR");
    } finally {
      setIsCreatingQR(false);
    }
  }, [currentInvoiceId]);

  // VNPay: Tạo URL thanh toán khi Người thuê chọn tab VNPay
  const createVNPayPayment = useCallback(async () => {
    if (!currentInvoiceId) return;
    try {
      setIsCreatingVNPay(true);
      setVnpayError("");
      const data = await invoiceService.createVNPayPayment(currentInvoiceId);
      setVnpayUrl(data.paymentUrl);
    } catch (error: any) {
      console.log("Lỗi tạo VNPay:", error);
      setVnpayError(error?.message || "Không tạo được URL thanh toán VNPay");
    } finally {
      setIsCreatingVNPay(false);
    }
  }, [currentInvoiceId]);

  // VNPay: Bắt Return URL sau khi Người thuê thanh toán xong
  const onVNPayNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    if (url.includes('yourdomain.com/vnpay_return')) {
      setVnpayUrl(null);
      if (url.includes('vnp_ResponseCode=00')) {
        try {
          const queryString = url.split('?')[1];
          if (queryString) {
            await invoiceService.verifyVNPayReturn(queryString);
          }
          if (currentInvoice?.id) {
            await onConfirm(currentInvoice.id);
          }
        } catch (error) {
          console.log("Lỗi đồng bộ VNPay Local:", error);
          notification.warning('Giao dịch thành công nhưng lỗi đồng bộ trạng thái. Mong Người thuê kiểm tra lại sau.', { title: 'Cảnh báo' });
          // Vẫn gọi onConfirm để đóng Modal
          if (currentInvoice?.id) {
            await onConfirm(currentInvoice.id);
          }
        }
      } else {
        notification.error('Giao dịch chưa hoàn tất hoặc bị hủy bởi Người thuê.', { title: 'Thất bại' });
      }
    }
  };

  // VNPay: Deep-link mở App Ngân hàng trên cùng thiết bị Người thuê
  const onShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    if (url.startsWith('http://') || url.startsWith('https://') || url === 'about:blank') {
      return true;
    }
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          notification.error('Thiết bị của Người thuê chưa cài đặt ứng dụng ngân hàng này.', { title: 'Lỗi' });
        }
      })
      .catch((err) => console.error('Deep-link error:', err));
    return false;
  };

  useEffect(() => {
    if (!visible) {
      setPaymentData(null);
      setErrorMessage("");
      setIsCreatingQR(false);
      setIsChecking(false);
      setMethod("vnpay");
      hasCompletedRef.current = false;
      setVnpayUrl(null);
      setIsCreatingVNPay(false);
      setVnpayError("");
      return;
    }

    if (visible && currentInvoice?.id && method === "bank") {
      createVietQRPayment();
    }
    if (visible && currentInvoice?.id && method === "vnpay") {
      createVNPayPayment();
    }
  }, [
    visible,
    currentInvoice?.id,
    method,
    createVietQRPayment,
    createVNPayPayment,
  ]);

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
    onConfirm,
  ]);

  const handleCheckPaymentStatus = async () => {
    if (!paymentData?.transactionId || !currentInvoice?.id) {
      notification.info("Chưa có giao dịch để kiểm tra.", { title: "Thông báo" });
      return;
    }

    try {
      setIsChecking(true);

      const statusData = await invoiceService.getPaymentStatus(
        paymentData.transactionId
      );

      if (statusData.status === 1 || statusData.statusText === "success") {
        await onConfirm(currentInvoice.id);
        return;
      }

      notification.info(
        "Hệ thống chưa ghi nhận giao dịch. Vui lòng kiểm tra lại sau.",
        { title: "Đang chờ thanh toán" },
      );
    } catch (error: any) {
      console.log("Lỗi kiểm tra trạng thái:", error);
      notification.error(
        error?.message || "Không kiểm tra được trạng thái thanh toán",
        { title: "Lỗi" },
      );
    } finally {
      setIsChecking(false);
    }
  };

  if (!currentInvoice) return null;



  const bankInfo = getBankInfo();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.box} accessibilityViewIsModal>
          <View style={styles.header}>
            <View>
              <AppText
                ref={titleRef}
                style={styles.title}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                Thanh toán
              </AppText>
              <AppText style={styles.subtitle}>
                Hóa đơn tháng {currentInvoice.month} • Phòng{" "}
                {currentInvoice.room}
              </AppText>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              disabled={paymentBusy}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.paymentScroll}
            contentContainerStyle={styles.paymentScrollContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.amountBox}>
            <AppText style={styles.amountLabel}>{t("invoices.totalAmount")}</AppText>
            <AppText style={styles.amount}>{formatCurrency(currentInvoice.numericAmount ?? unformatNumber(currentInvoice.amount))}</AppText>
          </View>

          <View style={styles.methodRow}>
            <Pressable
              style={[
                styles.methodButton,
                method === "vnpay" && styles.methodActive,
              ]}
              onPress={() => setMethod("vnpay")}
              accessibilityRole="button"
              accessibilityState={{ selected: method === "vnpay" }}
            >
              <Ionicons
                name="wallet-outline"
                size={17}
                color={method === "vnpay" ? theme.background : theme.muted}
              />
              <AppText
                style={[
                  styles.methodText,
                  method === "vnpay" && styles.methodTextActive,
                ]}
              >
                VNPay
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                method === "bank" && styles.methodActive,
              ]}
              onPress={() => setMethod("bank")}
              accessibilityRole="button"
              accessibilityState={{ selected: method === "bank" }}
            >
              <Ionicons
                name="qr-code-outline"
                size={17}
                color={method === "bank" ? theme.background : theme.muted}
              />
              <AppText
                style={[
                  styles.methodText,
                  method === "bank" && styles.methodTextActive,
                ]}
              >
                VietQR
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                method === "zalopay" && styles.methodActive,
              ]}
              onPress={() => setMethod("zalopay")}
              accessibilityRole="button"
              accessibilityState={{ selected: method === "zalopay" }}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={17}
                color={method === "zalopay" ? theme.background : theme.muted}
              />
              <AppText
                style={[
                  styles.methodText,
                  method === "zalopay" && styles.methodTextActive,
                ]}
              >
                ZaloPay
              </AppText>
            </Pressable>
          </View>

          {method === "bank" && (
            <View style={styles.qrBox}>
              {isCreatingQR ? (
                <View style={styles.loadingQRBox}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <AppText style={styles.loadingText}>{t("common.loading")}</AppText>
                </View>
              ) : errorMessage ? (
                <View style={styles.warningBox}>
                  <AppText style={styles.warningTitle}>
                    {t("common.error")}
                  </AppText>
                  <AppText style={styles.warningText}>{errorMessage}</AppText>

                  <AppButton icon="refresh-outline" onPress={createVietQRPayment}>
                    {t("common.confirm")}
                  </AppButton>
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
                    <AppText style={styles.bankInfo}>
                      Bank: {bankInfo.bankId.toUpperCase()}
                    </AppText>

                    <AppText style={styles.bankInfo}>
                      Account: {bankInfo.bankAccountNo}
                    </AppText>

                    <AppText style={styles.bankInfo}>
                      Name: {bankInfo.bankAccountName}
                    </AppText>

                    <AppText style={styles.note}>
                      Ref: {paymentData.description}
                    </AppText>

                    <AppText style={styles.transactionText}>
                      TX: {paymentData.transactionId}
                    </AppText>
                  </View>
                </>
              ) : (
                <View style={styles.warningBox}>
                  <AppText style={styles.warningTitle}>
                    VietQR
                  </AppText>
                  <AppButton icon="qr-code-outline" onPress={createVietQRPayment}>
                    {t("common.confirm")}
                  </AppButton>
                </View>
              )}
            </View>
          )}

          {method === "vnpay" && (
            <View style={styles.qrBox}>
              {isCreatingVNPay ? (
                <View style={styles.loadingQRBox}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <AppText style={styles.loadingText}>{t("common.loading")}</AppText>
                </View>
              ) : vnpayError ? (
                <View style={styles.warningBox}>
                  <AppText style={styles.warningTitle}>{t("common.error")}</AppText>
                  <AppText style={styles.warningText}>{vnpayError}</AppText>
                  <AppButton icon="refresh-outline" onPress={createVNPayPayment}>
                    {t("common.confirm")}
                  </AppButton>
                </View>
              ) : vnpayUrl ? (
                <View style={[styles.webViewBox, { borderColor: theme.border }]}>
                  <WebView
                    source={{ uri: vnpayUrl }}
                    onNavigationStateChange={onVNPayNavigationStateChange}
                    onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <AppText style={styles.warningTitle}>VNPay</AppText>
                  <AppButton icon="link-outline" onPress={createVNPayPayment}>
                    VNPay
                  </AppButton>
                </View>
              )}
            </View>
          )}

          {method === "zalopay" && (
            <View style={styles.infoBox}>
              <AppText style={styles.infoTitle}>ZaloPay</AppText>
              <AppText style={styles.infoDesc}>
                {t("common.noData")}
              </AppText>
            </View>
          )}
          </ScrollView>

          <View style={styles.paymentFooter}>
          {method === "bank" ? (
            <AppButton
              disabled={!paymentData || isChecking}
              onPress={handleCheckPaymentStatus}
              loading={isChecking}
              icon="refresh-outline"
            >
              {isChecking ? t("common.loading") : t("common.confirm")}
            </AppButton>
          ) : method === "vnpay" ? (
            <AppButton
              variant="secondary"
              disabled={!vnpayUrl}
              onPress={() => setVnpayUrl(null)}
              icon="close-circle-outline"
            >
              {t("common.cancel")}
            </AppButton>
          ) : (
            <AppButton disabled icon="time-outline">{t("common.noData")}</AppButton>
          )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    maxHeight: "92%",
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
    color: theme.text,
  },
  subtitle: {
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
  amountBox: {
    backgroundColor: theme.primarySoft,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  amount: {
    color: theme.primary,
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
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  methodActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  methodText: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  methodTextActive: {
    color: theme.background,
  },
  qrBox: {
    alignItems: "center",
    marginBottom: 18,
  },
  paymentScroll: { flexShrink: 1 },
  paymentScrollContent: { paddingBottom: 8 },
  paymentFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  webViewBox: {
    width: "100%",
    height: 420,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  loadingQRBox: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  qrImageWrap: {
    backgroundColor: theme.surfaceElevated,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 14,
  },
  bankInfoBox: {
    width: "100%",
    backgroundColor: theme.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  bankInfo: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  note: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },
  transactionText: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  pendingText: {
    color: theme.warningForeground,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  warningBox: {
    width: "100%",
    backgroundColor: theme.warningSoft,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  warningTitle: {
    color: theme.warningForeground,
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 6,
  },
  warningText: {
    color: theme.warningForeground,
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    height: 42,
    backgroundColor: theme.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  retryText: {
    color: theme.background,
    fontWeight: "900",
  },
  infoBox: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  infoTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  infoDesc: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmButton: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
  confirmText: {
    color: theme.background,
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
  backgroundColor: theme.positiveSoft,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
},

successIconText: {
  color: theme.positive,
  fontSize: 42,
  fontWeight: "900",
},

successTitle: {
  color: theme.text,
  fontSize: 22,
  fontWeight: "900",
  marginBottom: 10,
},

successAmount: {
  color: theme.primary,
  fontSize: 32,
  fontWeight: "900",
  marginBottom: 10,
},

successDesc: {
  color: theme.muted,
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
  color: theme.muted,
  fontSize: 14,
  fontWeight: "800",
},
});
