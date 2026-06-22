import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import InvoiceDetailModal from "../components/InvoiceDetailModal";
import PaymentModal from "../components/PaymentModal";
import { Invoice } from "../types/Invoice";
import { invoiceService } from "../services/invoiceService";

type FilterType = "all" | "unpaid" | "paid";

export default function InvoiceScreen() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceService.getInvoices();
      setInvoiceList(data);
    } catch (error) {
      console.log("Lỗi load hóa đơn:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoiceList.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const handlePayment = async (invoiceId: string) => {
    try {
      const updatedInvoices = await invoiceService.payInvoice(invoiceId);

      setInvoiceList(updatedInvoices);

      const updatedSelectedInvoice = updatedInvoices.find(
        (item) => item.id === selectedInvoice?.id
      );

      const updatedPaymentInvoice = updatedInvoices.find(
        (item) => item.id === paymentInvoice?.id
      );

      if (updatedSelectedInvoice) {
        setSelectedInvoice(updatedSelectedInvoice);
      }

      if (updatedPaymentInvoice) {
        setPaymentInvoice(updatedPaymentInvoice);
      }
    } catch (error) {
      console.log("Lỗi xử lý thanh toán:", error);
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
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Hóa đơn</Text>

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterButton,
              filter === "all" && styles.filterActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              Tất cả
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filter === "unpaid" && styles.filterActive,
            ]}
            onPress={() => setFilter("unpaid")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "unpaid" && styles.filterTextActive,
              ]}
            >
              Chưa TT
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filter === "paid" && styles.filterActive,
            ]}
            onPress={() => setFilter("paid")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "paid" && styles.filterTextActive,
              ]}
            >
              Đã TT
            </Text>
          </Pressable>
        </View>

        {filteredInvoices.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Không có hóa đơn phù hợp.</Text>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => {
            const isPaid = invoice.status === "paid";

            return (
              <Card key={invoice.id} style={styles.invoiceCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTitle}>
                      Hóa đơn tháng {invoice.month}
                    </Text>
                    <Text style={styles.room}>Phòng {invoice.room}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPaid ? styles.paidBadge : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPaid ? styles.paidText : styles.unpaidText,
                      ]}
                    >
                      {invoice.statusText}
                    </Text>
                  </View>
                </View>

                <Text style={styles.amount}>{invoice.amount}</Text>

                <Text style={styles.dueDate}>
                  Hạn thanh toán: {invoice.dueDate}
                </Text>

                <View style={styles.actionRow}>
                  {!isPaid && (
                    <Pressable
                      style={styles.payButton}
                      onPress={() => openPaymentModal(invoice)}
                    >
                      <Text style={styles.payText}>Thanh toán</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.detailButton}
                    onPress={() => setSelectedInvoice(invoice)}
                  >
                    <Text style={styles.detailText}>Xem chi tiết</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

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
    paddingBottom: 26,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 18,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  emptyCard: {
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  invoiceCard: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },
  room: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unpaidBadge: {
    backgroundColor: COLORS.orangeSoft,
  },
  paidBadge: {
    backgroundColor: "#EAFBEF",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  unpaidText: {
    color: COLORS.orange,
  },
  paidText: {
    color: COLORS.green,
  },
  amount: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 18,
  },
  dueDate: {
    color: COLORS.muted,
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
    backgroundColor: COLORS.orange,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  payText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  detailButton: {
    borderWidth: 1,
    borderColor: COLORS.orange,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailText: {
    color: COLORS.orange,
    fontWeight: "800",
  },
});