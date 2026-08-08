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

type FilterType = "all" | "unpaid" | "paid";

type Props = {
  params?: any;
};

export default function InvoiceScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [filter, setFilter] = useState<FilterType>(params?.filter || "all");
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await invoiceService.getInvoices();
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
  }, [params?.paymentInvoiceId]);

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
      notification.success("Cảm ơn Người thuê đã thanh toán hóa đơn.", {
        title: "Thanh toán thành công",
      });
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
            <AppText style={styles.title}>{t("invoices")}</AppText>
            {unpaidInvoices.length > 0 ? (
              <AnimatedEntry>
                <GradientHero
                  actionIcon="card-outline"
                  actionLabel={t("payInvoice")}
                  detail={`${unpaidInvoices.length} hóa đơn chưa thanh toán`}
                  icon="receipt-outline"
                  label={t("paymentDue")}
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
                    {value === "all" ? t("all") : value === "unpaid" ? t("unpaid") : t("paid")}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          invoiceList.length === 0 ? (
            <IllustratedEmptyState
              description={t("invoiceNewHere")}
              kind="invoice"
              title={t("noInvoices")}
            />
          ) : (
            <View style={styles.filterEmpty}>
              <Ionicons name="filter-outline" size={22} color={theme.muted} />
              <AppText style={styles.filterEmptyText}>{t("noMatchingInvoices")}</AppText>
            </View>
          )
        }
        renderItem={({ item: invoice, index }) => {
          const isClosed = invoice.status === "paid" || invoice.status === "settled";
          return (
            <AnimatedEntry delay={Math.min(index, 5) * 35}>
              <Card style={styles.invoiceCard}>
                <AppText style={styles.amount}>{formatCurrency(invoice.numericAmount ?? unformatNumber(invoice.amount))}</AppText>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <AppText style={{ fontSize: 11, fontWeight: '800', color: theme.primary, marginBottom: 2 }}>Mã HD: HD-{(invoice.month || "").replace("/", "")}-{(invoice.id || "000").substring(0, 3).toUpperCase()}</AppText>
                    <AppText style={styles.cardTitle}>Hóa đơn tháng {invoice.month}</AppText>
                    <AppText style={styles.room}>Phòng {invoice.room}</AppText>
                  </View>
                  <View style={[styles.statusBadge, isClosed ? styles.paidBadge : styles.unpaidBadge]}>
                    <AppText style={[styles.statusText, isClosed ? styles.paidText : styles.unpaidText]}>
                      {invoice.statusText}
                    </AppText>
                  </View>
                </View>
                <AppText style={styles.dueDate}>Hạn thanh toán: {invoice.dueDate}</AppText>
                <View style={styles.actionRow}>
                  {!isClosed ? (
                    <Pressable style={styles.payButton} onPress={() => openPaymentModal(invoice)}>
                      <Ionicons name="card-outline" size={18} color={theme.background} />
                      <AppText style={styles.payText}>{t("pay")}</AppText>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.detailButton} onPress={() => setSelectedInvoice(invoice)}>
                    <Ionicons name="eye-outline" size={18} color={theme.primary} />
                    <AppText style={styles.detailText}>{t("details")}</AppText>
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
    backgroundColor: theme.surface,
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    padding: 18,
  },
  filterEmptyText: { color: theme.muted, flex: 1, fontSize: 13, fontWeight: "700" },
  invoiceCard: {
    marginBottom: 14,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
  },
  room: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  unpaidBadge: {
    backgroundColor: theme.warningSoft,
  },
  paidBadge: {
    backgroundColor: theme.positiveSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  unpaidText: {
    color: theme.warningForeground,
  },
  paidText: {
    color: theme.positive,
  },
  amount: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.text,
    marginTop: 18,
  },
  dueDate: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  payButton: {
    alignItems: "center",
    backgroundColor: theme.primary,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
  },
  payText: {
    color: theme.background,
    fontWeight: "800",
  },
  detailButton: {
    alignItems: "center",
    backgroundColor: theme.primarySoft,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  detailText: {
    color: theme.primary,
    fontWeight: "800",
  },
});
