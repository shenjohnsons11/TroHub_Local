import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, KeyboardAvoidingView, Platform, Image } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import { adminService, AdminRepair, AdminRoom, AdminContract } from "../services/adminService";
import { useTranslation } from "../contexts/LanguageContext";

type Props = { params?: { repairId?: string } };

export default function AdminRepairsScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const { t, language } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [repairs, setRepairs] = useState<AdminRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  // Modal states for editing repair
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<AdminRepair | null>(null);
  const [status, setStatus] = useState<number>(0);
  const [priority, setPriority] = useState<number>(1);
  const [landlordNote, setLandlordNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadRepairs = async () => {
    try {
      const data = await adminService.getRepairs();
      setRepairs(data);
    } catch (error) {
      console.log("Lỗi tải yêu cầu sửa chữa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepairs();
  }, []);

  const openEditModal = (repair: AdminRepair) => {
    setSelectedRepair(repair);
    setStatus(repair.status);
    setPriority(repair.priority || 1);
    setLandlordNote(repair.landlordNote || "");
    setModalVisible(true);
  };

  useEffect(() => {
    if (loading || !params?.repairId) return;
    const repair = repairs.find((item) => item._id === params.repairId);
    if (repair) openEditModal(repair);
  }, [loading, params?.repairId]);

  const handleUpdateRepair = async () => {
    if (!selectedRepair) return;

    try {
      setSubmitting(true);
      await adminService.updateRepair(selectedRepair._id, {
        status,
        priority,
        landlordNote: landlordNote.trim(),
      });
      notification.success(t("mobile.repairs.updated"));

      setModalVisible(false);
      loadRepairs();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("mobile.repairs.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredRepairs.length && filteredRepairs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRepairs.map(r => r._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await notification.confirm({ title: t("mobile.repairs.deleteTitle"), message: t("mobile.repairs.deleteMessage", { count: selectedIds.length }), confirmText: t("common.delete"), cancelText: t("common.cancel"), destructive: true });
    if (!confirmed) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map((id) => adminService.deleteRepair(id)));
      notification.success(t("mobile.repairs.deleted", { count: selectedIds.length }));
      setSelectedIds([]);
      void loadRepairs();
    } catch {
      notification.error(t("mobile.repairs.deleteFailed"));
      setLoading(false);
    }
  };

  const getPriorityText = (p: number) => {
    if (p === 1) return t("mobile.repairs.low");
    if (p === 2) return t("mobile.repairs.medium");
    return t("mobile.repairs.urgent");
  };

  const getPriorityColor = (p: number) => {
    if (p === 1) return theme.positive;
    if (p === 2) return theme.warningForeground;
    return theme.danger;
  };

  const getStatusText = (s: number) => {
    if (s === 0) return t("mobile.repairs.pending");
    if (s === 1) return t("mobile.repairs.repairing");
    if (s === 2) return t("mobile.repairs.done");
    return t("mobile.repairs.cancelled");
  };

  const getStatusColor = (s: number) => {
    if (s === 0) return theme.primary;
    if (s === 1) return theme.warningForeground;
    if (s === 2) return theme.positive;
    return theme.muted;
  };

  const filteredRepairs = repairs.filter(repair => {
    if (filter === "pending") return repair.status === 0 || repair.status === 1;
    if (filter === "done") return repair.status === 2;
    return true;
  });

  if (loading) return <AppLoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Tầng 1: Header */}
      <View style={styles.header}>
        <AppText style={styles.title}>{t("mobile.repairs.title")}</AppText>
      </View>

      {/* Hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <AppText style={styles.bulkText}>{t("mobile.repairs.selected", { count: selectedIds.length })}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.repairs.deleteSelected", { count: selectedIds.length })} style={styles.bulkDeleteButton} onPress={handleBulkDelete}>
            <Ionicons name="trash-outline" size={16} color={theme.dangerForeground} />
            <AppText style={styles.bulkDeleteText}>{t("mobile.repairs.deleteAll")}</AppText>
          </Pressable>
        </View>
      )}

      {/* Tùy chọn chọn tất cả */}
      {filteredRepairs.length > 0 && (
        <Pressable accessibilityRole="checkbox" accessibilityLabel={t("mobile.repairs.selectAllLabel")} accessibilityState={{ checked: selectedIds.length === filteredRepairs.length }} style={styles.selectAllContainer} onPress={toggleAll}>
          <Ionicons 
            name={selectedIds.length === filteredRepairs.length ? "checkbox" : "square-outline"} 
            size={22} 
            color={selectedIds.length === filteredRepairs.length ? theme.primary : theme.muted}
          />
          <AppText style={styles.selectAllText}>{t("mobile.repairs.selectAll")}</AppText>
        </Pressable>
      )}

      <FlatList
        data={filteredRepairs}
        keyExtractor={(item) => item._id}
        extraData={selectedIds}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GradientHero icon="construct-outline" label={t("mobile.repairs.heroLabel")} value={t("mobile.repairs.heroValue", { count: repairs.filter((repair) => repair.status === 0 || repair.status === 1).length })} detail={t("mobile.repairs.heroDetail", { count: repairs.length })} />
            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.sectionTitle}>{t("mobile.repairs.sectionTitle")}</AppText>
                <AppText style={styles.sectionSub}>{t("mobile.repairs.sectionSubtitle")}</AppText>
              </View>
            </View>
            <View style={styles.filterContainer}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'all' }} style={[styles.filterButton, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
                <AppText style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>{t("common.all")}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'pending' }} style={[styles.filterButton, filter === 'pending' && styles.filterActive]} onPress={() => setFilter('pending')}>
                <AppText style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>{t("mobile.repairs.pending")}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'done' }} style={[styles.filterButton, filter === 'done' && styles.filterActive]} onPress={() => setFilter('done')}>
                <AppText style={[styles.filterText, filter === 'done' && styles.filterTextActive]}>{t("mobile.repairs.done")}</AppText>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={<IllustratedEmptyState kind="repair" title={repairs.length ? t("mobile.repairs.noMatch") : t("mobile.repairs.empty")} description={repairs.length ? t("mobile.repairs.tryFilter") : t("mobile.repairs.emptyDescription")} />}
        renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 6) * 45}><Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mobile.repairs.open", { title: item.title })}
            style={[styles.repairCard, selectedIds.includes(item._id) && styles.repairCardSelected]} 
            onPress={() => openEditModal(item)}
            onLongPress={() => toggleSelection(item._id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.roomCodeContainer}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={t("mobile.repairs.select", { title: item.title })} accessibilityState={{ checked: selectedIds.includes(item._id) }} onPress={() => toggleSelection(item._id)} style={styles.checkboxArea}>
                  <Ionicons 
                    name={selectedIds.includes(item._id) ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={selectedIds.includes(item._id) ? theme.primary : theme.muted}
                  />
                </Pressable>
                <AppText style={styles.roomCode}>{t("mobile.repairs.room", { roomCode: item.contractId?.roomId?.roomCode || "N/A" })}</AppText>
              </View>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) + "15" }]}>
                  <AppText style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
                    {getPriorityText(item.priority)}
                  </AppText>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "15" }]}>
                  <AppText style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </AppText>
                </View>
              </View>
            </View>

            <AppText style={styles.repairTitle}>{item.title}</AppText>
            <AppText style={styles.repairDesc} numberOfLines={2}>{item.description}</AppText>
            
            <View style={styles.cardFooter}>
              <AppText style={styles.tenantName}>{t("mobile.repairs.tenant", { name: item.contractId?.tenantId?.fullName || "N/A" })}</AppText>
              <AppText style={styles.dateText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString(language === "en" ? "en-US" : "vi-VN") : ""}
              </AppText>
            </View>
          </Pressable></AnimatedEntry>
        )}
      />

      {/* Modal cập nhật xử lý sự cố */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View accessibilityViewIsModal style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t("mobile.repairs.modalTitle")}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.repairs.close")} disabled={submitting} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            {selectedRepair && (
              <FlatList
                data={[1]}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={() => (
                  <View style={styles.form}>
                    <AppText style={styles.infoTitle}>{t("mobile.repairs.room", { roomCode: selectedRepair.contractId?.roomId?.roomCode || "N/A" })}</AppText>
                    <AppText style={styles.infoDesc}>{t("mobile.repairs.issueTitle", { title: selectedRepair.title })}</AppText>
                    <AppText style={styles.infoDesc}>{t("mobile.repairs.description", { description: selectedRepair.description })}</AppText>

                    {selectedRepair.images?.length ? <><AppText style={styles.label}>{t("mobile.repairs.images")}</AppText><FlatList horizontal data={selectedRepair.images} keyExtractor={(uri, index) => `${uri}-${index}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow} renderItem={({ item, index }) => <Image accessibilityLabel={t("mobile.repairs.image", { index: index + 1 })} source={{ uri: item }} style={styles.repairImage} resizeMode="cover" />} /></> : null}

                    {/* Chọn độ ưu tiên */}
                    <AppText style={styles.label}>{t("mobile.repairs.priority")}</AppText>
                    <View style={styles.selectGrid}>
                      {[1, 2, 3].map((p) => (
                        <Pressable
                          key={p}
                          accessibilityRole="radio"
                          accessibilityLabel={`${t("mobile.repairs.priority")}: ${getPriorityText(p)}`}
                          accessibilityState={{ selected: priority === p }}
                          style={[
                            styles.selectItem,
                            priority === p && { backgroundColor: getPriorityColor(p) + "20", borderColor: getPriorityColor(p) }
                          ]}
                          onPress={() => setPriority(p)}
                        >
                          <AppText style={[styles.selectText, priority === p && { color: getPriorityColor(p), fontWeight: "900" }]}>
                            {getPriorityText(p)}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>

                    {/* Chọn trạng thái */}
                    <AppText style={styles.label}>{t("mobile.repairs.status")}</AppText>
                    <View style={styles.selectGrid}>
                      {[0, 1, 2, 3].map((s) => (
                        <Pressable
                          key={s}
                          accessibilityRole="radio"
                          accessibilityLabel={`${t("mobile.repairs.status")}: ${getStatusText(s)}`}
                          accessibilityState={{ selected: status === s }}
                          style={[
                            styles.selectItem,
                            status === s && { backgroundColor: getStatusColor(s) + "20", borderColor: getStatusColor(s) }
                          ]}
                          onPress={() => setStatus(s)}
                        >
                          <AppText style={[styles.selectText, status === s && { color: getStatusColor(s), fontWeight: "900" }]}>
                            {getStatusText(s)}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>

                    {/* Ghi chú phản hồi */}
                    <AppText style={styles.label}>{t("mobile.repairs.note")}</AppText>
                    <AppTextInput
                      accessibilityLabel={t("mobile.repairs.note")}
                      style={[styles.input, styles.textArea]}
                      value={landlordNote}
                      onChangeText={setLandlordNote}
                      placeholder={t("mobile.repairs.notePlaceholder")}
                      multiline
                      numberOfLines={4}
                    />

                    <AppButton
                      icon="save-outline"
                      loading={submitting}
                      onPress={handleUpdateRepair}
                    >
                      {t("mobile.repairs.update")}
                    </AppButton>
                  </View>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.text,
  },
  imageRow: { gap: 10, paddingBottom: 4 },
  repairImage: { width: 180, height: 128, borderRadius: 14, backgroundColor: theme.surfaceElevated },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 6,
    gap: 8,
  },
  bulkActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 8,
    backgroundColor: theme.warningSoft,
    paddingVertical: 10,
    marginHorizontal: 18,
    borderRadius: 8,
  },
  bulkText: {
    color: theme.danger,
    fontWeight: "700",
    fontSize: 14,
  },
  bulkDeleteButton: {
    backgroundColor: theme.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkDeleteText: {
    color: theme.dangerForeground,
    fontWeight: "800",
    fontSize: 13,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  selectAllText: {
    fontSize: 14,
    color: theme.muted,
    fontWeight: "600",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceElevated,
  },
  filterActive: {
    backgroundColor: theme.primarySoft,
  },
  filterText: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700",
  },
  filterTextActive: {
    color: theme.primary,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 10,
  },
  repairCard: {
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
  repairCardSelected: {
    backgroundColor: theme.primarySoft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxArea: {
    padding: 2,
  },
  roomCode: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  repairTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.text,
    marginTop: 8,
  },
  repairDesc: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.background,
  },
  tenantName: {
    fontSize: 11,
    color: theme.text,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: "600",
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
  infoTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 13,
    color: theme.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
  },
  selectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectItem: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceElevated,
    alignItems: "center",
  },
  selectText: {
    fontSize: 12,
    color: theme.text,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.text,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.text,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: '600',
    marginTop: 2,
  },
});
