import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View, Pressable } from "react-native";
import { AppText } from "@/components/ui/typography";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import InvoiceDetailModal from "../components/InvoiceDetailModal";
import PaymentModal from "../components/PaymentModal";
import { Invoice } from "../types/Invoice";
import { invoiceService } from "../services/invoiceService";
import { Ionicons } from "@expo/vector-icons";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import { calculateUnpaidTotal } from "../utils/invoicePresentation";
import { formatCurrency, unformatNumber } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";
import { getStatusText } from "../utils/statusHelpers";
import { contractService } from "../services/contractService";
import { Contract } from "../types/Contract";
import TenantRoomSwitcher from "../components/TenantRoomSwitcher";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

type FilterType = "all" | "unpaid" | "paid";

type Props = {
  params?: any;
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
};

const formatInvoicePeriod = (period?: string): string => {
  if (!period) return "Hóa đơn dịch vụ";
  if (period === "final_invoice") return "Quyết toán trả phòng";
  if (period.toLowerCase().includes("tiền cọc") || period.toLowerCase() === "deposit") return "Hóa đơn tiền cọc";
  if (/^\d{1,2}\/\d{4}$/.test(period)) return `Hóa đơn tháng ${period}`;
  return `Hóa đơn ${period}`;
};

export default function InvoiceScreen({ params, selectedRoomId, onRoomSelect }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [filter, setFilter] = useState<FilterType>(params?.filter || "all");
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantContracts = await contractService.getMyContracts();
      setContracts(tenantContracts);
      const firstRoomId = tenantContracts.find((contract) => ["active", "reserved", "requesting_termination"].includes(contract.status))?.roomId;
      const roomId = selectedRoomId || firstRoomId;
      if (!selectedRoomId && firstRoomId) onRoomSelect(firstRoomId);
      const data = await invoiceService.getInvoices(roomId);
      setInvoiceList(data);
      if (params?.paymentInvoiceId) {
        const inv = data.find(i => i.id === params.paymentInvoiceId);
        if (inv) setPaymentInvoice(inv);
      }
    } catch (error) {
      console.log("Lỗi load hóa đơn:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params?.paymentInvoiceId, selectedRoomId]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = invoiceList.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });
  const unpaidInvoices = invoiceList.filter((invoice) => invoice.status === "unpaid");
  const unpaidTotal = calculateUnpaidTotal(invoiceList);

  const handlePayment = async (_invoiceId: string) => {
    try {
      await loadInvoices();
      setSelectedInvoice(null);
      setPaymentInvoice(null);
      notification.success(t("common.success"));
    } catch (error) {
      console.log("Lỗi refresh hóa đơn sau thanh toán:", error);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
  };

  const openPaymentFromDetail = (invoiceId: string) => {
    const invoice = invoiceList.find((item) => item.id === invoiceId);

    if (invoice) {
      setSelectedInvoice(null);
      setPaymentInvoice(invoice);
    }
  };

  if (isLoading) {
    return <ContentSkeleton rows={3} />;
  }

  return (
    <>
      <FlatList
        data={filteredInvoices}
        keyExtractor={(invoice) => invoice.id}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <AppText style={styles.title}>{t("invoices.title")}</AppText>
            <TenantRoomSwitcher contracts={contracts} selectedRoomId={selectedRoomId} onSelect={onRoomSelect} />
            {unpaidInvoices.length > 0 ? (
              <AnimatedEntry>
                <GradientHero
                  actionIcon="card-outline"
                  actionLabel={t("invoices.payNow")}
                  detail={`${unpaidInvoices.length} ${t("invoices.status.unpaid")}`}
                  icon="receipt-outline"
                  iconToken={FEATURE_ICONS.invoiceCreate}
                  label={t("invoices.totalAmount")}
                  onAction={() => openPaymentModal(unpaidInvoices[0])}
                  value={formatCurrency(unpaidTotal)}
                />
              </AnimatedEntry>
            ) : null}
            <View style={styles.filterRow}>
              {(["all", "unpaid", "paid"] as const).map((value) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === value }}
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filterButton, filter === value && styles.filterActive]}
                >
                  <AppText style={[styles.filterText, filter === value && styles.filterTextActive]}>
                    {value === "all" ? t("common.all") : value === "unpaid" ? t("invoices.status.unpaid") : t("invoices.status.paid")}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          invoiceList.length === 0 ? (
            <IllustratedEmptyState
              description={t("invoices.emptyDescription")}
              kind="invoice"
              title={t("invoices.empty")}
            />
          ) : (
            <View style={styles.filterEmpty}>
              <Ionicons name="filter-outline" size={22} color={theme.muted} />
              <AppText style={styles.filterEmptyText}>{t("invoices.noMatch")}</AppText>
            </View>
          )
        }
        renderItem={({ item: invoice, index }) => {
          const isClosed = invoice.status === "paid" || invoice.status === "settled";
          return (
            <AnimatedEntry delay={Math.min(index, 5) * 35}>
              <Card style={styles.invoiceCard}>
                {/* Header: Icon + Info + Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeftWrap}>
                    <FeatureIconBox token={FEATURE_ICONS.invoiceCreate} size={22} />
                    <View style={styles.cardTitleBox}>
                      <AppText style={[styles.periodTitle, { color: theme.text }]}>
                        {formatInvoicePeriod(invoice.month)}
                      </AppText>
                      <View style={styles.subInfoRow}>
                        <View style={[styles.roomTag, { backgroundColor: theme.primarySoft }]}>
                          <AppText style={[styles.roomTagText, { color: theme.primary }]}>
                            {t("common.room")} {invoice.room}
                          </AppText>
                        </View>
                        <AppText style={[styles.codeText, { color: theme.muted }]}>
                          #{invoice.id ? invoice.id.slice(-8).toUpperCase() : ""}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, isClosed ? styles.paidBadge : styles.unpaidBadge]}>
                    <Ionicons
                      name={isClosed ? "checkmark-circle" : "time-outline"}
                      size={12}
                      color={isClosed ? theme.positive : theme.warningForeground}
                    />
                    <AppText style={[styles.statusText, isClosed ? styles.paidText : styles.unpaidText]}>
                      {getStatusText("invoice", invoice.status, t)}
                    </AppText>
                  </View>
                </View>

                {/* Amount and Due Date Section */}
                <View style={[styles.amountSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <View style={styles.amountWrap}>
                    <AppText style={[styles.amountLabel, { color: theme.muted }]}>
                      {isClosed ? "Số tiền đã thanh toán" : "Số tiền cần thanh toán"}
                    </AppText>
                    <AppText style={[styles.amount, { color: isClosed ? theme.positive : theme.primary }]}>
                      {formatCurrency(invoice.numericAmount ?? unformatNumber(invoice.amount))}
                    </AppText>
                  </View>
                  <View style={styles.dueWrap}>
                    <Ionicons name="calendar-outline" size={13} color={theme.muted} />
                    <AppText style={[styles.dueDate, { color: theme.muted }]}>
                      {t("invoices.dueDate")}: {invoice.dueDate}
                    </AppText>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {!isClosed ? (
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.payButton, { backgroundColor: theme.primary }]}
                      onPress={() => openPaymentModal(invoice)}
                    >
                      <Ionicons name="card-outline" size={16} color={theme.background} />
                      <AppText style={[styles.payText, { color: theme.background }]}>
                        {t("invoices.payNow")}
                      </AppText>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.detailButton,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: theme.border,
                        flex: isClosed ? 1 : undefined,
                      },
                    ]}
                    onPress={() => setSelectedInvoice(invoice)}
                  >
                    <Ionicons name="eye-outline" size={16} color={theme.primary} />
                    <AppText style={[styles.detailText, { color: theme.primary }]}>
                      {t("common.details")}
                    </AppText>
                  </Pressable>
                </View>
              </Card>
            </AnimatedEntry>
          );
        }}
      />

      <InvoiceDetailModal
        visible={selectedInvoice !== null}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onPay={openPaymentFromDetail}
      />

      <PaymentModal
        visible={paymentInvoice !== null}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onConfirm={handlePayment}
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
    paddingBottom: 26,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 18,
    marginTop: 18,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.surface,
  },
  filterActive: {
    backgroundColor: theme.primary,
  },
  filterText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: {
    color: theme.background,
  },
  filterEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  filterEmptyText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  invoiceCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardLeftWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 8,
  },
  cardTitleBox: {
    flex: 1,
  },
  periodTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  codeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidBadge: {
    backgroundColor: theme.positiveSoft,
  },
  unpaidBadge: {
    backgroundColor: theme.warningSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  paidText: {
    color: theme.positive,
  },
  unpaidText: {
    color: theme.warningForeground,
  },
  amountSection: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountWrap: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  amount: {
    fontSize: 20,
    fontWeight: "900",
  },
  dueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  payButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 14,
  },
  payText: {
    fontWeight: "800",
    fontSize: 13,
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailText: {
    fontWeight: "800",
    fontSize: 13,
  },
});
