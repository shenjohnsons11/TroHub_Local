import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { adminService, AdminContract, AdminRoom, AdminTenant, CheckoutPreview } from "../services/adminService";
import {
  defaultContractDates,
  displayDateToLocalDate,
  formatDisplayDateInput,
  parseDisplayToIso,
  resolveEndDateAfterStartChange,
  validateContractDateRange,
} from "../utils/contractDate";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import ProgressStepper from "../components/ui/ProgressStepper";
import { draftContractService, DraftContract } from "../services/draftContractService";
import CheckoutModal from "../components/modals/CheckoutModal";
import {
  formatCurrency,
  formatNumberInput,
  formatPhone,
  unformatNumber,
} from "../utils/formatters";

type Props = { params?: any };
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const contractSteps: { label: string; icon: IconName }[] = [
  { label: "Chọn phòng", icon: "home-outline" },
  { label: "Thông tin khách", icon: "person-outline" },
  { label: "Điện & nước", icon: "flash-outline" },
  { label: "Ký & xác nhận", icon: "create-outline" },
];

export default function AdminContractsScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const initialDates = defaultContractDates();
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "checkout" | "draft">("all");
  const [drafts, setDrafts] = useState<DraftContract[]>([]);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutContractId, setCheckoutContractId] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPreviewLoading, setCheckoutPreviewLoading] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutPreview | null>(null);
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [fixedRent, setFixedRent] = useState("");
  const [fixedDeposit, setFixedDeposit] = useState("");
  const [initialElectricity, setInitialElectricity] = useState("");
  const [initialWater, setInitialWater] = useState("");
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [endDateWasEdited, setEndDateWasEdited] = useState(false);
  const [datePickerField, setDatePickerField] = useState<"startDate" | "endDate" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [services, setServices] = useState({
    electricity: { enabled: true, price: formatNumberInput(3500) },
    water: { enabled: true, price: formatNumberInput(15000) },
    trash: { enabled: true, price: "20.000" },
    internet: { enabled: true, price: "100.000" },
    management: { enabled: false, price: "50.000" },
  });

  const loadData = async () => {
    try {
      const [contractsData, roomsData, tenantsData] = await Promise.all([
        adminService.getContracts(),
        adminService.getRooms(),
        adminService.getTenants(),
      ]);
      setContracts(contractsData);
      setRooms(roomsData);
      setTenants(tenantsData);
    } catch (error) {
      console.log("Lỗi tải dữ liệu hợp đồng:", error);
      notification.error("Không thể tải dữ liệu hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Keep the original mount-only fetch contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const action = params?.aiAction;
    if (action?.type !== "FILL_CONTRACT_FORM" || !rooms.length) return;
    const room = rooms.find((item) => item.roomCode?.trim().toLowerCase() === action.roomCode?.trim().toLowerCase());
    if (!room) return notification.warning(`Không tìm thấy phòng ${action.roomCode}.`);
    const tenant = tenants.find((item) => item.fullName?.trim().toLowerCase() === action.tenantName?.trim().toLowerCase());
    setModalVisible(true);
    setCurrentStep(1);
    handleSelectRoom(room._id);
    setFixedRent(formatNumberInput(action.rentPrice));
    const [year, month, day] = action.startDate.split("-");
    if (year && month && day) setStartDate(`${day}/${month}/${year}`);
    if (tenant) setSelectedTenantId(tenant._id);
    else notification.info(`Chưa có người thuê “${action.tenantName}”. Hãy chọn hoặc tạo hồ sơ.`);
  }, [params?.aiAction, rooms, tenants]);

  const closeWizard = async () => {
    if (selectedRoomId || selectedTenantId) {
      await draftContractService.saveDraft({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate,
        endDate,
        fixedRentPrice: fixedRent,
        fixedDeposit,
        initialElectricity,
        initialWater,
        step: currentStep,
      });
      loadData();
    }
    setModalVisible(false);
    setSelectedRoomId("");
    setSelectedTenantId("");
    setCurrentStep(1);
    setConfirmed(false);
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((item) => item._id === roomId);
    if (room) {
      setFixedRent(formatNumberInput(room.defaultRentPrice));
      setFixedDeposit(formatNumberInput(room.defaultDeposit));
      setInitialElectricity(formatNumberInput(room.lastElectricityReading ?? room.draftElectricity));
      setInitialWater(formatNumberInput(room.lastWaterReading ?? room.draftWater));
    }
  };

  const handleCreateContract = async () => {
    if (!selectedRoomId || !selectedTenantId || !fixedRent.trim() || !fixedDeposit.trim() || !startDate.trim() || !endDate.trim()) {
      notification.error("Vui lòng điền đầy đủ thông tin!", { title: "Lỗi" });
      return;
    }

    const dateErrors = validateContractDateRange(startDate, endDate);
    const startDateIso = parseDisplayToIso(startDate);
    const endDateIso = parseDisplayToIso(endDate);
    if (Object.keys(dateErrors).length || !startDateIso || !endDateIso) {
      notification.error(
        dateErrors.startDate || dateErrors.endDate || "Ngày phải đúng định dạng dd/mm/yyyy.",
        { title: "Ngày hợp đồng không hợp lệ" },
      );
      setCurrentStep(2);
      return;
    }
    const meterTerms = {
      electricityPrice: unformatNumber(services.electricity.price),
      waterPrice: unformatNumber(services.water.price),
      initialElectricity: unformatNumber(initialElectricity),
      initialWater: unformatNumber(initialWater),
    };
    if (Object.values(meterTerms).some((value) => !Number.isFinite(value) || value < 0)) {
      notification.error("Giá và chỉ số đầu điện nước phải là số không âm.", { title: "Lỗi" });
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    const closeLoading = notification.loading("Đang tạo hợp đồng...");
    try {
      await adminService.createContract({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate: startDateIso,
        endDate: endDateIso,
        fixedRentPrice: unformatNumber(fixedRent),
        fixedDeposit: unformatNumber(fixedDeposit),
        ...meterTerms,
      });
      notification.success("Tạo hợp đồng nháp thành công! Chờ người thuê ký xác nhận.");
      
      setModalVisible(false);
      setSelectedRoomId("");
      setSelectedTenantId("");
      setInitialElectricity("");
      setInitialWater("");
      setCurrentStep(1);
      setConfirmed(false);
      const nextDefaults = defaultContractDates();
      setStartDate(nextDefaults.startDate);
      setEndDate(nextDefaults.endDate);
      setEndDateWasEdited(false);
      void loadData();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Tạo hợp đồng thất bại!");
    } finally {
      closeLoading();
      setSubmitting(false);
    }
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const field = datePickerField;
    setDatePickerField(null);
    if (event.type === "dismissed" || !field || !selectedDate) return;
    const selectedDisplayDate = defaultContractDates(selectedDate).startDate;
    if (field === "startDate") {
      setStartDate(selectedDisplayDate);
      setEndDate((currentEndDate) =>
        resolveEndDateAfterStartChange(selectedDisplayDate, endDateWasEdited, currentEndDate),
      );
      return;
    }
    setEndDate(selectedDisplayDate);
    setEndDateWasEdited(true);
  };

  const handleApproveContract = async (contractId: string) => {
    const approved = await notification.confirm({
      title: "Xác nhận",
      message: "Bạn có chắc chắn muốn duyệt và kích hoạt hợp đồng này không?",
      confirmText: "Duyệt",
      cancelText: "Hủy",
    });
    if (!approved) return;

    setLoading(true);
    const closeLoading = notification.loading("Đang duyệt hợp đồng...");
    try {
      const success = await adminService.confirmContract(contractId);
      if (!success) throw new Error("Không thể xác nhận hợp đồng");
      notification.success("Đã duyệt và kích hoạt hợp đồng thành công!");
      void loadData();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Duyệt hợp đồng thất bại!");
      setLoading(false);
    } finally {
      closeLoading();
    }
  };

  const openCheckoutModal = async (contractId: string) => {
    setCheckoutContractId(contractId);
    setCheckoutPreview(null);
    setCheckoutModalVisible(true);
    setCheckoutPreviewLoading(true);
    try {
      setCheckoutPreview(await adminService.getCheckoutPreview(contractId));
    } catch (error) {
      setCheckoutModalVisible(false);
      notification.error(error instanceof Error ? error.message : "Không thể tải bảng quyết toán.");
    } finally {
      setCheckoutPreviewLoading(false);
    }
  };

  const getStatusText = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) {
      return "Cọc trước - Chờ nhận phòng";
    }
    switch (contract.status) {
      case 0: return "Chờ khách ký";
      case 1: return "Đang hiệu lực";
      case 2: return "Đã trả phòng";
      case 3: return "Đã hủy";
      case 4: return "Chờ chủ duyệt";
      case 5: return "Chờ duyệt trả phòng";
      default: return "Nháp";
    }
  };
  const getStatusColor = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) return theme.primary; // Xanh dương
    if (contract.status === 1) return theme.positive; // Xanh lá
    if (contract.status === 3) return theme.danger;
    if (contract.status === 0 || contract.status === 4 || contract.status === 5) return theme.warningForeground;
    return theme.muted;
  };
  const getStatusBg = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) return theme.primarySoft;
    if (contract.status === 1) return theme.positiveSoft;
    if (contract.status === 0 || contract.status === 3 || contract.status === 4 || contract.status === 5) return theme.warningSoft;
    return theme.surfaceElevated;
  };

  const filteredContracts = contracts.filter((contract) => {
    if (filter === "pending") return contract.status === 0 || contract.status === 4;
    if (filter === "active") return contract.status === 1;
    if (filter === "checkout") return contract.status === 5 || contract.status === 2; // Include expired/checkout
    return filter === "all";
  });
  const selectableRooms = rooms.filter((room) => room.status === 0 || room.status === 1);
  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị hợp đồng...</Text>
      </View>
    );
  }

  const filterButton = (value: typeof filter, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: filter === value }}
      onPress={() => setFilter(value)}
      style={[styles.filterButton, filter === value && styles.filterActive]}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredContracts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AnimatedEntry>
              <GradientHero
                icon="documents-outline"
                label="HỢP ĐỒNG VẬN HÀNH"
                value={`${contracts.length} hợp đồng`}
                detail={`${contracts.filter((item) => item.status === 1).length} đang có hiệu lực`}
              />
            </AnimatedEntry>
            <View style={styles.headingRow}>
              <View>
                <Text style={styles.title}>Quản lý hợp đồng</Text>
                <Text style={styles.subtitle}>Theo dõi, tạo mới và phê duyệt.</Text>
              </View>
              <AppButton icon="add-circle-outline" onPress={() => setModalVisible(true)} style={styles.addButton}>
                Tạo mới
              </AppButton>
            </View>
            <View style={styles.filterContainer}>
              {filterButton("all", "Tất cả")}
              {filterButton("pending", "Chờ duyệt/ký")}
              {filterButton("active", "Hiệu lực")}
            </View>
          </View>
        }
        ListEmptyComponent={
          contracts.length === 0 ? (
            <IllustratedEmptyState
              kind="contract"
              title="Chưa có hợp đồng"
              description="Tạo hợp đồng đầu tiên để bắt đầu quản lý phòng và người thuê."
              actionLabel="Tạo hợp đồng"
              actionIcon="add-circle-outline"
              onAction={() => setModalVisible(true)}
            />
          ) : (
            <Text style={styles.filteredEmpty}>Không có hợp đồng phù hợp bộ lọc.</Text>
          )
        }
        renderItem={({ item, index }) => {
          const roomCode = item.roomId && typeof item.roomId === "object" ? item.roomId.roomCode : "N/A";
          const tenantName = item.tenantId && typeof item.tenantId === "object" ? item.tenantId.fullName : "N/A";
          const tenantPhone = item.tenantId && typeof item.tenantId === "object" ? item.tenantId.phone : "N/A";
          const formattedPhone = tenantPhone !== "N/A" ? formatPhone(tenantPhone) : "N/A";

          return (
            <AnimatedEntry delay={Math.min(index, 5) * 45}>
              <View style={styles.contractCard}>
                <View style={styles.cardTop}>
                  <View style={styles.roomIdentity}>
                    <View style={styles.iconTile}>
                      <Ionicons name="home-outline" size={20} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={styles.roomCode}>Phòng {roomCode}</Text>
                      <Text style={styles.tenantName}>{tenantName} · {formattedPhone}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
                      {getStatusText(item)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.money}>{formatCurrency(item.fixedRentPrice)}</Text>
                <Text style={styles.moneyCaption}>Tiền thuê mỗi tháng · Cọc {formatCurrency(item.fixedDeposit)}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.muted} />
                  <Text style={styles.contractDates}>
                    {item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN") : ""} – {item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN") : ""}
                  </Text>
                </View>
                {item.status === 4 ? (
                  <AppButton
                    icon="shield-checkmark-outline"
                    onPress={() => void handleApproveContract(item._id)}
                    style={styles.approveButton}
                  >
                    Duyệt hợp đồng
                  </AppButton>
                ) : null}
                {item.status === 5 ? (
                  <AppButton
                    variant="danger"
                    icon="log-out-outline"
                    onPress={() => void openCheckoutModal(item._id)}
                    style={styles.approveButton}
                  >
                    Duyệt trả phòng
                  </AppButton>
                ) : null}
              </View>
            </AnimatedEntry>
          );
        }}
      />

      {filter === "draft" && (
        <View style={styles.draftContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Hợp đồng đang soạn dở</Text>
          {drafts.length === 0 ? (
            <Text style={{ color: theme.muted, marginTop: 10 }}>Không có bản nháp nào.</Text>
          ) : (
            drafts.map((draft, idx) => (
              <AnimatedEntry key={draft.id} delay={idx * 50}>
                <View style={styles.contractCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.roomIdentity}>
                      <View style={styles.iconTile}>
                        <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                      </View>
                      <View>
                        <Text style={styles.roomCode}>Bản nháp #{draft.id}</Text>
                        <Text style={styles.tenantName}>Đã dừng ở Bước {draft.step}</Text>
                      </View>
                    </View>
                  </View>
                  <AppButton
                    icon="clipboard-outline"
                    onPress={() => {
                      setSelectedRoomId(draft.roomId);
                      setSelectedTenantId(draft.tenantId);
                      setStartDate(draft.startDate);
                      setEndDate(draft.endDate);
                      setFixedRent(draft.fixedRentPrice);
                      setFixedDeposit(draft.fixedDeposit);
                      setInitialElectricity(draft.initialElectricity);
                      setInitialWater(draft.initialWater);
                      setCurrentStep(draft.step);
                      setModalVisible(true);
                      draftContractService.deleteDraft(draft.id).then(loadData);
                    }}
                  >
                    Tiếp tục tạo
                  </AppButton>
                </View>
              </AnimatedEntry>
            ))
          )}
        </View>
      )}

      <CheckoutModal
        visible={checkoutModalVisible}
        onClose={() => setCheckoutModalVisible(false)}
        loading={checkoutLoading}
        preview={checkoutPreview}
        previewLoading={checkoutPreviewLoading}
        onConfirm={async (data) => {
          if (!data.electricityNew || !data.waterNew) {
            notification.error("Vui lòng nhập đủ chỉ số điện và nước cuối cùng.");
            return;
          }
          try {
            setCheckoutLoading(true);
            const settlement = await adminService.checkoutContract(checkoutContractId, {
              finalElectricity: Number(data.electricityNew),
              finalWater: Number(data.waterNew),
              damageAmount: Number(data.damage),
              note: data.note,
            });
            setCheckoutModalVisible(false);
            notification.success(
              settlement.amountDue > 0
                ? `Đã trả phòng. Khách cần thanh toán thêm ${formatCurrency(settlement.amountDue)}.`
                : `Đã trả phòng. Hoàn cọc ${formatCurrency(settlement.refundAmount)}.`
            );
            await loadData();
          } catch (error) {
            notification.error(error instanceof Error ? error.message : "Không thể duyệt trả phòng.");
          } finally {
            setCheckoutLoading(false);
          }
        }}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={submitting ? () => undefined : closeWizard}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View accessibilityViewIsModal style={styles.wizardContent}>
            <View style={styles.wizardHeader}>
              <View style={styles.wizardHeading}>
                <Text accessibilityRole="header" style={styles.wizardTitle}>Tạo hợp đồng mới</Text>
                <Text style={styles.wizardSubtitle}>Hoàn tất 4 bước để lập hợp đồng thuê phòng.</Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng trình tạo hợp đồng"
                accessibilityRole="button"
                disabled={submitting}
                onPress={closeWizard}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.muted} />
              </Pressable>
            </View>
            <View style={styles.stepperContainer}>
              <ProgressStepper steps={contractSteps} currentStep={currentStep - 1} />
            </View>

            <ScrollView
              style={styles.wizardBody}
              contentContainerStyle={styles.wizardBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 1 ? (
                <View style={styles.card}>
                  <SectionTitle icon="home-outline" title="Chọn phòng" subtitle="Chọn phòng còn trống để bắt đầu." theme={theme} />
                  {selectableRooms.length === 0 ? (
                    <Text style={styles.noVacantText}>Không có phòng nào có thể chọn.</Text>
                  ) : (
                    <View style={styles.selectionGrid}>
                      {selectableRooms.map((room) => {
                        const selected = selectedRoomId === room._id;
                        return (
                          <Pressable
                            key={room._id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => handleSelectRoom(room._id)}
                            style={[styles.selectionItem, selected && styles.selectionActive]}
                          >
                            <Ionicons name={selected ? "checkmark-circle" : "home-outline"} size={19} color={selected ? theme.primary : theme.muted} />
                            <Text style={[styles.selectionText, selected && styles.selectionTextActive]}>{room.roomCode}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              {currentStep === 2 ? (
                <>
                  <View style={styles.card}>
                    <SectionTitle icon="person-outline" title="Thông tin khách" subtitle="Chọn người thuê đã có trên hệ thống." theme={theme} />
                    {tenants.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có người thuê nào trên hệ thống.</Text>
                    ) : (
                      <View style={styles.selectionGrid}>
                        {tenants.map((tenant) => {
                          const selected = selectedTenantId === tenant._id;
                          return (
                            <Pressable
                              key={tenant._id}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              onPress={() => setSelectedTenantId(tenant._id)}
                              style={[styles.tenantItem, selected && styles.selectionActive]}
                            >
                              <Ionicons name={selected ? "checkmark-circle" : "person-circle-outline"} size={20} color={selected ? theme.primary : theme.muted} />
                              <View>
                                <Text style={[styles.selectionText, selected && styles.selectionTextActive]}>{tenant.fullName}</Text>
                                <Text style={styles.tenantPhone}>{formatPhone(tenant.phone)}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View style={styles.card}>
                    <SectionTitle icon="document-text-outline" title="Điều khoản thuê" theme={theme} />
                    <Field label="Giá thuê (VNĐ/tháng)" required styles={styles}>
                      <TextInput style={styles.input} value={fixedRent} onChangeText={(value) => setFixedRent(formatNumberInput(value))} keyboardType="numeric" placeholder="VD: 3.500.000" placeholderTextColor={theme.muted} />
                    </Field>
                    <Field label="Tiền cọc (VNĐ)" required styles={styles}>
                      <TextInput style={styles.input} value={fixedDeposit} onChangeText={(value) => setFixedDeposit(formatNumberInput(value))} keyboardType="numeric" placeholder="VD: 3.500.000" placeholderTextColor={theme.muted} />
                    </Field>
                    <View style={styles.inputRow}>
                      <View style={styles.inputColumn}>
                        <Field label="Ngày bắt đầu" required styles={styles}>
                          <View style={styles.dateInputContainer}>
                            <TextInput
                              style={styles.dateInput}
                              value={startDate}
                              onChangeText={(value) => {
                                const nextStartDate = formatDisplayDateInput(value);
                                setStartDate(nextStartDate);
                                setEndDate((currentEndDate) => resolveEndDateAfterStartChange(nextStartDate, endDateWasEdited, currentEndDate));
                              }}
                              keyboardType="number-pad"
                              maxLength={10}
                              placeholder="dd/mm/yyyy"
                              placeholderTextColor={theme.muted}
                            />
                            <Pressable accessibilityLabel="Mở lịch chọn ngày bắt đầu" hitSlop={8} onPress={() => setDatePickerField("startDate")} style={styles.datePickerButton}>
                              <Ionicons name="calendar-outline" size={19} color={theme.primary} />
                            </Pressable>
                          </View>
                        </Field>
                      </View>
                      <View style={styles.inputColumn}>
                        <Field label="Ngày kết thúc" required styles={styles}>
                          <View style={styles.dateInputContainer}>
                            <TextInput
                              style={styles.dateInput}
                              value={endDate}
                              onChangeText={(value) => {
                                setEndDateWasEdited(true);
                                setEndDate(formatDisplayDateInput(value));
                              }}
                              keyboardType="number-pad"
                              maxLength={10}
                              placeholder="dd/mm/yyyy"
                              placeholderTextColor={theme.muted}
                            />
                            <Pressable accessibilityLabel="Mở lịch chọn ngày kết thúc" hitSlop={8} onPress={() => setDatePickerField("endDate")} style={styles.datePickerButton}>
                              <Ionicons name="calendar-outline" size={19} color={theme.primary} />
                            </Pressable>
                          </View>
                        </Field>
                      </View>
                    </View>
                    {datePickerField ? (
                      <DateTimePicker
                        value={displayDateToLocalDate(datePickerField === "startDate" ? startDate : endDate) || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDatePickerChange}
                      />
                    ) : null}
                  </View>
                </>
              ) : null}

              {currentStep === 3 ? (
                <View style={styles.card}>
                  <SectionTitle icon="flash-outline" title="Điện & nước" subtitle="Thiết lập đơn giá, chỉ số đầu và dịch vụ đi kèm." theme={theme} />
                  {[
                    { key: "electricity", label: "Giá tiền điện", desc: "Tính theo số kWh", unit: "VNĐ/kWh", icon: "flash-outline" },
                    { key: "water", label: "Giá tiền nước", desc: "Tính theo khối/tháng", unit: "VNĐ/m³", icon: "water-outline" },
                    { key: "trash", label: "Rác", desc: "Phí thu gom", unit: "VNĐ/tháng", icon: "trash-outline" },
                    { key: "internet", label: "Internet", desc: "Wi-Fi", unit: "VNĐ/tháng", icon: "wifi-outline" },
                    { key: "management", label: "Phí quản lý", desc: "Vệ sinh chung", unit: "VNĐ/tháng", icon: "business-outline" },
                  ].map((definition) => {
                    const service = services[definition.key as keyof typeof services];
                    return (
                      <View key={definition.key} style={[styles.serviceItem, service.enabled && styles.serviceItemActive]}>
                        <View style={styles.serviceHeader}>
                          <View style={styles.serviceIdentity}>
                            <Ionicons name={definition.icon as IconName} size={20} color={service.enabled ? theme.primary : theme.muted} />
                            <View>
                              <Text style={styles.serviceLabel}>{definition.label}</Text>
                              <Text style={styles.serviceDesc}>{definition.desc}</Text>
                            </View>
                          </View>
                          <Switch
                            value={service.enabled}
                            onValueChange={(enabled) => setServices({ ...services, [definition.key]: { ...service, enabled } })}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={theme.surfaceElevated}
                          />
                        </View>
                        <View style={styles.serviceInputRow}>
                          <TextInput
                            style={[styles.input, !service.enabled && styles.inputDisabled, styles.serviceInput]}
                            value={service.price}
                            onChangeText={(value) => setServices({ ...services, [definition.key]: { ...service, price: formatNumberInput(value) } })}
                            editable={service.enabled}
                            keyboardType="numeric"
                          />
                          <Text style={styles.serviceUnit}>{definition.unit}</Text>
                        </View>
                        {definition.key === "electricity" ? (
                          <View style={styles.serviceInputRow}>
                            <TextInput style={[styles.input, styles.serviceInput]} value={initialElectricity} onChangeText={(value) => setInitialElectricity(formatNumberInput(value))} keyboardType="numeric" placeholder="Chỉ số điện đầu" placeholderTextColor={theme.muted} />
                            <Text style={styles.serviceUnit}>kWh đầu</Text>
                          </View>
                        ) : null}
                        {definition.key === "water" ? (
                          <View style={styles.serviceInputRow}>
                            <TextInput style={[styles.input, styles.serviceInput]} value={initialWater} onChangeText={(value) => setInitialWater(formatNumberInput(value))} keyboardType="numeric" placeholder="Chỉ số nước đầu" placeholderTextColor={theme.muted} />
                            <Text style={styles.serviceUnit}>m³ đầu</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {currentStep === 4 ? (
                <>
                  <View style={styles.previewCard}>
                    <SectionTitle icon="create-outline" title="Ký & xác nhận" subtitle="Kiểm tra thông tin trước khi tạo bản nháp." theme={theme} />
                    <PreviewRow label="Người thuê" value={tenants.find((item) => item._id === selectedTenantId)?.fullName || "Chưa chọn"} styles={styles} />
                    <PreviewRow label="Phòng" value={rooms.find((item) => item._id === selectedRoomId)?.roomCode || "Chưa chọn"} styles={styles} />
                    <PreviewRow label="Giá thuê" value={`${formatCurrency(fixedRent)}/tháng`} styles={styles} />
                    <PreviewRow label="Tiền cọc" value={formatCurrency(fixedDeposit)} styles={styles} />
                    <PreviewRow label="Thời hạn" value={`${startDate} → ${endDate}`} styles={styles} />
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmed }}
                    accessibilityLabel="Xác nhận thông tin hợp đồng chính xác"
                    onPress={() => setConfirmed(!confirmed)}
                    style={styles.confirmCheckbox}
                  >
                    <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                      {confirmed ? <Ionicons name="checkmark" size={15} color={theme.background} /> : null}
                    </View>
                    <View style={styles.confirmCopy}>
                      <Text style={styles.confirmTitle}>Tôi xác nhận thông tin chính xác</Text>
                      <Text style={styles.confirmDesc}>Hợp đồng nháp sẽ được tạo và chờ người thuê duyệt.</Text>
                    </View>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.wizardFooter}>
              <AppButton variant="ghost" icon="close-outline" disabled={submitting} onPress={closeWizard} style={styles.footerButton}>
                Hủy
              </AppButton>
              {currentStep > 1 ? (
                <AppButton variant="secondary" icon="chevron-back" disabled={submitting} onPress={() => setCurrentStep((step) => step - 1)} style={styles.footerButton}>
                  Quay lại
                </AppButton>
              ) : null}
              <AppButton
                icon={currentStep < 4 ? "arrow-forward-outline" : "document-text-outline"}
                iconPosition="right"
                loading={submitting}
                disabled={submitting || (currentStep === 4 && !confirmed)}
                onPress={() => {
                  if (currentStep < 4) setCurrentStep((step) => step + 1);
                  else void handleCreateContract();
                }}
                style={styles.primaryFooterButton}
              >
                {currentStep < 4 ? "Tiếp tục" : "Tạo hợp đồng"}
              </AppButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SectionTitle({ icon, title, subtitle, theme }: { icon: IconName; title: string; subtitle?: string; theme: any }) {
  return (
    <View style={base.sectionTitleRow}>
      <View style={[base.sectionIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={base.sectionCopy}>
        <Text style={[base.sectionTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[base.sectionSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function Field({ label, required, children, styles }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function PreviewRow({ label, value, styles }: { label: string; value: string; styles: any }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

const base = StyleSheet.create({
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  sectionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  sectionSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: theme.background },
    loadingText: { color: theme.muted, fontSize: 13, fontWeight: "700" },
    listContent: { padding: 18, paddingBottom: 36, gap: 12 },
    headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 22 },
    title: { color: theme.text, fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
    subtitle: { color: theme.muted, fontSize: 12, marginTop: 3 },
    addButton: { minHeight: 46, paddingHorizontal: 14 },
    filterContainer: { flexDirection: "row", gap: 8, marginVertical: 16 },
    filterButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface },
    filterActive: { backgroundColor: theme.primarySoft },
    filterText: { color: theme.muted, fontSize: 12, fontWeight: "800" },
    filterTextActive: { color: theme.primary },
    filteredEmpty: { color: theme.muted, textAlign: "center", paddingVertical: 42 },
    contractCard: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      padding: 18,
      marginBottom: 12,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 4,
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
    roomIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    iconTile: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" },
    roomCode: { color: theme.text, fontSize: 16, fontWeight: "900" },
    tenantName: { color: theme.muted, fontSize: 12, marginTop: 3 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    statusText: { fontSize: 10, fontWeight: "900" },
    money: { color: theme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 18 },
    moneyCaption: { color: theme.muted, fontSize: 13 },
    draftContainer: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 16 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
    contractDates: { color: theme.muted, fontSize: 12, fontWeight: "700" },
    approveButton: { marginTop: 16 },
    modalOverlay: { flex: 1, paddingTop: Platform.OS === "ios" ? 45 : 18, backgroundColor: theme.overlay },
    wizardContent: { flex: 1, backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
    wizardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 20, backgroundColor: theme.surface },
    wizardHeading: { flex: 1, paddingRight: 12 },
    wizardTitle: { color: theme.text, fontSize: 21, fontWeight: "900" },
    wizardSubtitle: { color: theme.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
    closeButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    stepperContainer: { paddingHorizontal: 12, paddingVertical: 18, backgroundColor: theme.surface },
    wizardBody: { flex: 1 },
    wizardBodyContent: { padding: 18, paddingBottom: 32 },
    card: { backgroundColor: theme.surface, borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: theme.text, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 7 }, shadowRadius: 16, elevation: 3 },
    selectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    selectionItem: { minWidth: 104, minHeight: 48, borderRadius: 16, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.surfaceElevated },
    tenantItem: { minWidth: "47%", flexGrow: 1, minHeight: 58, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.surfaceElevated },
    selectionActive: { backgroundColor: theme.primarySoft },
    selectionText: { color: theme.text, fontSize: 13, fontWeight: "800" },
    selectionTextActive: { color: theme.primary },
    tenantPhone: { color: theme.muted, fontSize: 11, marginTop: 2 },
    noVacantText: { color: theme.danger, fontSize: 13, fontWeight: "700" },
    field: { marginTop: 12 },
    label: { color: theme.muted, fontSize: 12, fontWeight: "800", marginBottom: 7 },
    required: { color: theme.danger },
    input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, backgroundColor: theme.surfaceElevated, color: theme.text, fontSize: 14 },
    inputRow: { flexDirection: "row", gap: 10 },
    inputColumn: { flex: 1 },
    dateInputContainer: { minHeight: 48, flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: theme.surfaceElevated },
    dateInput: { flex: 1, minHeight: 48, paddingLeft: 13, color: theme.text, fontSize: 13, fontVariant: ["tabular-nums"] },
    datePickerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    serviceItem: { borderRadius: 18, padding: 14, marginBottom: 10, backgroundColor: theme.surfaceElevated },
    serviceItemActive: { backgroundColor: theme.primarySoft },
    serviceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    serviceIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    serviceLabel: { color: theme.text, fontSize: 14, fontWeight: "900" },
    serviceDesc: { color: theme.muted, fontSize: 11, marginTop: 2 },
    serviceInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    serviceInput: { flex: 1, minHeight: 42 },
    inputDisabled: { opacity: 0.5 },
    serviceUnit: { width: 78, color: theme.muted, fontSize: 11 },
    previewCard: { backgroundColor: theme.primarySoft, borderRadius: 22, padding: 18, marginBottom: 14 },
    previewRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9 },
    previewLabel: { color: theme.muted, fontSize: 12 },
    previewValue: { flex: 1, color: theme.text, fontSize: 13, fontWeight: "800", textAlign: "right" },
    confirmCheckbox: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 20, backgroundColor: theme.surface },
    checkbox: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: theme.surfaceElevated },
    checkboxChecked: { backgroundColor: theme.primary },
    confirmCopy: { flex: 1 },
    confirmTitle: { color: theme.text, fontSize: 14, fontWeight: "900" },
    confirmDesc: { color: theme.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
    wizardFooter: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingBottom: Platform.OS === "ios" ? 24 : 12, backgroundColor: theme.surface, shadowColor: theme.text, shadowOpacity: 0.08, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 8 },
    footerButton: { minHeight: 46, paddingHorizontal: 10 },
    primaryFooterButton: { flex: 1, minHeight: 46, paddingHorizontal: 10 },
  });
}
