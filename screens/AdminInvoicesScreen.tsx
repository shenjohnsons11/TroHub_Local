import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import { adminService, AdminInvoice, AdminRoom, AdminContract, BillingAutomationPolicy } from "../services/adminService";
import InvoiceDetailModal from "../components/InvoiceDetailModal";
import AutomationStatusCard from "../components/AutomationStatusCard";
import QuickAutoBillingModal from "../components/QuickAutoBillingModal";
import { Invoice } from "../types/Invoice";
import { formatCurrency, formatMeterReading, formatNumberInput, parseMeterReading, unformatNumber } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";
type Props = {
  params?: any;
  onNavigate?: (tab: any, params?: any) => void;
};

export default function AdminInvoicesScreen({ params, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [automationPolicy, setAutomationPolicy] = useState<BillingAutomationPolicy>({ autoInvoiceEnabled: false, invoiceDay: 25, dueDay: 5, autoRemindEnabled: true, remindDaysBeforeDue: 2 });
  const [automationVisible, setAutomationVisible] = useState(false);

  // Modal states for creating invoice
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  // Meter readings
  const [elecOld, setElecOld] = useState("0");
  const [elecNew, setElecNew] = useState("0");
  const [waterOld, setWaterOld] = useState("0");
  const [waterNew, setWaterNew] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((item) => item._id === roomId);
    const oldElec = room?.lastElectricityReading ?? 0;
    const oldWater = room?.lastWaterReading ?? 0;

    // Lấy chỉ số nháp vừa ghi từ mục Điện & Nước nếu có, ngược lại lấy chỉ số cũ
    const newElec = (room as any)?.draftElectricity !== undefined && (room as any)?.draftElectricity !== null && (room as any)?.draftElectricity !== ''
      ? (room as any).draftElectricity
      : oldElec;
    const newWater = (room as any)?.draftWater !== undefined && (room as any)?.draftWater !== null && (room as any)?.draftWater !== ''
      ? (room as any).draftWater
      : oldWater;

    setElecOld(formatMeterReading(oldElec));
    setElecNew(formatMeterReading(newElec));
    setWaterOld(formatMeterReading(oldWater));
    setWaterNew(formatMeterReading(newWater));
  };


  const loadData = async () => {
    try {
      const [invoicesData, roomsData, contractsData, policy] = await Promise.all([
        adminService.getInvoices(),
        adminService.getRooms(),
        adminService.getContracts(),
        adminService.getBillingAutomationPolicy(),
      ]);
      setInvoices(invoicesData);
      setRooms(roomsData);
      setContracts(contractsData);
      setAutomationPolicy(policy);
    } catch (error) {
      console.log("Lỗi tải dữ liệu hóa đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Default period to current MM/YYYY
    const now = new Date();
    setPeriod(`${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`);
    
    // Default due date to 7 days from now (YYYY-MM-DD)
    const due = new Date();
    due.setDate(due.getDate() + 7);
    setDueDate(due.toISOString().split("T")[0]);
  }, []);

  const handleCreateInvoice = async () => {
    if (!selectedRoomId || !period.trim() || !dueDate.trim()) {
      notification.error(t("mobile.invoices.required"));
      return;
    }

    const roomContract = contracts.find(
      c => c.status === 1 && (typeof c.roomId === "string" ? c.roomId === selectedRoomId : c.roomId._id === selectedRoomId)
    );

    if (!roomContract) {
      notification.error(t("mobile.invoices.noContract"));
      return;
    }

    const electricityOld = parseMeterReading(elecOld);
    const electricityNew = parseMeterReading(elecNew);
    const waterPrevious = parseMeterReading(waterOld);
    const waterCurrent = parseMeterReading(waterNew);
    if (electricityOld === null || electricityNew === null || waterPrevious === null || waterCurrent === null || electricityNew < electricityOld || waterCurrent < waterPrevious) {
      notification.error("Chỉ số kỳ này phải hợp lệ và không nhỏ hơn chỉ số kỳ trước.");
      return;
    }

    try {
      setSubmitting(true);
      const roomCode = (roomContract.roomId && typeof roomContract.roomId === "object") ? roomContract.roomId.roomCode : "";
      const tenantName = (roomContract.tenantId && typeof roomContract.tenantId === "object") ? roomContract.tenantId.fullName : "";
      
      const [m, y] = period.split("/");
      const fromDate = `${y}-${m}-01`;
      const toDate = `${y}-${m}-${new Date(Number(y), Number(m), 0).getDate()}`;

      const rentPrice = roomContract.fixedRentPrice || 0;
      
      let electricityPrice = 4000;
      let waterPrice = 20000;
      let servicesFee = 130000;

      if (roomContract.services && roomContract.services.length > 0) {
        let otherTotal = 0;
        let hasElec = false;
        let hasWater = false;
        
        for (const s of roomContract.services) {
          const sName = ((s.serviceId as any)?.name || "").toLowerCase();
          const p = s.fixedPrice || (s.serviceId as any)?.defaultPrice || 0;
          if (sName.includes("điện")) {
            electricityPrice = p;
            hasElec = true;
          } else if (sName.includes("nước")) {
            waterPrice = p;
            hasWater = true;
          } else {
            otherTotal += p;
          }
        }
        
        // Nếu có dịch vụ từ hợp đồng thì mới update lại servicesFee
        if (hasElec || hasWater || otherTotal > 0) {
          servicesFee = otherTotal;
        }
      }
      
      const electricityAmount = Math.round((electricityNew - electricityOld) * electricityPrice);
      const waterAmount = Math.round((waterCurrent - waterPrevious) * waterPrice);
      const totalAmount = rentPrice + electricityAmount + waterAmount + servicesFee;

      const rId = typeof roomContract.roomId === "string" ? roomContract.roomId : roomContract.roomId._id;
      const tId = typeof roomContract.tenantId === "string" ? roomContract.tenantId : roomContract.tenantId._id;

      await adminService.createInvoice({
        contractId: roomContract._id,
        roomId: rId,
        tenantUserId: tId,
        period: period.trim(),
        dueDate: dueDate.trim(),
        fromDate,
        toDate,
        room: roomCode,
        tenant: tenantName,
        roomAmount: rentPrice,
        electricityOld,
        electricityNew,
        electricityPrice: electricityPrice,
        waterOld: waterPrevious,
        waterNew: waterCurrent,
        waterPrice: waterPrice,
        services: servicesFee,
        discount: 0,
        total: totalAmount,
        status: 1 // 1: Chưa thanh toán
      });
      notification.success(t("mobile.invoices.created"));
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("mobile.invoices.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return t("mobile.invoices.draft");
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return t("mobile.invoices.unpaid");
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return t("mobile.invoices.paid");
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return t("mobile.invoices.overdue");
    if (status === 4 || status === "SETTLED" || status === "Đã gộp quyết toán") return t("mobile.invoices.settled");
    return t("mobile.invoices.unpaid");
  };

  const getStatusColor = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return theme.warningForeground;
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return theme.danger;
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return theme.positive;
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return theme.muted;
    if (status === 4 || status === "SETTLED" || status === "Đã gộp quyết toán") return theme.primary;
    return theme.danger;
  };

  const getStatusBg = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return theme.warningSoft;
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return theme.warningSoft;
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return theme.positiveSoft;
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return theme.surface;
    if (status === 4 || status === "SETTLED" || status === "Đã gộp quyết toán") return theme.primarySoft;
    return theme.warningSoft;
  };

  const handleRemind = async (invoiceId: string) => {
    try {
      setRemindingId(invoiceId);
      await adminService.remindInvoice(invoiceId);
      notification.success("✅ Đã gửi thông báo nhắc nợ tới Khách thuê thành công!");
      loadData();
    } catch (err: any) {
      notification.error(err?.message || t("mobile.invoices.remindFailed"));
    } finally {
      setRemindingId(null);
    }
  };

  const handleOpenDetail = (item: AdminInvoice) => {
    const statusVal = item.status as any;
    const isPaid = statusVal === 2 || statusVal === "PAID" || statusVal === "Đã thanh toán";
    const isSettled = statusVal === 4 || statusVal === "SETTLED" || statusVal === "Đã gộp quyết toán";
    
    const detailsArr = item.details || [];
    
    let elecOld = item.electricityOld ?? null;
    let elecNew = item.electricityNew ?? null;
    let elecAmount = item.electricity || 0;
    
    let waterOld = item.waterOld ?? null;
    let waterNew = item.waterNew ?? null;
    let waterAmount = item.water || 0;
    
    let parkingAmount = item.parking || 0;
    let internetAmount = item.internet || 0;
    let garbageAmount = item.garbage || 0;
    let otherServicesAmount = item.services || 0;
    
    let roomFee = item.rent ?? item.roomAmount ?? 0;

    if (detailsArr.length > 0) {
      const elecDetail = detailsArr.find(d => {
        const name = (d.serviceId?.name || "").toLowerCase();
        return name.includes("điện") || name.includes("dien");
      });
      if (elecDetail) {
        elecOld = elecDetail.oldIndex ?? null;
        elecNew = elecDetail.newIndex ?? null;
        elecAmount = elecDetail.amount || 0;
      }
      
      const waterDetail = detailsArr.find(d => {
        const name = (d.serviceId?.name || "").toLowerCase();
        return name.includes("nước") || name.includes("nuoc");
      });
      if (waterDetail) {
        waterOld = waterDetail.oldIndex ?? null;
        waterNew = waterDetail.newIndex ?? null;
        waterAmount = waterDetail.amount || 0;
      }

      parkingAmount = detailsArr.filter(d => {
        const name = (d.serviceId?.name || "").toLowerCase();
        return name.includes("xe") || name.includes("parking");
      }).reduce((sum, d) => sum + (d.amount || 0), 0);

      internetAmount = detailsArr.filter(d => {
        const name = (d.serviceId?.name || "").toLowerCase();
        return name.includes("wifi") || name.includes("internet") || name.includes("mạng") || name.includes("mang");
      }).reduce((sum, d) => sum + (d.amount || 0), 0);
      
      garbageAmount = detailsArr.filter(d => {
        const name = (d.serviceId?.name || "").toLowerCase();
        return name.includes("rác") || name.includes("rac") || name.includes("vệ sinh") || name.includes("ve sinh");
      }).reduce((sum, d) => sum + (d.amount || 0), 0);

      otherServicesAmount = 0;
      
      if (item.type !== "deposit" && !roomFee) {
        const totalServices = elecAmount + waterAmount + parkingAmount + internetAmount + garbageAmount;
        roomFee = Math.max((item.totalAmount || 0) - totalServices, 0);
      }
    } else {
      if (item.type !== "deposit" && roomFee === 0) {
        roomFee = Math.max((item.totalAmount || 0) - elecAmount - waterAmount - parkingAmount - internetAmount - garbageAmount - otherServicesAmount, 0);
      }
    }

    setSelectedInvoice({
      id: item._id,
      type: item.type || (item.period === "Tiền cọc" ? "deposit" : "monthly"),
      depositAmount: item.depositAmount || 0,
      tenantName: item.tenantName || item.contractId?.tenantId?.fullName || item.tenant || "",
      tenantPhone: item.tenantPhone || item.contractId?.tenantId?.phone || "",
      month: item.period || "",
      room: item.roomName || item.room || item.contractId?.roomId?.roomCode || "",
      amount: formatCurrency(item.totalAmount),
      status: isPaid ? "paid" : isSettled ? "settled" : "unpaid",
      statusText: getStatusText(item.status),
      dueDate: item.dueDate || "",
      details: {
        roomFee: formatCurrency(roomFee),
        electric: {
          amount: formatCurrency(elecAmount),
          oldIndex: elecOld,
          newIndex: elecNew,
        },
        water: {
          amount: formatCurrency(waterAmount),
          oldIndex: waterOld,
          newIndex: waterNew,
        },
        parking: formatCurrency(parkingAmount),
        internet: formatCurrency(internetAmount),
        garbage: formatCurrency(garbageAmount),
        otherServices: formatCurrency(otherServicesAmount)
      }
    });
  };

  const handleConfirmPaid = async (invoiceId: string) => {
    try {
      await adminService.confirmPaidInvoice(invoiceId);
      notification.success(t("mobile.invoices.confirmed"));
      setSelectedInvoice(null);
      loadData();
    } catch {
      notification.error(t("mobile.invoices.confirmFailed"));
    }
  };

  useEffect(() => {
    if (loading || !params?.invoiceId) return;
    const invoice = invoices.find((item) => item._id === params.invoiceId);
    if (invoice) handleOpenDetail(invoice);
  }, [loading, params?.invoiceId]);

  const filteredInvoices = invoices.filter(invoice => {
    const status = invoice.status as any;
    const isUnpaid = status === 1 || status === 0 || status === 3 || status === "UNPAID" || status === "DRAFT" || status === "OVERDUE" || status === "Chưa thanh toán" || status === "Nháp" || status === "Quá hạn";
    const isPaid = status === 2 || status === 4 || status === "PAID" || status === "SETTLED" || status === "Đã thanh toán" || status === "Đã gộp quyết toán";
    if (filter === "unpaid") return isUnpaid;
    if (filter === "paid") return isPaid;
    return true;
  });

  const occupiedRooms = rooms.filter(room => room.status === 1);
  const invalidMeterReading = [parseMeterReading(elecOld), parseMeterReading(elecNew), parseMeterReading(waterOld), parseMeterReading(waterNew)].some((value) => value === null)
    || (parseMeterReading(elecNew) ?? 0) < (parseMeterReading(elecOld) ?? 0)
    || (parseMeterReading(waterNew) ?? 0) < (parseMeterReading(waterOld) ?? 0);

  if (loading) return <ContentSkeleton rows={4} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GradientHero icon="receipt-outline" iconToken={FEATURE_ICONS.invoiceCreate} label={t("mobile.invoices.heroLabel")} value={formatCurrency(invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0))} detail={t("mobile.invoices.heroDetail", { count: invoices.length })} />

            <View style={styles.headingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={[styles.title, { color: theme.text }]}>{t("mobile.invoices.title") || "Quản lý hóa đơn"}</AppText>
                <AppText style={[styles.subtitle, { color: theme.muted }]}>{t("mobile.invoices.subtitle") || "Theo dõi và phát hành hóa đơn hàng tháng"}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.background} />
                <AppText style={[styles.addButtonText, { color: theme.background }]}>{t("mobile.invoices.create") || "Tạo mới"}</AppText>
              </Pressable>
            </View>

            <View style={styles.subActionBar}>
              <Pressable accessibilityRole="button" style={[styles.toolBtn, { backgroundColor: FEATURE_ICONS.scanMeter.bg, borderColor: `${FEATURE_ICONS.scanMeter.color}30` }]} onPress={() => onNavigate && onNavigate('scan_meter')}>
                <View style={styles.toolIconBox}>
                  <Ionicons name={FEATURE_ICONS.scanMeter.icon} size={16} color={FEATURE_ICONS.scanMeter.color} />
                </View>
                <AppText style={[styles.toolBtnText, { color: theme.text }]}>{t("dashboard.scanMeter") || "Quét điện nước AI"}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" style={[styles.toolBtn, { backgroundColor: FEATURE_ICONS.invoiceBulk.bg, borderColor: `${FEATURE_ICONS.invoiceBulk.color}30` }]} onPress={() => onNavigate && onNavigate('invoice_bulk')}>
                <View style={styles.toolIconBox}>
                  <Ionicons name={FEATURE_ICONS.invoiceBulk.icon} size={16} color={FEATURE_ICONS.invoiceBulk.color} />
                </View>
                <AppText style={[styles.toolBtnText, { color: theme.text }]}>{t("mobile.invoices.bulk") || "Hàng loạt"}</AppText>
              </Pressable>
            </View>

            {/* Bộ lọc */}
            <View style={styles.filterContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === "all" }}
                style={[styles.filterButton, filter === "all" && styles.filterActive]}
                onPress={() => setFilter("all")}
              >
                <AppText style={[styles.filterText, filter === "all" && styles.filterTextActive]}>{t("common.all")}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === "unpaid" }}
                style={[styles.filterButton, filter === "unpaid" && styles.filterActive]}
                onPress={() => setFilter("unpaid")}
              >
                <AppText style={[styles.filterText, filter === "unpaid" && styles.filterTextActive]}>{t("mobile.invoices.unpaidFilter")}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === "paid" }}
                style={[styles.filterButton, filter === "paid" && styles.filterActive]}
                onPress={() => setFilter("paid")}
              >
                <AppText style={[styles.filterText, filter === "paid" && styles.filterTextActive]}>{t("mobile.invoices.paidFilter")}</AppText>
              </Pressable>
            </View>

            <AutomationStatusCard policy={automationPolicy} onConfigure={() => setAutomationVisible(true)} />
          </>
        }
        ListEmptyComponent={<IllustratedEmptyState kind="invoice" title={invoices.length ? t("mobile.invoices.noMatch") : t("mobile.invoices.empty")} description={invoices.length ? t("mobile.invoices.tryFilter") : t("mobile.invoices.emptyDescription")} actionLabel={invoices.length ? undefined : t("mobile.invoices.createInvoice")} actionIcon="receipt-outline" onAction={invoices.length ? undefined : () => setModalVisible(true)} />}
        renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 6) * 45}><Pressable accessibilityRole="button" accessibilityLabel={t("mobile.invoices.open", { roomCode: item.room || item.contractId?.roomId?.roomCode || "N/A" })} style={styles.invoiceCard} onPress={() => handleOpenDetail(item)}>
            <FeatureIconBox token={FEATURE_ICONS.invoiceCreate} style={{ marginRight: 10 }} accessibilityLabel={t("mobile.invoices.open", { roomCode: item.room || item.contractId?.roomId?.roomCode || "N/A" })} />
            <View style={styles.invoiceInfo}>
              <AppText style={styles.invoicePeriod}>{t("mobile.invoices.code", { code: item.invoiceCode || `HD-${(item.period || "").replace("/", "")}-${(item._id || "000").substring(0, 3).toUpperCase()}` })}</AppText>
              <AppText style={styles.roomCode}>{t("mobile.invoices.room", { roomCode: item.roomCode || item.room || item.contractId?.roomId?.roomCode || "N/A" })}</AppText>
              <AppText style={styles.invoicePeriod}>{t("mobile.invoices.period", { period: item.period === "Tiền cọc" ? t("contracts.deposit") : item.period || "" })}</AppText>
              <AppText style={styles.invoiceAmount}>{t("mobile.invoices.total", { amount: formatCurrency(item.totalAmount) })}</AppText>
              <AppText style={styles.invoiceSub}>{t("mobile.invoices.tenant", { name: item.nguoiThue || item.tenant || item.contractId?.tenantId?.fullName || "N/A" })}</AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                <AppText style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</AppText>
              </View>
              {((item.status as any) === 1 || (item.status as any) === "UNPAID" || (item.status as any) === "Chưa thanh toán") && (
                <AppButton
                  accessibilityLabel={t("mobile.invoices.remindLabel", { roomCode: item.room || item.contractId?.roomId?.roomCode || "N/A" })}
                  icon="notifications-outline"
                  loading={remindingId === item._id}
                  disabled={remindingId === item._id}
                  style={styles.remindButton}
                  onPress={(e) => { e.stopPropagation(); handleRemind(item._id); }}
                >
                  {t("mobile.invoices.remind")}
                </AppButton>
              )}
            </View>
          </Pressable></AnimatedEntry>
        )}
      />

      <QuickAutoBillingModal visible={automationVisible} policy={automationPolicy} onClose={() => setAutomationVisible(false)} onSaved={setAutomationPolicy} />

      {/* Modal Tạo hóa đơn mới */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View accessibilityViewIsModal style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t("mobile.invoices.newTitle")}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.invoices.closeNew")} disabled={submitting} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={(item) => String(item)}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={() => (
                <View style={styles.form}>
                  <AppText style={styles.label}>{t("mobile.invoices.selectRoom")}</AppText>
                  <View style={styles.roomSelectGrid}>
                    {occupiedRooms.length === 0 ? (
                      <AppText style={styles.noOccupiedText}>{t("mobile.invoices.noOccupied")}</AppText>
                    ) : (
                      occupiedRooms.map((room) => (
                        <Pressable
                          key={room._id}
                          accessibilityRole="radio"
                          accessibilityLabel={t("mobile.invoices.selectRoomLabel", { roomCode: room.roomCode })}
                          accessibilityState={{ selected: selectedRoomId === room._id }}
                          style={[
                            styles.roomSelectItem,
                            selectedRoomId === room._id && styles.roomSelectActive
                          ]}
                          onPress={() => handleSelectRoom(room._id)}
                        >
                          <AppText
                            style={[
                              styles.roomSelectText,
                              selectedRoomId === room._id && styles.roomSelectTextActive
                            ]}
                          >
                            {room.roomCode}
                          </AppText>
                        </Pressable>
                      ))
                    )}
                  </View>

                  <AppText style={styles.label}>{t("mobile.invoices.periodInput")}</AppText>
                  <AppTextInput
                    style={styles.input}
                    value={period}
                    onChangeText={setPeriod}
                    placeholder="MM/YYYY"
                  />

                  <AppText style={styles.label}>{t("mobile.invoices.dueDate")}</AppText>
                  <AppTextInput
                    style={styles.input}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                  />

                  {/* Chỉ số điện */}
                  <View style={styles.indexRow}>
                    <View style={styles.indexCol}>
                      <AppText style={styles.label}>{t("mobile.invoices.electricityOld")}</AppText>
                      <AppTextInput
                        style={styles.input}
                        value={elecOld}
                        onChangeText={(value) => setElecOld(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.indexCol}>
                      <AppText style={styles.label}>{t("mobile.invoices.electricityNew")}</AppText>
                      <AppTextInput
                        style={styles.input}
                        value={elecNew}
                        onChangeText={(value) => setElecNew(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Chỉ số nước */}
                  <View style={styles.indexRow}>
                    <View style={styles.indexCol}>
                      <AppText style={styles.label}>{t("mobile.invoices.waterOld")}</AppText>
                      <AppTextInput
                        style={styles.input}
                        value={waterOld}
                        onChangeText={(value) => setWaterOld(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.indexCol}>
                      <AppText style={styles.label}>{t("mobile.invoices.waterNew")}</AppText>
                      <AppTextInput
                        style={styles.input}
                        value={waterNew}
                        onChangeText={(value) => setWaterNew(parseMeterReading(value) === null ? value : formatMeterReading(value))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {invalidMeterReading ? <AppText style={styles.meterError}>Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.</AppText> : null}
                  <AppButton
                    icon="receipt-outline"
                    loading={submitting}
                    onPress={handleCreateInvoice}
                    disabled={invalidMeterReading}
                  >
                    {t("mobile.invoices.createInvoice")}
                  </AppButton>
                </View>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <InvoiceDetailModal
        visible={selectedInvoice !== null}
        invoice={selectedInvoice}
        role="admin"
        onClose={() => setSelectedInvoice(null)}
        onConfirmPaid={handleConfirmPaid}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  meterError: { color: theme.danger, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 12 },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surfaceElevated,
  },
  filterActive: {
    backgroundColor: theme.primarySoft,
  },
  filterText: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "800",
  },
  filterTextActive: {
    color: theme.primary,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 130,
    gap: 10,
  },
  invoiceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surfaceElevated,
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    shadowColor: theme.text,
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  invoiceInfo: {
    flex: 1,
  },
  roomCode: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
  },
  invoicePeriod: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.primary,
    marginVertical: 4,
  },
  invoiceSub: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: "600",
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
  remindButton: {
    minHeight: 38,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 22,
    marginBottom: 6,
  },
  title: {
    color: theme.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 3,
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  subActionBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  toolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  toolIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.text,
  },
  form: {
    width: "100%",
    paddingBottom: 20,
  },
  label: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.text,
  },
  roomSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roomSelectItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceElevated,
  },
  roomSelectActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  roomSelectText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: "700",
  },
  roomSelectTextActive: {
    color: theme.primary,
    fontWeight: "900",
  },
  noOccupiedText: {
    fontSize: 13,
    color: theme.danger,
    fontWeight: "700",
  },
  indexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  indexCol: {
    width: "48%",
  },
  submitButton: {
    height: 48,
    backgroundColor: theme.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
