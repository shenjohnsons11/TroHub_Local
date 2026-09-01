import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
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
import { ContentSkeleton } from "../components/ui/content-skeleton";
import AppLoadingScreen from "../components/AppLoadingScreen";
import ProgressStepper from "../components/ui/ProgressStepper";
import { draftContractService, DraftContract } from "../services/draftContractService";
import CheckoutModal from "../components/modals/CheckoutModal";
import ContractViewerModal from "../components/ContractViewerModal";
import DraftContractViewerModal from "../components/DraftContractViewerModal";
import { userService } from "../services/userService";
import {
  formatCurrency,
  formatMeterReading,
  formatNumberInput,
  parseMeterReading,
  formatPhone,
  unformatNumber,
} from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

type Props = { params?: any };
type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function AdminContractsScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const { t, language } = useTranslation();
  const notification = useNotification();
  const initialDates = defaultContractDates();
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reserved" | "active" | "checkout" | "draft">("all");
  const [drafts, setDrafts] = useState<DraftContract[]>([]);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutContractId, setCheckoutContractId] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPreviewLoading, setCheckoutPreviewLoading] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutPreview | null>(null);
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [handoverContractId, setHandoverContractId] = useState("");
  const [handoverElectricity, setHandoverElectricity] = useState("");
  const [handoverWater, setHandoverWater] = useState("");
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewerContractId, setViewerContractId] = useState<string | null>(null);
  const [propertyAddress, setPropertyAddress] = useState("");
  const [draftPreviewVisible, setDraftPreviewVisible] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSession = useRef(0);
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
      const [contractsData, roomsData, tenantsData, userProfile] = await Promise.all([
        adminService.getContracts(),
        adminService.getRooms(),
        adminService.getTenants(),
        userService.getProfile().catch(() => null),
      ]);
      setContracts(contractsData);
      setRooms(roomsData);
      setTenants(tenantsData);
      setDrafts(await draftContractService.getDrafts());
      if (userProfile?.propertyAddress) {
        setPropertyAddress((prev) => prev || userProfile.propertyAddress || "");
      }
    } catch (error) {
      console.log("Lỗi tải dữ liệu hợp đồng:", error);
      notification.error(t("contractsMobile.loadFailed"));
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
    if (!room) return notification.warning(t("contractsMobile.missingRoom", { roomCode: action.roomCode }));
    const tenant = tenants.find((item) => item.fullName?.trim().toLowerCase() === action.tenantName?.trim().toLowerCase());
    setModalVisible(true);
    setCurrentStep(1);
    handleSelectRoom(room._id);
    setFixedRent(formatNumberInput(action.rentPrice));
    const [year, month, day] = action.startDate.split("-");
    if (year && month && day) setStartDate(`${day}/${month}/${year}`);
    if (tenant) setSelectedTenantId(tenant._id);
    else notification.info(t("contractsMobile.missingTenant", { name: action.tenantName }));
  }, [params?.aiAction, rooms, tenants]);

  const closeWizard = () => {
    if (selectedRoomId || selectedTenantId) {
      void draftContractService.saveDraft({
        id: editingDraftId,
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate,
        endDate,
        fixedRentPrice: fixedRent,
        fixedDeposit,
        initialElectricity,
        initialWater,
        electricityPrice: services.electricity.price,
        waterPrice: services.water.price,
        services,
        step: currentStep,
      }).then(async (savedId) => {
        setEditingDraftId(savedId || editingDraftId);
        setDrafts(await draftContractService.getDrafts());
      });
    }
    setModalVisible(false);
    setSelectedRoomId("");
    setSelectedTenantId("");
    setEditingDraftId(undefined);
    setCurrentStep(1);
    setConfirmed(false);
  };

  const getPendingContractForRoom = (roomId: string) => {
    return contracts.find((c) => {
      const cRoomId = typeof c.roomId === "object" ? c.roomId?._id : c.roomId;
      return cRoomId === roomId && (c.status === 0 || c.status === 4 || c.status === 5);
    });
  };

  const getPendingContractForTenant = (tenantId: string) => {
    return contracts.find((c) => {
      const cTenantId = typeof c.tenantId === "object" ? c.tenantId?._id : c.tenantId;
      return cTenantId === tenantId && (c.status === 0 || c.status === 4 || c.status === 5);
    });
  };

  const handleSelectRoom = (roomId: string) => {
    const pendingContract = getPendingContractForRoom(roomId);
    if (pendingContract) {
      const statusText = pendingContract.status === 0 || pendingContract.status === 5 ? "đang chờ ký" : "đang chờ bàn giao";
      notification.warning(
        `Phòng này đang có hợp đồng ${statusText}. Vui lòng kiểm tra lại trước khi tạo mới.`,
        { title: "Phòng đang có hợp đồng xử lý" }
      );
    }
    setSelectedRoomId(roomId);
    const room = rooms.find((item) => item._id === roomId);
    if (room) {
      setFixedRent(formatNumberInput(room.defaultRentPrice));
      setFixedDeposit(formatNumberInput(room.defaultDeposit));
      setInitialElectricity(formatMeterReading(room.lastElectricityReading ?? room.draftElectricity));
      setInitialWater(formatMeterReading(room.lastWaterReading ?? room.draftWater));
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    const pendingContract = getPendingContractForTenant(tenantId);
    if (pendingContract) {
      const statusText = pendingContract.status === 0 || pendingContract.status === 5 ? "đang chờ ký" : "đang chờ bàn giao";
      notification.warning(
        `Khách thuê này đang có hợp đồng ${statusText}. Vui lòng kiểm tra lại.`,
        { title: "Khách đang có hợp đồng xử lý" }
      );
    }
    setSelectedTenantId(tenantId);
  };

  const handleCreateContract = async () => {
    if (!selectedRoomId || !selectedTenantId || !fixedRent.trim() || !fixedDeposit.trim() || !startDate.trim() || !endDate.trim()) {
      notification.error(t("contractsMobile.required"), { title: t("common.error") });
      return;
    }

    const dateErrors = validateContractDateRange(startDate, endDate);
    const startDateIso = parseDisplayToIso(startDate);
    const endDateIso = parseDisplayToIso(endDate);
    if (Object.keys(dateErrors).length || !startDateIso || !endDateIso) {
      notification.error(
        dateErrors.startDate || dateErrors.endDate || t("contractsMobile.invalidDate"),
        { title: t("contractsMobile.invalidDateTitle") },
      );
      setCurrentStep(2);
      return;
    }
    const meterTerms = {
      electricityPrice: unformatNumber(services.electricity.price),
      waterPrice: unformatNumber(services.water.price),
      initialElectricity: parseMeterReading(initialElectricity) ?? 0,
      initialWater: parseMeterReading(initialWater) ?? 0,
    };
    if (Object.values(meterTerms).some((value) => !Number.isFinite(value) || value < 0)) {
      notification.error(t("contractsMobile.invalidMeter"), { title: t("common.error") });
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    const closeLoading = notification.loading(t("contractsMobile.creating"));
    try {
      await adminService.createContract({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate: startDateIso,
        endDate: endDateIso,
        fixedRentPrice: unformatNumber(fixedRent),
        fixedDeposit: unformatNumber(fixedDeposit),
        propertyAddress: propertyAddress.trim(),
        ...meterTerms,
      });
      notification.success(t("contractsMobile.created"));
      if (editingDraftId) await draftContractService.deleteDraft(editingDraftId);
      setDrafts(await draftContractService.getDrafts());
      
      setModalVisible(false);
      setSelectedRoomId("");
      setSelectedTenantId("");
      setEditingDraftId(undefined);
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
      notification.error(error instanceof Error ? error.message : t("contractsMobile.createFailed"));
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

  const openHandoverModal = (contract: AdminContract) => {
    const roomId = typeof contract.roomId === "object" ? contract.roomId._id : contract.roomId;
    const room = rooms.find((item) => item._id === roomId);
    setHandoverContractId(contract._id);
    setHandoverElectricity(formatMeterReading(contract.initialElectricity ?? room?.lastElectricityReading));
    setHandoverWater(formatMeterReading(contract.initialWater ?? room?.lastWaterReading));
    setHandoverDate(new Date().toISOString().slice(0, 10));
    setHandoverModalVisible(true);
  };

  const handleHandover = async () => {
    const electricity = parseMeterReading(handoverElectricity);
    const water = parseMeterReading(handoverWater);
    if (electricity === null || water === null || !handoverDate) {
      notification.error(t("contractsMobile.handoverRequired"));
      return;
    }
    try {
      setLoading(true);
      await adminService.handoverContract(handoverContractId, {
        initialElectricity: electricity,
        initialWater: water,
        handoverDate,
      });
      setHandoverModalVisible(false);
      notification.success(t("contractsMobile.handoverSuccess"));
      await loadData();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("contractsMobile.handoverFailed"));
    } finally {
      setLoading(false);
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
      notification.error(error instanceof Error ? error.message : t("contractsMobile.checkoutLoadFailed"));
    } finally {
      setCheckoutPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && params?.contractId && params?.action === "checkout") {
      void openCheckoutModal(params.contractId);
    }
  }, [loading, params?.contractId, params?.action]);

  useEffect(() => {
    if (!modalVisible || submitting || (!selectedRoomId && !selectedTenantId && !fixedRent && !fixedDeposit)) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const session = draftSession.current;
    autoSaveTimer.current = setTimeout(() => {
      void draftContractService.saveDraft({
        id: editingDraftId,
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate,
        endDate,
        fixedRentPrice: fixedRent,
        fixedDeposit,
        initialElectricity,
        initialWater,
        electricityPrice: services.electricity.price,
        waterPrice: services.water.price,
        services,
        step: currentStep,
      }).then(async (savedId) => {
        if (savedId && session === draftSession.current) setEditingDraftId(savedId);
        setDrafts(await draftContractService.getDrafts());
      });
    }, 500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [modalVisible, submitting, selectedRoomId, selectedTenantId, startDate, endDate, fixedRent, fixedDeposit, initialElectricity, initialWater, services, currentStep, editingDraftId]);

  const getStatusText = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) {
      return t("contractsMobile.preMoveIn");
    }
    switch (contract.status) {
      case 0: return t("contractsMobile.draft"); case 1: return t("contractsMobile.active"); case 2: return t("contracts.status.expired"); case 3: return t("contracts.status.terminated"); case 4: return t("contracts.reserved"); case 5: return t("contractsMobile.pendingTenant"); default: return t("contractsMobile.draft");
    }
  };
  const getStatusColor = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) return theme.primary; // Xanh dương
    if (contract.status === 1) return theme.positive; // Xanh lá
    if (contract.status === 3) return theme.danger;
    if (contract.status === 4) return theme.primary;
    if (contract.status === 0 || contract.status === 5) return theme.warningForeground;
    return theme.muted;
  };
  const getStatusBg = (contract: AdminContract) => {
    if (contract.status === 1 && new Date(contract.startDate).getTime() > Date.now()) return theme.primarySoft;
    if (contract.status === 1) return theme.positiveSoft;
    if (contract.status === 4) return theme.primarySoft;
    if (contract.status === 0 || contract.status === 5) return theme.warningSoft;
    return theme.surfaceElevated;
  };

  const filteredContracts = contracts.filter((contract) => {
    if (params?.contractId) return contract._id === params.contractId;
    if (filter === "pending") return contract.status === 0 || contract.status === 5;
    if (filter === "reserved") return contract.status === 4;
    if (filter === "active") return contract.status === 1;
    if (filter === "checkout") return Boolean(contract.checkoutRequestedAt) || contract.status === 2;
    return filter === "all";
  });
  const selectableRooms = rooms.filter((room) => room.status === 0 || room.status === 1);
  const styles = createStyles(theme);

  if (loading) {
    return <AppLoadingScreen />;
  }

  const filterButton = (value: typeof filter, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: filter === value }}
      onPress={() => setFilter(value)}
      style={[styles.filterButton, filter === value && styles.filterActive]}
    >
      <AppText style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</AppText>
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
                label={t("contractsMobile.heroLabel")}
                value={t("contractsMobile.heroValue", { count: contracts.length })}
                detail={t("contractsMobile.heroDetail", { count: contracts.filter((item) => item.status === 1).length })}
              />
            </AnimatedEntry>
            <View style={styles.headingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={styles.title}>{t("contractsMobile.title")}</AppText>
                <AppText style={styles.subtitle}>{t("contractsMobile.subtitle")}</AppText>
              </View>
              <AppButton icon="add-circle-outline" onPress={() => setModalVisible(true)} style={styles.addButton}>
                {t("contractsMobile.create")}
              </AppButton>
            </View>
            <View style={styles.filterContainer}>
              {filterButton("all", t("common.all"))}
              {filterButton("draft", t("contractsMobile.draft"))}
              {filterButton("pending", t("contractsMobile.pending"))}
              {filterButton("reserved", t("contracts.reserved"))}
              {filterButton("active", t("contractsMobile.activeFilter"))}
            </View>
          </View>
        }
        ListEmptyComponent={filter === "draft" ? null : contracts.length === 0 ? (
            <IllustratedEmptyState
              kind="contract"
              title={t("contractsMobile.empty")}
              description={t("contractsMobile.emptyDescription")}
              actionLabel={t("contractsMobile.create")}
              actionIcon="add-circle-outline"
              onAction={() => setModalVisible(true)}
            />
          ) : (
            <AppText style={styles.filteredEmpty}>{t("contractsMobile.noMatch")}</AppText>
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
                      <AppText style={styles.roomCode}>{t("contractsMobile.room", { roomCode })}</AppText>
                      <AppText style={styles.tenantName}>{tenantName} · {formattedPhone}</AppText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      (item.status === 0 || item.status === 5) && styles.pendingBadge,
                      { backgroundColor: getStatusBg(item) },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.statusText,
                        (item.status === 0 || item.status === 5) && styles.pendingText,
                        { color: getStatusColor(item) },
                      ]}
                    >
                      {getStatusText(item)}
                    </AppText>
                  </View>
                </View>
                <AppText style={styles.money}>{formatCurrency(item.fixedRentPrice)}</AppText>
                <AppText style={styles.moneyCaption}>{t("contractsMobile.rentDeposit", { deposit: formatCurrency(item.fixedDeposit) })}</AppText>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.muted} />
                <AppText style={styles.contractDates}>
                    {item.startDate ? new Date(item.startDate).toLocaleDateString(language === "en" ? "en-US" : "vi-VN") : ""} – {item.endDate ? new Date(item.endDate).toLocaleDateString(language === "en" ? "en-US" : "vi-VN") : ""}
                  </AppText>
                </View>
                <AppButton
                  variant="outline"
                  icon="eye-outline"
                  onPress={() => setViewerContractId(item._id)}
                  style={styles.approveButton}
                >
                  {t("contractsMobile.viewContract")}
                </AppButton>
                {item.status === 4 ? (
                  <AppButton
                    icon="key-outline"
                    onPress={() => openHandoverModal(item)}
                    style={styles.approveButton}
                  >
                    {t("contracts.handover")}
                  </AppButton>
                ) : null}
                {item.checkoutRequestedAt ? (
                  <AppButton
                    variant="danger"
                    icon="log-out-outline"
                    onPress={() => void openCheckoutModal(item._id)}
                    style={styles.approveButton}
                  >
                    {t("contractsMobile.approveCheckout")}
                  </AppButton>
                ) : null}
              </View>
            </AnimatedEntry>
          );
        }}
      />

      {filter === "draft" && (
        <View style={styles.draftContainer}>
          <AppText style={[styles.sectionTitle, { color: theme.text }]}>{t("contractsMobile.drafts")}</AppText>
          {drafts.length === 0 ? (
            <AppText style={{ color: theme.muted, marginTop: 10 }}>{t("contractsMobile.noDrafts")}</AppText>
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
                        <AppText style={styles.roomCode}>{t("contractsMobile.draftLabel", { id: draft.id })}</AppText>
                        <AppText style={styles.tenantName}>{t("contractsMobile.draftStep", { step: draft.step })}</AppText>
                      </View>
                    </View>
                  </View>
                  <AppButton
                    variant="outline"
                    icon="clipboard-outline"
                    onPress={() => {
                      setEditingDraftId(draft.id);
                      setSelectedRoomId(draft.roomId);
                      setSelectedTenantId(draft.tenantId);
                      setStartDate(draft.startDate);
                      setEndDate(draft.endDate);
                      setFixedRent(draft.fixedRentPrice);
                      setFixedDeposit(draft.fixedDeposit);
                      setInitialElectricity(draft.initialElectricity);
                      setInitialWater(draft.initialWater);
                      if (draft.services) setServices(draft.services);
                      setCurrentStep(draft.step);
                      setModalVisible(true);
                    }}
                  >
                    {t("contractsMobile.resume")}
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    icon="trash-outline"
                    onPress={() => void draftContractService.deleteDraft(draft.id).then(async () => setDrafts(await draftContractService.getDrafts()))}
                  >
                    {t("contractsMobile.deleteDraft")}
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
            notification.error(t("contractsMobile.finalReadings"));
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
                ? t("contractsMobile.extraDue", { amount: formatCurrency(settlement.amountDue) })
                : t("contractsMobile.refund", { amount: formatCurrency(settlement.refundAmount) })
            );
            await loadData();
          } catch (error) {
            notification.error(error instanceof Error ? error.message : t("contractsMobile.checkoutFailed"));
          } finally {
            setCheckoutLoading(false);
          }
        }}
      />

      <ContractViewerModal
        visible={Boolean(viewerContractId)}
        contractId={viewerContractId}
        onClose={() => setViewerContractId(null)}
      />

      <Modal visible={handoverModalVisible} transparent animationType="slide" onRequestClose={() => setHandoverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.handoverContent}>
            <AppText accessibilityRole="header" style={styles.wizardTitle}>{t("contracts.handover")}</AppText>
            <AppText style={styles.wizardSubtitle}>{t("contractsMobile.handoverHint")}</AppText>
            <AppTextInput value={handoverDate} onChangeText={setHandoverDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} style={styles.input} />
            <AppTextInput value={handoverElectricity} onChangeText={setHandoverElectricity} keyboardType="decimal-pad" placeholder={t("contractsMobile.initialElectricity")} placeholderTextColor={theme.muted} style={styles.input} />
            <AppTextInput value={handoverWater} onChangeText={setHandoverWater} keyboardType="decimal-pad" placeholder={t("contractsMobile.initialWater")} placeholderTextColor={theme.muted} style={styles.input} />
            <View style={styles.handoverActions}>
              <AppButton variant="ghost" onPress={() => setHandoverModalVisible(false)}>{t("common.cancel")}</AppButton>
              <AppButton icon="checkmark-circle-outline" onPress={() => void handleHandover()}>{t("common.confirm")}</AppButton>
            </View>
          </View>
        </View>
      </Modal>

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
                <AppText accessibilityRole="header" style={styles.wizardTitle}>{t("contractsMobile.newTitle")}</AppText>
                <AppText style={styles.wizardSubtitle}>{t("contractsMobile.newSubtitle")}</AppText>
              </View>
              <Pressable
                accessibilityLabel={t("contractsMobile.closeWizard")}
                accessibilityRole="button"
                disabled={submitting}
                onPress={closeWizard}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.muted} />
              </Pressable>
            </View>
            <View style={styles.stepperContainer}>
              <ProgressStepper steps={[{ label: t("contractsMobile.selectRoom"), icon: "home-outline" }, { label: t("contractsMobile.tenantInfo"), icon: "person-outline" }, { label: t("contractsMobile.utilities"), icon: "flash-outline" }, { label: t("contractsMobile.sign"), icon: "create-outline" }]} currentStep={currentStep - 1} />
            </View>

            <ScrollView
              style={styles.wizardBody}
              contentContainerStyle={styles.wizardBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 1 ? (
                <View style={styles.card}>
                  <SectionTitle icon="home-outline" title={t("contractsMobile.selectRoom")} subtitle={t("contractsMobile.selectRoomSubtitle")} theme={theme} />
                  {selectableRooms.length === 0 ? (
                    <AppText style={styles.noVacantText}>{t("contractsMobile.noRooms")}</AppText>
                  ) : (
                    <View style={styles.selectionGrid}>
                      {selectableRooms.map((room) => {
                        const selected = selectedRoomId === room._id;
                        const roomPending = getPendingContractForRoom(room._id);
                        return (
                          <Pressable
                            key={room._id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => handleSelectRoom(room._id)}
                            style={[
                              styles.selectionItem,
                              selected && styles.selectionActive,
                              Boolean(roomPending) && { borderColor: theme.warning, borderWidth: 1 }
                            ]}
                          >
                            <Ionicons name={selected ? "checkmark-circle" : (roomPending ? "alert-circle-outline" : "home-outline")} size={19} color={selected ? theme.primary : (roomPending ? theme.warning : theme.muted)} />
                            <View>
                              <AppText style={[styles.selectionText, selected && styles.selectionTextActive]}>{room.roomCode}</AppText>
                              {roomPending ? (
                                <AppText style={{ fontSize: 10, color: theme.warning, fontWeight: "600" }}>
                                  {roomPending.status === 0 || roomPending.status === 5 ? "Chờ ký" : "Chờ bàn giao"}
                                </AppText>
                              ) : null}
                            </View>
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
                    <SectionTitle icon="person-outline" title={t("contractsMobile.tenantInfo")} subtitle={t("contractsMobile.tenantSubtitle")} theme={theme} />
                    {tenants.length === 0 ? (
                      <AppText style={styles.noVacantText}>{t("contractsMobile.noTenants")}</AppText>
                    ) : (
                      <View style={styles.selectionGrid}>
                        {tenants.map((tenant) => {
                          const selected = selectedTenantId === tenant._id;
                          const tenantPending = getPendingContractForTenant(tenant._id);
                          return (
                            <Pressable
                              key={tenant._id}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              onPress={() => handleSelectTenant(tenant._id)}
                              style={[
                                styles.tenantItem,
                                selected && styles.selectionActive,
                                Boolean(tenantPending) && { borderColor: theme.warning, borderWidth: 1 }
                              ]}
                            >
                              <Ionicons name={selected ? "checkmark-circle" : (tenantPending ? "alert-circle-outline" : "person-circle-outline")} size={20} color={selected ? theme.primary : (tenantPending ? theme.warning : theme.muted)} />
                              <View>
                                <AppText style={[styles.selectionText, selected && styles.selectionTextActive]}>{tenant.fullName}</AppText>
                                <AppText style={styles.tenantPhone}>{formatPhone(tenant.phone)}</AppText>
                                {tenantPending ? (
                                  <AppText style={{ fontSize: 10, color: theme.warning, fontWeight: "600" }}>
                                    {tenantPending.status === 0 || tenantPending.status === 5 ? "Đang có HĐ chờ ký" : "Đang có HĐ chờ bàn giao"}
                                  </AppText>
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View style={styles.card}>
                    <SectionTitle icon="document-text-outline" title={t("contractsMobile.terms")} theme={theme} />
                    <Field label={t("contractsMobile.rent")} required styles={styles}>
                      <AppTextInput style={styles.input} value={fixedRent} onChangeText={(value) => setFixedRent(formatNumberInput(value))} keyboardType="numeric" placeholder="VD: 3.500.000" placeholderTextColor={theme.muted} />
                    </Field>
                    <Field label={t("contractsMobile.deposit")} required styles={styles}>
                      <AppTextInput style={styles.input} value={fixedDeposit} onChangeText={(value) => setFixedDeposit(formatNumberInput(value))} keyboardType="numeric" placeholder="VD: 3.500.000" placeholderTextColor={theme.muted} />
                    </Field>
                    <Field label="Địa chỉ nhà trọ / Cơ sở" styles={styles}>
                      <AppTextInput style={styles.input} value={propertyAddress} onChangeText={setPropertyAddress} placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM" placeholderTextColor={theme.muted} />
                    </Field>
                    <View style={styles.inputRow}>
                      <View style={styles.inputColumn}>
                        <Field label={t("contractsMobile.startDate")} required styles={styles}>
                          <View style={styles.dateInputContainer}>
                            <AppTextInput
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
                            <Pressable accessibilityLabel={t("contractsMobile.openStartDate")} hitSlop={8} onPress={() => setDatePickerField("startDate")} style={styles.datePickerButton}>
                              <Ionicons name="calendar-outline" size={19} color={theme.primary} />
                            </Pressable>
                          </View>
                        </Field>
                      </View>
                      <View style={styles.inputColumn}>
                        <Field label={t("contractsMobile.endDate")} required styles={styles}>
                          <View style={styles.dateInputContainer}>
                            <AppTextInput
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
                            <Pressable accessibilityLabel={t("contractsMobile.openEndDate")} hitSlop={8} onPress={() => setDatePickerField("endDate")} style={styles.datePickerButton}>
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
                  <SectionTitle icon="flash-outline" title={t("contractsMobile.utilities")} subtitle={t("contractsMobile.utilitiesSubtitle")} theme={theme} />
                  {[
                    { key: "electricity", label: t("contractsMobile.electricity"), desc: t("contractsMobile.electricityDesc"), unit: "VNĐ/kWh", icon: "flash-outline" },
                    { key: "water", label: t("contractsMobile.water"), desc: t("contractsMobile.waterDesc"), unit: "VNĐ/m³", icon: "water-outline" },
                    { key: "trash", label: t("contractsMobile.trash"), desc: t("contractsMobile.trashDesc"), unit: "VNĐ/tháng", icon: "trash-outline" },
                    { key: "internet", label: t("contractsMobile.internet"), desc: t("contractsMobile.internetDesc"), unit: "VNĐ/tháng", icon: "wifi-outline" },
                    { key: "management", label: t("contractsMobile.management"), desc: t("contractsMobile.managementDesc"), unit: "VNĐ/tháng", icon: "business-outline" },
                  ].map((definition) => {
                    const service = services[definition.key as keyof typeof services];
                    return (
                      <View key={definition.key} style={[styles.serviceItem, service.enabled && styles.serviceItemActive]}>
                        <View style={styles.serviceHeader}>
                          <View style={styles.serviceIdentity}>
                            <Ionicons name={definition.icon as IconName} size={20} color={service.enabled ? theme.primary : theme.muted} />
                            <View>
                              <AppText style={styles.serviceLabel}>{definition.label}</AppText>
                              <AppText style={styles.serviceDesc}>{definition.desc}</AppText>
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
                          <AppTextInput
                            style={[styles.input, !service.enabled && styles.inputDisabled, styles.serviceInput]}
                            value={service.price}
                            onChangeText={(value) => setServices({ ...services, [definition.key]: { ...service, price: formatNumberInput(value) } })}
                            editable={service.enabled}
                            keyboardType="numeric"
                          />
                          <AppText style={styles.serviceUnit}>{definition.unit}</AppText>
                        </View>
                        {definition.key === "electricity" ? (
                          <View style={styles.serviceInputRow}>
                            <AppTextInput style={[styles.input, styles.serviceInput]} value={initialElectricity} onChangeText={(value) => setInitialElectricity(parseMeterReading(value) === null ? value : formatMeterReading(value))} keyboardType="decimal-pad" placeholder={t("contractsMobile.initialElectricity")} placeholderTextColor={theme.muted} />
                            <AppText style={styles.serviceUnit}>kWh</AppText>
                          </View>
                        ) : null}
                        {definition.key === "water" ? (
                          <View style={styles.serviceInputRow}>
                            <AppTextInput style={[styles.input, styles.serviceInput]} value={initialWater} onChangeText={(value) => setInitialWater(parseMeterReading(value) === null ? value : formatMeterReading(value))} keyboardType="decimal-pad" placeholder={t("contractsMobile.initialWater")} placeholderTextColor={theme.muted} />
                            <AppText style={styles.serviceUnit}>m³</AppText>
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
                    <SectionTitle icon="create-outline" title={t("contractsMobile.sign")} subtitle={t("contractsMobile.signSubtitle")} theme={theme} />
                    <PreviewRow label={t("contractsMobile.tenant")} value={tenants.find((item) => item._id === selectedTenantId)?.fullName || t("contractsMobile.notSelected")} styles={styles} />
                    <PreviewRow label={t("contractsMobile.room", { roomCode: "" }).trim()} value={rooms.find((item) => item._id === selectedRoomId)?.roomCode || t("contractsMobile.notSelected")} styles={styles} />
                    <PreviewRow label={t("contractsMobile.rent")} value={`${formatCurrency(fixedRent)}/${t("mobile.rooms.month")}`} styles={styles} />
                    <PreviewRow label={t("contractsMobile.deposit")} value={formatCurrency(fixedDeposit)} styles={styles} />
                    <PreviewRow label={t("contractsMobile.term")} value={`${startDate} → ${endDate}`} styles={styles} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDraftPreviewVisible(true)}
                    style={[styles.fullPreviewButton, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
                  >
                    <Ionicons name="document-text" size={24} color={theme.primary} />
                    <View style={styles.fullPreviewCopy}>
                      <AppText style={[styles.fullPreviewTitle, { color: theme.primary }]}>Xem trước toàn văn hợp đồng</AppText>
                      <AppText style={[styles.fullPreviewSubtitle, { color: theme.muted }]}>Kiểm tra văn bản pháp lý & chữ ký Bên A trước khi tạo</AppText>
                    </View>
                    <Ionicons name="eye-outline" size={20} color={theme.primary} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmed }}
                    accessibilityLabel={t("contractsMobile.confirmInfo")}
                    onPress={() => setConfirmed(!confirmed)}
                    style={styles.confirmCheckbox}
                  >
                    <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                      {confirmed ? <Ionicons name="checkmark" size={15} color={theme.background} /> : null}
                    </View>
                    <View style={styles.confirmCopy}>
                      <AppText style={styles.confirmTitle}>{t("contractsMobile.confirmTitle")}</AppText>
                      <AppText style={styles.confirmDesc}>{t("contractsMobile.confirmDesc")}</AppText>
                    </View>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.wizardFooter}>
              <AppButton variant="ghost" icon="close-outline" disabled={submitting} onPress={closeWizard} style={styles.footerButton}>
                {t("common.cancel")}
              </AppButton>
              {currentStep > 1 ? (
                <AppButton variant="secondary" icon="chevron-back" disabled={submitting} onPress={() => setCurrentStep((step) => step - 1)} style={styles.footerButton}>
                  {t("contractsMobile.back")}
                </AppButton>
              ) : null}
              <AppButton
                icon={currentStep < 4 ? "arrow-forward-outline" : "document-text-outline"}
                iconPosition="right"
                loading={submitting}
                disabled={submitting || (currentStep === 4 && !confirmed)}
                onPress={() => {
                  if (currentStep === 1 && !selectedRoomId) {
                    notification.warning("Vui lòng chọn phòng trước khi tiếp tục.");
                    return;
                  }
                  if (currentStep === 2 && !selectedTenantId) {
                    notification.warning("Vui lòng chọn khách thuê trước khi tiếp tục.");
                    return;
                  }
                  if (currentStep < 4) setCurrentStep((step) => step + 1);
                  else void handleCreateContract();
                }}
                style={styles.primaryFooterButton}
              >
                {currentStep < 4 ? t("contractsMobile.continue") : t("contractsMobile.create")}
              </AppButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DraftContractViewerModal
        visible={draftPreviewVisible}
        draftData={{
          roomId: selectedRoomId,
          tenantId: selectedTenantId,
          startDate,
          endDate,
          fixedRentPrice: fixedRent,
          fixedDeposit,
          electricityPrice: services.electricity.price,
          waterPrice: services.water.price,
          propertyAddress,
          services: Object.entries(services)
            .filter(([_, v]) => v.enabled)
            .map(([k, v]) => ({ name: k, fixedPrice: v.price })),
        }}
        onClose={() => setDraftPreviewVisible(false)}
      />
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
        <AppText style={[base.sectionTitle, { color: theme.text }]}>{title}</AppText>
        {subtitle ? <AppText style={[base.sectionSubtitle, { color: theme.muted }]}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

function Field({ label, required, children, styles }: any) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}{required ? <AppText style={styles.required}> *</AppText> : null}</AppText>
      {children}
    </View>
  );
}

function PreviewRow({ label, value, styles }: { label: string; value: string; styles: any }) {
  return (
    <View style={styles.previewRow}>
      <AppText style={styles.previewLabel}>{label}</AppText>
      <AppText style={styles.previewValue}>{value}</AppText>
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
    filterContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 },
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
    pendingBadge: { backgroundColor: "#fef2f2", borderColor: "#fca5a5", borderWidth: 1, paddingVertical: 4 },
    statusText: { fontSize: 10, fontWeight: "900" },
    pendingText: { color: "#dc2626", fontSize: 12, fontWeight: "800" },
    money: { color: theme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 18 },
    moneyCaption: { color: theme.muted, fontSize: 13 },
    draftContainer: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 16 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
    contractDates: { color: theme.muted, fontSize: 12, fontWeight: "700" },
    approveButton: { marginTop: 16 },
    modalOverlay: { flex: 1, paddingTop: Platform.OS === "ios" ? 45 : 18, backgroundColor: theme.overlay },
    wizardContent: { flex: 1, backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
    handoverContent: { marginTop: "auto", backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
    handoverActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
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
    fullPreviewButton: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 14 },
    fullPreviewCopy: { flex: 1 },
    fullPreviewTitle: { fontSize: 14, fontWeight: "900" },
    fullPreviewSubtitle: { fontSize: 11, marginTop: 2, lineHeight: 16 },
    wizardFooter: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingBottom: Platform.OS === "ios" ? 24 : 12, backgroundColor: theme.surface, shadowColor: theme.text, shadowOpacity: 0.08, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 8 },
    footerButton: { minHeight: 46, paddingHorizontal: 10 },
    primaryFooterButton: { flex: 1, minHeight: 46, paddingHorizontal: 10 },
  });
}
