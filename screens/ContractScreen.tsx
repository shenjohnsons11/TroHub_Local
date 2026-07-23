import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import { Contract, ContractStatus } from "../types/Contract";
import SignContractWizard from "../components/SignContractWizard";
import PaymentModal from "../components/PaymentModal";
import { contractService } from "../services/contractService";
import { invoiceService } from "../services/invoiceService";
import { Invoice } from "../types/Invoice";
import { useNotification } from "../hooks/useNotification";

const getStatusLabel = (status: ContractStatus): string => {
  switch (status) {
    case "pending": return "Chờ ký xác nhận";
    case "active": return "Có hiệu lực";
    case "expired": return "Hết hạn";
    case "cancelled": return "Đã hủy";
    case "awaiting_approval": return "Chờ chủ trọ duyệt";
    default: return "Không xác định";
  }
};

const getStatusColor = (status: ContractStatus): string => {
  switch (status) {
    case "pending": return COLORS.orange;
    case "active": return COLORS.green;
    case "expired": return COLORS.muted;
    case "cancelled": return COLORS.red;
    case "awaiting_approval": return "#007AFF";
    default: return COLORS.muted;
  }
};

const getStatusBg = (status: ContractStatus): string => {
  switch (status) {
    case "pending": return COLORS.orangeSoft || "#FFF5ED";
    case "active": return "#EAF9F1";
    case "expired": return "#E8E9ED";
    case "cancelled": return "#FFF1F1";
    case "awaiting_approval": return "#E8F4FD";
    default: return "#E8E9ED";
  }
};

type Props = {
  onNavigate?: (screen: "invoice", params?: any) => void;
  params?: { contractId?: string };
};

