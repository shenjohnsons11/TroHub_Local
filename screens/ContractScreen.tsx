import React, { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { Contract, ContractStatus } from "../types/Contract";
import SignContractWizard from "../components/SignContractWizard";
import PaymentModal from "../components/PaymentModal";
import { contractService } from "../services/contractService";
import { invoiceService } from "../services/invoiceService";
import { Invoice } from "../types/Invoice";
import { useNotification } from "../hooks/useNotification";
import { Ionicons } from "@expo/vector-icons";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";

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

const getStatusColor = (status: ContractStatus, theme: ReturnType<typeof useAppTheme>["theme"]): string => {
  switch (status) {
    case "pending": return theme.warningForeground;
    case "active": return theme.positive;
    case "expired": return theme.muted;
    case "cancelled": return theme.danger;
    case "awaiting_approval": return theme.primary;
    default: return theme.muted;
  }
};

const getStatusBg = (status: ContractStatus, theme: ReturnType<typeof useAppTheme>["theme"]): string => {
  switch (status) {
    case "pending": return theme.warningSoft;
    case "active": return theme.positiveSoft;
    case "expired": return theme.surfaceElevated;
    case "cancelled": return theme.warningSoft;
    case "awaiting_approval": return theme.primarySoft;
    default: return theme.surfaceElevated;
  }
};

type Props = {
  onNavigate?: (screen: "invoice", params?: any) => void;
  params?: { contractId?: string };
};

export default function ContractScreen({ onNavigate, params }: Props) {
  const notification = useNotification();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
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

  const handleRequestTerminate = async (contract: Contract) => {
    const confirmed = await notification.confirm({
      title: "Yêu cầu trả phòng",
      message:
        `Bạn có chắc chắn muốn gửi yêu cầu trả phòng ${contract.room}?\n\n` +
        "Lưu ý: Bạn phải thanh toán toàn bộ hóa đơn nợ trước khi gửi yêu cầu. Sau khi gửi, chủ trọ sẽ kiểm tra phòng và chốt hợp đồng.",
      cancelText: "Hủy",
      confirmText: "Gửi yêu cầu",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await contractService.requestTerminate(contract.id);
      notification.success(
        "Đã gửi yêu cầu trả phòng! Vui lòng chờ chủ trọ xác nhận.",
        { title: "Thành công" },
      );
      const data = await contractService.getMyContracts();
      setContracts(data);
    } catch (error) {
      notification.error(
        error instanceof Error ? error.message : "Gửi yêu cầu thất bại. Vui lòng thử lại.",
        { title: "Lỗi" },
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
    <FlatList
      data={contracts}
      keyExtractor={(contract) => contract.id}
      contentContainerStyle={[styles.content, contracts.length === 0 && styles.emptyListContent]}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Hợp đồng của tôi</Text>
          <Text style={styles.subtitle}>Xem và xác nhận hợp đồng thuê phòng của bạn.</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <IllustratedEmptyState
            description="Khi chủ trọ tạo hợp đồng, hợp đồng sẽ xuất hiện ở đây."
            kind="contract"
            title="Chưa có hợp đồng"
          />
          <Text style={styles.emptyHint}>Kéo xuống để làm mới</Text>
        </View>
      }
      renderItem={({ item: contract, index }) => {
        const isSigning = signingId === contract.id;

        return (
          <AnimatedEntry delay={Math.min(index, 5) * 45}>
          <GradientHero
            detail={`${getStatusLabel(contract.status)} · ${contract.startDate} — ${contract.endDate}`}
            icon="document-text-outline"
            label={`PHÒNG ${contract.room} · TIỀN THUÊ`}
            value={contract.rentFee}
          />
          <Card style={styles.contractCard}>
            {/* Header: Phòng + Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.roomTitle}>Phòng {contract.room}</Text>
                <Text style={styles.tenantText}>{contract.tenantName}</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(contract.status, theme) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(contract.status, theme) }]}>
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
                  <Text style={styles.serviceItem}>
                    Chỉ số điện đầu: {contract.meterTerms.initialElectricity}
                  </Text>
                  <Text style={styles.serviceItem}>💧 {contract.serviceFees.water}</Text>
                  <Text style={styles.serviceItem}>
                    Chỉ số nước đầu: {contract.meterTerms.initialWater}
                  </Text>
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
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <><Ionicons name="create-outline" size={19} color={theme.background} /><Text style={styles.signButtonText}>Ký xác nhận hợp đồng</Text></>
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
                          <ActivityIndicator color={theme.background} size="small" />
                        ) : (
                          <><Ionicons name="card-outline" size={18} color={theme.background} /><Text style={styles.depositPaymentButtonText}>
                            Thanh toán ngay
                          </Text></>
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
                  style={[styles.signButton, { backgroundColor: theme.danger }, isLoading && styles.signButtonDisabled]}
                  onPress={() => handleRequestTerminate(contract)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.dangerForeground} />
                  ) : (
                    <><Ionicons name="exit-outline" size={19} color={theme.dangerForeground} /><Text style={[styles.signButtonText, { color: theme.dangerForeground }]}>Yêu cầu trả phòng</Text></>
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
          </AnimatedEntry>
        );
      }}
    />
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
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 30,
  },
  emptyListContent: { flexGrow: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyHint: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  contractCard: {
    marginBottom: 16,
    marginTop: 12,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
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
    color: theme.text,
  },
  tenantText: {
    fontSize: 13,
    color: theme.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
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
    backgroundColor: theme.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: "600",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: theme.text,
    fontWeight: "800",
  },
  progressBox: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.primary,
    borderRadius: 999,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  progressText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  servicesBox: {
    marginTop: 10,
    paddingTop: 12,
  },
  servicesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 8,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceItem: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "600",
    backgroundColor: theme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  signBox: {
    marginTop: 14,
    paddingTop: 14,
  },
  signHintBox: {
    backgroundColor: theme.warningSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  signHint: {
    fontSize: 12,
    color: theme.warningForeground,
    fontWeight: "700",
    lineHeight: 20,
  },
  signButton: {
    height: 50,
    backgroundColor: theme.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signButtonDisabled: {
    opacity: 0.7,
  },
  signButtonText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "900",
  },
  awaitingBox: {
    marginTop: 14,
    paddingTop: 14,
  },
  awaitingText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: "700",
    lineHeight: 20,
    backgroundColor: theme.primarySoft,
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
  },
  depositPaymentCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.warningSoft,
    gap: 12,
  },
  depositPaymentCopy: {
    gap: 4,
  },
  depositPaymentTitle: {
    color: theme.warningForeground,
    fontSize: 14,
    fontWeight: "900",
  },
  depositPaymentAmount: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "900",
  },
  depositPaymentHint: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  depositPaymentButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: theme.primary,
    flexDirection: "row",
    gap: 8,
  },
  depositPaymentButtonText: {
    color: theme.background,
    fontSize: 14,
    fontWeight: "900",
  },
});
