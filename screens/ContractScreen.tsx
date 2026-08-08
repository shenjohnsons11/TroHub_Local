import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { AppText } from "@/components/ui/typography";
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
import { useTranslation } from "../contexts/LanguageContext";

const getStatusLabel = (status: ContractStatus, t: (key: string) => string): string => {
  switch (status) {
    case "pending": return t("tenantContract.pending");
    case "active": return t("tenantContract.active");
    case "expired": return t("tenantContract.expired");
    case "cancelled": return t("tenantContract.cancelled");
    case "awaiting_approval": return t("tenantContract.awaiting");
    default: return t("tenantContract.unknown");
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
  const { t } = useTranslation();
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
          : t("tenantContract.depositLoadFailed"),
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
        t("tenantContract.signed"),
      );
      setWizardVisible(false);
      // Reload danh sách
      const data = await contractService.getMyContracts();
      setContracts(data);

      if (result.invoiceId) {
        await openDepositPayment(result.invoiceId);
      } else if (result.depositRequired) {
        notification.warning(
          t("tenantContract.depositUnavailable"),
        );
      }
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : t("tenantContract.signFailed"),
      );
    } finally {
      setSigningId(null);
    }
  };

  const handleDepositPaymentConfirmed = async (_invoiceId: string) => {
    setPaymentInvoice(null);
    await loadContracts();
    notification.success(t("tenantContract.depositRecorded"));
  };

  const handleRequestTerminate = async (contract: Contract) => {
    const confirmed = await notification.confirm({
      title: t("tenantContract.terminateTitle"), message: t("tenantContract.terminateMessage", { room: contract.room }), cancelText: t("common.cancel"), confirmText: t("tenantContract.terminate"),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await contractService.requestTerminate(contract.id);
      notification.success(
        t("tenantContract.terminateSent"), { title: t("common.success") },
      );
      const data = await contractService.getMyContracts();
      setContracts(data);
    } catch (error) {
      notification.error(
        error instanceof Error ? error.message : t("tenantContract.terminateFailed"), { title: t("common.error") },
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
          <AppText style={styles.title}>{t("tenantContract.title")}</AppText>
          <AppText style={styles.subtitle}>{t("tenantContract.subtitle")}</AppText>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <IllustratedEmptyState
            description={t("tenantContract.emptyDescription")}
            kind="contract"
            title={t("tenantContract.empty")}
          />
          <AppText style={styles.emptyHint}>{t("tenantContract.refresh")}</AppText>
        </View>
      }
      renderItem={({ item: contract, index }) => {
        const isSigning = signingId === contract.id;

        return (
          <AnimatedEntry delay={Math.min(index, 5) * 45}>
          <GradientHero
            detail={`${getStatusLabel(contract.status, t)} · ${contract.startDate} — ${contract.endDate}`}
            icon="document-text-outline"
            label={t("tenantContract.hero", { room: contract.room })}
            value={contract.rentFee}
          />
          <Card style={styles.contractCard}>
            {/* Header: Phòng + Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <AppText style={styles.roomTitle}>{t("tenantContract.room", { room: contract.room })}</AppText>
                <AppText style={styles.tenantText}>{contract.tenantName}</AppText>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(contract.status, theme) }]}>
                <AppText style={[styles.statusText, { color: getStatusColor(contract.status, theme) }]}>
                  {getStatusLabel(contract.status, t)}
                </AppText>
              </View>
            </View>

            {/* Thông tin chính */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <AppText style={styles.infoLabel}>{t("tenantContract.rent")}</AppText>
                <AppText style={styles.infoValue}>{contract.rentFee}</AppText>
              </View>
              <View style={styles.infoItem}>
                <AppText style={styles.infoLabel}>{t("tenantContract.deposit")}</AppText>
                <AppText style={styles.infoValue}>{contract.deposit}</AppText>
              </View>
              <View style={styles.infoItem}>
                <AppText style={styles.infoLabel}>{t("tenantContract.start")}</AppText>
                <AppText style={styles.infoValue}>{contract.startDate}</AppText>
              </View>
              <View style={styles.infoItem}>
                <AppText style={styles.infoLabel}>{t("tenantContract.end")}</AppText>
                <AppText style={styles.infoValue}>{contract.endDate}</AppText>
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
                  <AppText style={styles.progressText}>
                    {t("tenantContract.used", { count: contract.usedMonths })}
                  </AppText>
                  <AppText style={styles.progressText}>
                    {t("tenantContract.remaining", { count: contract.remainingMonths })}
                  </AppText>
                </View>
              </View>
            )}

            {/* Phí dịch vụ */}
            {(contract.status === "active" || contract.status === "pending") && (
              <View style={styles.servicesBox}>
                <AppText style={styles.servicesTitle}>{t("tenantContract.services")}</AppText>
                <View style={styles.servicesGrid}>
                  <AppText style={styles.serviceItem}>⚡ {contract.serviceFees.electric}</AppText>
                  <AppText style={styles.serviceItem}>
                    {t("tenantContract.initialElectricity", { value: contract.meterTerms.initialElectricity })}
                  </AppText>
                  <AppText style={styles.serviceItem}>💧 {contract.serviceFees.water}</AppText>
                  <AppText style={styles.serviceItem}>
                    {t("tenantContract.initialWater", { value: contract.meterTerms.initialWater })}
                  </AppText>
                  <AppText style={styles.serviceItem}>🅿️ {contract.serviceFees.parking}</AppText>
                  <AppText style={styles.serviceItem}>🌐 {contract.serviceFees.internet}</AppText>
                </View>
              </View>
            )}

            {/* Nút Ký xác nhận - chỉ hiện khi status = pending (Chờ ký) */}
            {contract.status === "pending" && (
              <View style={styles.signBox}>
                <View style={styles.signHintBox}>
                  <AppText style={styles.signHint}>
                    {t("tenantContract.signHint")}
                  </AppText>
                </View>
                <Pressable
                  style={[styles.signButton, isSigning && styles.signButtonDisabled]}
                  onPress={() => handleSignContract(contract)}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <><Ionicons name="create-outline" size={19} color={theme.background} /><AppText style={styles.signButtonText}>{t("tenantContract.sign")}</AppText></>
                  )}
                </Pressable>
              </View>
            )}

            {/* Thông báo chờ duyệt */}
            {contract.status === "awaiting_approval" && (
              <>
                <View style={styles.awaitingBox}>
                  <AppText style={styles.awaitingText}>
                    {t("tenantContract.awaitingHint")}
                  </AppText>
                </View>
                {contract.depositPayment?.required &&
                  contract.depositPayment.status === "unpaid" && (
                    <View style={styles.depositPaymentCard}>
                      <View style={styles.depositPaymentCopy}>
                        <AppText style={styles.depositPaymentTitle}>
                          {t("tenantContract.depositUnpaid")}
                        </AppText>
                        <AppText style={styles.depositPaymentAmount}>
                          {contract.deposit}
                        </AppText>
                        <AppText style={styles.depositPaymentHint}>
                          {t("tenantContract.depositHint")}
                        </AppText>
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
                          <><Ionicons name="card-outline" size={18} color={theme.background} /><AppText style={styles.depositPaymentButtonText}>
                            {t("tenantContract.pay")}
                          </AppText></>
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
                    <><Ionicons name="exit-outline" size={19} color={theme.dangerForeground} /><AppText style={[styles.signButtonText, { color: theme.dangerForeground }]}>{t("tenantContract.terminateTitle")}</AppText></>
                  )}
                </Pressable>
              </View>
            )}

            {/* Thông báo chờ duyệt trả phòng */}
            {contract.status === "requesting_termination" && (
              <View style={styles.awaitingBox}>
                <AppText style={styles.awaitingText}>
                  {t("tenantContract.terminationHint")}
                </AppText>
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