export default function ContractScreen({ onNavigate, params }: Props) {
  const notification = useNotification();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [loadingDepositInvoiceId, setLoadingDepositInvoiceId] = useState<
    string | null
  >(null);

  // Thêm state cho Wizard
  const [wizardVisible, setWizardVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const data = await contractService.getMyContracts();
      setContracts(data);
      if (params?.contractId) {
        const target = data.find((contract) => contract.id === params.contractId);
        if (target) {
          setSelectedContract(target);
          setWizardVisible(true);
        }
      }
    } catch (error) {
      console.log("Lỗi load hợp đồng:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const data = await contractService.getMyContracts();
    setContracts(data);
    setIsRefreshing(false);
  };

  const handleSignContract = (contract: Contract) => {
    setSelectedContract(contract);
    setWizardVisible(true);
  };

  const openDepositPayment = async (invoiceId: string) => {
    try {
      setLoadingDepositInvoiceId(invoiceId);
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      setPaymentInvoice(invoice);
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : "Không thể tải hóa đơn tiền cọc.",
      );
      if (onNavigate) {
        onNavigate("invoice", { paymentInvoiceId: invoiceId });
      }
    } finally {
      setLoadingDepositInvoiceId(null);
    }
  };

  const handleConfirmSign = async (contract: Contract) => {
    try {
      setSigningId(contract.id);
      const result = await contractService.signContract(contract.id);
      notification.success(
        "Ký xác nhận thành công. Vui lòng hoàn tất thanh toán tiền cọc.",
      );
      setWizardVisible(false);
      // Reload danh sách
      const data = await contractService.getMyContracts();
      setContracts(data);

      if (result.invoiceId) {
        await openDepositPayment(result.invoiceId);
      } else if (result.depositRequired) {
        notification.warning(
          "Hóa đơn tiền cọc chưa sẵn sàng. Vui lòng tải lại hợp đồng.",
        );
      }
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : "Ký hợp đồng thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSigningId(null);
    }
  };

  const handleDepositPaymentConfirmed = async (_invoiceId: string) => {
    setPaymentInvoice(null);
    await loadContracts();
    notification.success("Thanh toán tiền cọc đã được ghi nhận.");
  };

  const handleRequestTerminate = (contract: Contract) => {
    Alert.alert(
      "Yêu cầu trả phòng",
      `Bạn có chắc chắn muốn gửi yêu cầu trả phòng ${contract.room}?\n\n` +
      "Lưu ý: Bạn phải thanh toán toàn bộ hóa đơn nợ trước khi gửi yêu cầu. Sau khi gửi, chủ trọ sẽ kiểm tra phòng và chốt hợp đồng.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi yêu cầu",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await contractService.requestTerminate(contract.id);
              Alert.alert(
                "Thành công",
                "Đã gửi yêu cầu trả phòng! Vui lòng chờ chủ trọ xác nhận."
              );
              const data = await contractService.getMyContracts();
              setContracts(data);
            } catch (error) {
              Alert.alert(
                "Lỗi",
                error instanceof Error ? error.message : "Gửi yêu cầu thất bại. Vui lòng thử lại."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  if (contracts.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.orange} />
        }
      >
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyTitle}>Chưa có hợp đồng</Text>
        <Text style={styles.emptyText}>
          Bạn chưa có hợp đồng nào. Khi chủ trọ tạo hợp đồng, nó sẽ xuất hiện ở đây.
        </Text>
        <Text style={styles.emptyHint}>Kéo xuống để làm mới</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.orange} />
      }
    >
      <Text style={styles.title}>Hợp đồng của tôi</Text>
      <Text style={styles.subtitle}>
        Xem và xác nhận hợp đồng thuê phòng của bạn.
      </Text>

      {contracts.map((contract) => {
        const isSigning = signingId === contract.id;

        return (
          <Card key={contract.id} style={styles.contractCard}>
            {/* Header: Phòng + Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.roomTitle}>Phòng {contract.room}</Text>
                <Text style={styles.tenantText}>{contract.tenantName}</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(contract.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
                  {getStatusLabel(contract.status)}
                </Text>
              </View>
            </View>

            {/* Thông tin chính */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tiền thuê</Text>
                <Text style={styles.infoValue}>{contract.rentFee}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tiền cọc</Text>
                <Text style={styles.infoValue}>{contract.deposit}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Bắt đầu</Text>
                <Text style={styles.infoValue}>{contract.startDate}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Kết thúc</Text>
                <Text style={styles.infoValue}>{contract.endDate}</Text>
              </View>
            </View>

            {/* Thanh tiến trình (chỉ hiển thị khi hợp đồng active) */}
            {contract.status === "active" && (
              <View style={styles.progressBox}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: contract.progressPercent as `${number}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressText}>
                    Đã sử dụng {contract.usedMonths} tháng
                  </Text>
                  <Text style={styles.progressText}>
                    Còn {contract.remainingMonths} tháng
                  </Text>
                </View>
              </View>
            )}

            {/* Phí dịch vụ */}
            {(contract.status === "active" || contract.status === "pending") && (
              <View style={styles.servicesBox}>
                <Text style={styles.servicesTitle}>Phí dịch vụ</Text>
                <View style={styles.servicesGrid}>
                  <Text style={styles.serviceItem}>⚡ {contract.serviceFees.electric}</Text>
                  <Text style={styles.serviceItem}>💧 {contract.serviceFees.water}</Text>
                  <Text style={styles.serviceItem}>🅿️ {contract.serviceFees.parking}</Text>
                  <Text style={styles.serviceItem}>🌐 {contract.serviceFees.internet}</Text>
                </View>
              </View>
            )}

            {/* Nút Ký xác nhận - chỉ hiện khi status = pending (Chờ ký) */}
            {contract.status === "pending" && (
              <View style={styles.signBox}>
                <View style={styles.signHintBox}>
                  <Text style={styles.signHint}>
                    ✍️ Chủ trọ đã tạo hợp đồng này cho bạn. Hãy xem kỹ thông tin và nhấn nút bên dưới để ký xác nhận.
                  </Text>
                </View>
                <Pressable
                  style={[styles.signButton, isSigning && styles.signButtonDisabled]}
                  onPress={() => handleSignContract(contract)}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signButtonText}>✍️ Ký xác nhận hợp đồng</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Thông báo chờ duyệt */}
            {contract.status === "awaiting_approval" && (
              <>
                <View style={styles.awaitingBox}>
                  <Text style={styles.awaitingText}>
                    ⏳ Bạn đã ký xác nhận. Đang chờ chủ trọ duyệt để hợp đồng có hiệu lực.
                  </Text>
                </View>
                {contract.depositPayment?.required &&
                  contract.depositPayment.status === "unpaid" && (
                    <View style={styles.depositPaymentCard}>
                      <View style={styles.depositPaymentCopy}>
                        <Text style={styles.depositPaymentTitle}>
                          Tiền cọc chưa thanh toán
                        </Text>
                        <Text style={styles.depositPaymentAmount}>
                          {contract.deposit}
                        </Text>
                        <Text style={styles.depositPaymentHint}>
                          Hoàn tất tiền cọc để Admin có thể duyệt hợp đồng.
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.depositPaymentButton,
                          loadingDepositInvoiceId ===
                            contract.depositPayment.invoiceId &&
                            styles.signButtonDisabled,
                        ]}
                        disabled={
                          !contract.depositPayment.invoiceId ||
                          loadingDepositInvoiceId ===
                            contract.depositPayment.invoiceId
                        }
                        onPress={() => {
                          if (contract.depositPayment?.invoiceId) {
                            void openDepositPayment(
                              contract.depositPayment.invoiceId,
                            );
                          }
                        }}
                      >
                        {loadingDepositInvoiceId ===
                        contract.depositPayment.invoiceId ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.depositPaymentButtonText}>
                            Thanh toán ngay
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
              </>
            )}

            {/* Nút Yêu cầu trả phòng - chỉ hiện khi status = active (Đang hiệu lực) */}
            {contract.status === "active" && (
              <View style={styles.signBox}>
                <Pressable
                  style={[styles.signButton, { backgroundColor: COLORS.red }, isLoading && styles.signButtonDisabled]}
                  onPress={() => handleRequestTerminate(contract)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signButtonText}>🚪 Yêu cầu trả phòng</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Thông báo chờ duyệt trả phòng */}
            {contract.status === "requesting_termination" && (
              <View style={styles.awaitingBox}>
                <Text style={styles.awaitingText}>
                  ⏳ Bạn đã gửi yêu cầu trả phòng. Đang chờ chủ trọ kiểm tra và chốt hợp đồng.
                </Text>
              </View>
            )}
          </Card>
        );
      })}

      <SignContractWizard
        visible={wizardVisible}
        contract={selectedContract}
        onClose={() => setWizardVisible(false)}
        onSign={handleConfirmSign}
      />
      <PaymentModal
        visible={Boolean(paymentInvoice)}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onConfirm={handleDepositPaymentConfirmed}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyHint: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  contractCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  tenantText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  infoItem: {
    width: "48%",
    backgroundColor: "#F8F9FB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "800",
  },
  progressBox: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ECEEF2",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.orange,
    borderRadius: 999,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  progressText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  servicesBox: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F1F3",
  },
  servicesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceItem: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F1F3",
  },
  signHintBox: {
    backgroundColor: "#FFF8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  signHint: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: "700",
    lineHeight: 20,
  },
  signButton: {
    height: 50,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signButtonDisabled: {
    opacity: 0.7,
  },
  signButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  awaitingBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F1F3",
  },
  awaitingText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "700",
    lineHeight: 20,
    backgroundColor: "#E8F4FD",
    borderRadius: 10,
    padding: 12,
    overflow: "hidden",
  },
  depositPaymentCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F2C078",
    borderRadius: 12,
    backgroundColor: "#FFF8ED",
    gap: 12,
  },
  depositPaymentCopy: {
    gap: 4,
  },
  depositPaymentTitle: {
    color: "#9A4C00",
    fontSize: 14,
    fontWeight: "900",
  },
  depositPaymentAmount: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  depositPaymentHint: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  depositPaymentButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: COLORS.orange,
  },
  depositPaymentButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
