import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AppTextInput } from "@/components/ui/typography";
import AppButton from "../components/ui/AppButton";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";
import { useNotification } from "../hooks/useNotification";
import {
  adminService,
  AdminServiceBillingMode,
  AdminServiceInput,
  AdminServiceItem,
  AdminServicePriceImpact,
} from "../services/adminService";
import { formatCurrency, formatNumberInput, unformatNumber } from "../utils/formatters";

type Props = { onBack?: () => void };
type Filter = "all" | "active" | "inactive";
type PriceScope = "NEW_CONTRACTS_ONLY" | "SELECTED_ACTIVE_CONTRACTS";
type FormState = {
  name: string;
  code: string;
  billingMode: AdminServiceBillingMode;
  unit: string;
  defaultPrice: string;
  defaultQuantity: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  billingMode: "FIXED",
  unit: "tháng",
  defaultPrice: "",
  defaultQuantity: "1",
  isActive: true,
};

function serviceIcon(service: Pick<AdminServiceItem, "name" | "code">): React.ComponentProps<typeof Ionicons>["name"] {
  const value = `${service.name} ${service.code}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  if (value.includes("dien") || value.includes("electric")) return "flash-outline";
  if (value.includes("nuoc") || value.includes("water")) return "water-outline";
  if (value.includes("internet") || value.includes("wifi")) return "wifi-outline";
  if (value.includes("xe") || value.includes("parking")) return "bicycle-outline";
  if (value.includes("rac") || value.includes("ve sinh")) return "leaf-outline";
  return "construct-outline";
}

export default function AdminServicesScreen({ onBack }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [services, setServices] = useState<AdminServiceItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<AdminServiceItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [priceImpact, setPriceImpact] = useState<AdminServicePriceImpact | null>(null);
  const [priceScope, setPriceScope] = useState<PriceScope>("NEW_CONTRACTS_ONLY");

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setServices(await adminService.getServices());
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [notification, t]);

  useEffect(() => { void loadServices(); }, [loadServices]);

  const filteredServices = useMemo(() => services.filter((service) => {
    if (filter === "active") return service.isActive;
    if (filter === "inactive") return !service.isActive;
    return true;
  }), [filter, services]);

  const openCreate = () => {
    setEditingService(null);
    setPriceImpact(null);
    setPriceScope("NEW_CONTRACTS_ONLY");
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (service: AdminServiceItem) => {
    setEditingService(service);
    setPriceImpact(null);
    setPriceScope("NEW_CONTRACTS_ONLY");
    setForm({
      name: service.name,
      code: service.code,
      billingMode: service.billingMode || (service.type === 1 ? "METER" : "FIXED"),
      unit: service.unit,
      defaultPrice: formatNumberInput(service.defaultPrice),
      defaultQuantity: String(service.defaultQuantity || 1),
      isActive: service.isActive !== false,
    });
    setModalVisible(true);
  };

  const normalizedInput = (): AdminServiceInput | null => {
    const defaultPrice = unformatNumber(form.defaultPrice);
    const defaultQuantity = Number(form.defaultQuantity || 1);
    if (!form.name.trim() || !form.code.trim() || !form.unit.trim()) {
      notification.warning(t("servicesMobile.required"));
      return null;
    }
    if (!Number.isFinite(defaultPrice) || defaultPrice < 0 || !Number.isFinite(defaultQuantity) || defaultQuantity < 0) {
      notification.warning(t("servicesMobile.invalidPrice"));
      return null;
    }
    return {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      billingMode: form.billingMode,
      unit: form.unit.trim(),
      defaultPrice,
      defaultQuantity: form.billingMode === "QUANTITY" ? defaultQuantity : 1,
      isActive: form.isActive,
    };
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setPriceImpact(null);
  };

  const saveService = async () => {
    const input = normalizedInput();
    if (!input) return;
    try {
      setSaving(true);
      if (!editingService) {
        await adminService.createService(input);
      } else if (input.defaultPrice !== editingService.defaultPrice) {
        const impact = await adminService.previewServicePriceImpact(editingService._id, input.defaultPrice);
        if (impact.contracts.length > 0) {
          setPriceImpact(impact);
          return;
        }
        await adminService.updateService(editingService._id, input);
      } else {
        await adminService.updateService(editingService._id, input);
      }
      notification.success(t("servicesMobile.saved"));
      setModalVisible(false);
      await loadServices();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const applyPrice = async () => {
    if (!editingService || !priceImpact) return;
    const input = normalizedInput();
    if (!input) return;
    try {
      setSaving(true);
      await adminService.updateService(editingService._id, {
        ...input,
        defaultPrice: editingService.defaultPrice,
      });
      await adminService.applyServicePrice(editingService._id, {
        newPrice: priceImpact.newPrice,
        scope: priceScope,
        contractIds: priceScope === "SELECTED_ACTIVE_CONTRACTS"
          ? priceImpact.contracts.map((contract) => contract.contractId)
          : [],
      });
      notification.success(t("servicesMobile.priceApplied"));
      setModalVisible(false);
      setPriceImpact(null);
      await loadServices();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: AdminServiceItem) => {
    const confirmed = await notification.confirm({
      title: t("servicesMobile.deleteTitle"),
      message: t("servicesMobile.deleteMessage", { name: service.name }),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const result = await adminService.deleteService(service._id);
      notification.success(t(result.removalMode === "archived" ? "servicesMobile.archived" : "servicesMobile.deleted"));
      await loadServices();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const billingModeLabel = (mode: AdminServiceBillingMode) => t(`servicesMobile.mode.${mode.toLowerCase()}`);

  if (loading) return <ContentSkeleton rows={5} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <>
            <View style={styles.headerRow}>
              {onBack ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={onBack} style={styles.iconButton}>
                  <Ionicons name="arrow-back" size={22} color={theme.text} />
                </Pressable>
              ) : null}
              <View style={styles.headerCopy}>
                <AppText style={styles.title}>{t("servicesMobile.title")}</AppText>
                <AppText style={styles.subtitle}>{t("servicesMobile.subtitle")}</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("servicesMobile.add")} onPress={openCreate} style={styles.addButton}>
                <Ionicons name="add" size={24} color={theme.background} />
              </Pressable>
            </View>
            <View style={styles.filterRow}>
              {(["all", "active", "inactive"] as Filter[]).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: filter === item }}
                  onPress={() => setFilter(item)}
                  style={[styles.filterButton, filter === item && styles.filterButtonActive]}
                >
                  <AppText style={[styles.filterText, filter === item && styles.filterTextActive]}>{t(`servicesMobile.filter.${item}`)}</AppText>
                </Pressable>
              ))}
            </View>
            <AppText style={styles.countText}>{t("servicesMobile.count", { count: filteredServices.length })}</AppText>
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="construct-outline" size={32} color={theme.primary} /></View>
            <AppText style={styles.emptyTitle}>{t("servicesMobile.empty")}</AppText>
            <AppText style={styles.emptyDescription}>{t("servicesMobile.emptyDescription")}</AppText>
            <AppButton icon="add" onPress={openCreate} style={styles.emptyAction}>{t("servicesMobile.add")}</AppButton>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <View style={styles.serviceLead}>
              <View style={styles.serviceIcon}><Ionicons name={serviceIcon(item)} size={22} color={theme.primary} /></View>
              <View style={styles.serviceCopy}>
                <View style={styles.nameRow}>
                  <AppText style={styles.serviceName}>{item.name}</AppText>
                  <View style={[styles.statusBadge, !item.isActive && styles.statusBadgeInactive]}>
                    <AppText style={[styles.statusText, !item.isActive && styles.statusTextInactive]}>
                      {t(item.isActive ? "common.active" : "common.inactive")}
                    </AppText>
                  </View>
                </View>
                <AppText style={styles.serviceMeta}>{item.code} • {billingModeLabel(item.billingMode)} • {item.unit}</AppText>
                <AppText style={styles.servicePrice}>{formatCurrency(item.defaultPrice)} / {item.unit}</AppText>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("common.edit")} onPress={() => openEdit(item)} style={styles.actionButton}>
                <Ionicons name="create-outline" size={20} color={theme.primary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t("common.delete")} onPress={() => void deleteService(item)} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={closeModal} style={StyleSheet.absoluteFill} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{t(editingService ? "servicesMobile.edit" : "servicesMobile.add")}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={closeModal} style={styles.iconButton}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {priceImpact ? (
                <View style={styles.impactBox}>
                  <Ionicons name="information-circle-outline" size={22} color={theme.primary} />
                  <View style={styles.impactCopy}>
                    <AppText style={styles.impactTitle}>{t("servicesMobile.priceImpactTitle")}</AppText>
                    <AppText style={styles.impactText}>{t("servicesMobile.priceImpactDescription", { count: priceImpact.contracts.length })}</AppText>
                    <AppText style={styles.impactPrice}>{formatCurrency(priceImpact.currentPrice)} → {formatCurrency(priceImpact.newPrice)}</AppText>
                  </View>
                </View>
              ) : null}

              {!priceImpact ? (
                <>
                  <Field label={t("servicesMobile.name")} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} theme={theme} />
                  <Field label={t("servicesMobile.code")} value={form.code} onChangeText={(code) => setForm((current) => ({ ...current, code }))} theme={theme} autoCapitalize="characters" />
                  <AppText style={styles.fieldLabel}>{t("servicesMobile.billingMode")}</AppText>
                  <View style={styles.modeGrid}>
                    {(["FIXED", "QUANTITY", "METER"] as AdminServiceBillingMode[]).map((mode) => (
                      <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: form.billingMode === mode }} onPress={() => setForm((current) => ({ ...current, billingMode: mode }))} style={[styles.modeButton, form.billingMode === mode && styles.modeButtonActive]}>
                        <AppText style={[styles.modeText, form.billingMode === mode && styles.modeTextActive]}>{billingModeLabel(mode)}</AppText>
                      </Pressable>
                    ))}
                  </View>
                  <Field label={t("servicesMobile.unit")} value={form.unit} onChangeText={(unit) => setForm((current) => ({ ...current, unit }))} theme={theme} />
                  <Field label={t("servicesMobile.defaultPrice")} value={form.defaultPrice} onChangeText={(defaultPrice) => setForm((current) => ({ ...current, defaultPrice: formatNumberInput(defaultPrice) }))} theme={theme} keyboardType="numeric" />
                  {form.billingMode === "QUANTITY" ? (
                    <Field label={t("servicesMobile.defaultQuantity")} value={form.defaultQuantity} onChangeText={(defaultQuantity) => setForm((current) => ({ ...current, defaultQuantity }))} theme={theme} keyboardType="decimal-pad" />
                  ) : null}
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}><AppText style={styles.switchTitle}>{t("common.active")}</AppText><AppText style={styles.switchDescription}>{t("servicesMobile.activeDescription")}</AppText></View>
                    <Switch value={form.isActive} onValueChange={(isActive) => setForm((current) => ({ ...current, isActive }))} trackColor={{ false: theme.border, true: theme.primary }} />
                  </View>
                </>
              ) : (
                <View style={styles.scopeList}>
                  {(["NEW_CONTRACTS_ONLY", "SELECTED_ACTIVE_CONTRACTS"] as PriceScope[]).map((scope) => (
                    <Pressable key={scope} accessibilityRole="radio" accessibilityState={{ checked: priceScope === scope }} onPress={() => setPriceScope(scope)} style={[styles.scopeButton, priceScope === scope && styles.scopeButtonActive]}>
                      <Ionicons name={priceScope === scope ? "radio-button-on" : "radio-button-off"} size={20} color={theme.primary} />
                      <View style={styles.scopeCopy}><AppText style={styles.scopeTitle}>{t(`servicesMobile.scope.${scope === "NEW_CONTRACTS_ONLY" ? "new" : "active"}`)}</AppText><AppText style={styles.scopeDescription}>{t(`servicesMobile.scope.${scope === "NEW_CONTRACTS_ONLY" ? "newDescription" : "activeDescription"}`)}</AppText></View>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton variant="outline" disabled={saving} onPress={closeModal} style={styles.modalAction}>{t("common.cancel")}</AppButton>
              <AppButton loading={saving} onPress={() => void (priceImpact ? applyPrice() : saveService())} style={styles.modalAction}>{t("common.save")}</AppButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, theme, keyboardType, autoCapitalize }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: ReturnType<typeof useAppTheme>["theme"];
  keyboardType?: "numeric" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={stylesShared.field}>
      <AppText style={[stylesShared.fieldLabel, { color: theme.text }]}>{label}</AppText>
      <AppTextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize} placeholderTextColor={theme.muted} style={[stylesShared.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
    </View>
  );
}

const stylesShared = StyleSheet.create({
  field: { marginTop: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: "600" },
});

function createStyles(theme: ReturnType<typeof useAppTheme>["theme"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 36, gap: 12 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
    headerCopy: { flex: 1 },
    title: { color: theme.text, fontSize: 24, lineHeight: 30, fontWeight: "900" },
    subtitle: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
    iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14 },
    addButton: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary },
    filterRow: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: theme.surfaceElevated, marginBottom: 10 },
    filterButton: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 11 },
    filterButtonActive: { backgroundColor: theme.primary },
    filterText: { color: theme.muted, fontSize: 12, fontWeight: "800" },
    filterTextActive: { color: theme.background },
    countText: { color: theme.muted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
    serviceCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surfaceElevated, borderRadius: 16, padding: 14, marginBottom: 10 },
    serviceLead: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    serviceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    serviceCopy: { flex: 1 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    serviceName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: "900" },
    serviceMeta: { color: theme.muted, fontSize: 10.5, lineHeight: 16, fontWeight: "700", marginTop: 2 },
    servicePrice: { color: theme.primary, fontSize: 13, fontWeight: "900", marginTop: 4 },
    statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.primarySoft },
    statusBadgeInactive: { backgroundColor: theme.background },
    statusText: { color: theme.primary, fontSize: 9, fontWeight: "900" },
    statusTextInactive: { color: theme.muted },
    cardActions: { gap: 2 },
    actionButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 13 },
    emptyState: { alignItems: "center", backgroundColor: theme.surfaceElevated, borderRadius: 16, padding: 24, marginTop: 18 },
    emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    emptyTitle: { color: theme.text, fontSize: 18, fontWeight: "900", marginTop: 14 },
    emptyDescription: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 },
    emptyAction: { alignSelf: "stretch", marginTop: 16 },
    modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4,16,14,0.52)" },
    modalSheet: { maxHeight: "92%", borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: theme.surfaceElevated, paddingBottom: 24 },
    modalHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 },
    modalTitle: { flex: 1, color: theme.text, fontSize: 19, fontWeight: "900" },
    modalContent: { paddingHorizontal: 18, paddingBottom: 18 },
    fieldLabel: { color: theme.text, fontSize: 12, fontWeight: "800", marginTop: 14, marginBottom: 7 },
    modeGrid: { flexDirection: "row", gap: 8 },
    modeButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 13, borderWidth: 1, borderColor: theme.border },
    modeButtonActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
    modeText: { color: theme.muted, fontSize: 11, fontWeight: "800", textAlign: "center" },
    modeTextActive: { color: theme.primary },
    switchRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16, padding: 13, borderRadius: 14, backgroundColor: theme.background },
    switchCopy: { flex: 1 },
    switchTitle: { color: theme.text, fontSize: 14, fontWeight: "900" },
    switchDescription: { color: theme.muted, fontSize: 11, marginTop: 2 },
    impactBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: theme.primarySoft },
    impactCopy: { flex: 1 },
    impactTitle: { color: theme.text, fontSize: 15, fontWeight: "900" },
    impactText: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
    impactPrice: { color: theme.primary, fontSize: 14, fontWeight: "900", marginTop: 7 },
    scopeList: { gap: 10, marginTop: 16 },
    scopeButton: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
    scopeButtonActive: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    scopeCopy: { flex: 1 },
    scopeTitle: { color: theme.text, fontSize: 13, fontWeight: "900" },
    scopeDescription: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
    modalActions: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 10 },
    modalAction: { flex: 1 },
  });
}
