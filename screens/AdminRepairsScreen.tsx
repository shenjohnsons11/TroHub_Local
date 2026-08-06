import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import AppButton from "../components/ui/AppButton";
import { adminService, AdminRepair, AdminRoom, AdminContract } from "../services/adminService";

export default function AdminRepairsScreen() {
  const { theme } = useAppTheme();
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

  const handleUpdateRepair = async () => {
    if (!selectedRepair) return;

    try {
      setSubmitting(true);
      await adminService.updateRepair(selectedRepair._id, {
        status,
        priority,
        landlordNote: landlordNote.trim(),
      });
      notification.success("Đã cập nhật yêu cầu sửa chữa!");

      setModalVisible(false);
      loadRepairs();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Cập nhật thất bại!");
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
    const confirmed = await notification.confirm({ title: "Xác nhận xóa", message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} yêu cầu đã chọn không?`, confirmText: "Xóa", cancelText: "Hủy", destructive: true });
    if (!confirmed) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map((id) => adminService.deleteRepair(id)));
      notification.success(`Đã xóa ${selectedIds.length} yêu cầu!`);
      setSelectedIds([]);
      void loadRepairs();
    } catch {
      notification.error("Không thể xóa một số yêu cầu.");
      setLoading(false);
    }
  };

  const getPriorityText = (p: number) => {
    if (p === 1) return "Thấp";
    if (p === 2) return "Vừa";
    return "Gấp";
  };

  const getPriorityColor = (p: number) => {
    if (p === 1) return theme.positive;
    if (p === 2) return theme.warningForeground;
    return theme.danger;
  };

  const getStatusText = (s: number) => {
    if (s === 0) return "Chờ xử lý";
    if (s === 1) return "Đang sửa";
    if (s === 2) return "Hoàn tất";
    return "Đã hủy";
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
        <Text style={styles.title}>Xử lý sự cố / Sửa chữa</Text>
      </View>

      {/* Hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <Text style={styles.bulkText}>Đã chọn {selectedIds.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${selectedIds.length} yêu cầu đã chọn`} style={styles.bulkDeleteButton} onPress={handleBulkDelete}>
            <Ionicons name="trash-outline" size={16} color={theme.dangerForeground} />
            <Text style={styles.bulkDeleteText}>Xóa tất cả</Text>
          </Pressable>
        </View>
      )}

      {/* Tùy chọn chọn tất cả */}
      {filteredRepairs.length > 0 && (
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Chọn tất cả yêu cầu sửa chữa" accessibilityState={{ checked: selectedIds.length === filteredRepairs.length }} style={styles.selectAllContainer} onPress={toggleAll}>
          <Ionicons 
            name={selectedIds.length === filteredRepairs.length ? "checkbox" : "square-outline"} 
            size={22} 
            color={selectedIds.length === filteredRepairs.length ? theme.primary : theme.muted}
          />
          <Text style={styles.selectAllText}>Chọn tất cả</Text>
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
            <GradientHero icon="construct-outline" label="YÊU CẦU SỬ A CHỮA" value={`${repairs.filter((repair) => repair.status === 0 || repair.status === 1).length} đang mở`} detail={`${repairs.length} yêu cầu trong hệ thống`} />
            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Xử lý sự cố</Text>
                <Text style={styles.sectionSub}>Quản lý các yêu cầu sửa chữa từ người thuê</Text>
              </View>
            </View>
            <View style={styles.filterContainer}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'all' }} style={[styles.filterButton, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tất cả</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'pending' }} style={[styles.filterButton, filter === 'pending' && styles.filterActive]} onPress={() => setFilter('pending')}>
                <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Chờ xử lý</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'done' }} style={[styles.filterButton, filter === 'done' && styles.filterActive]} onPress={() => setFilter('done')}>
                <Text style={[styles.filterText, filter === 'done' && styles.filterTextActive]}>Hoàn tất</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={<IllustratedEmptyState kind="repair" title={repairs.length ? "Không có sự cố phù hợp" : "Chưa có sự cố"} description={repairs.length ? "Hãy chọn bộ lọc khác." : "Các yêu cầu sửa chữa mới sẽ xuất hiện tại đây."} />}
        renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 6) * 45}><Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mở yêu cầu sửa chữa ${item.title}`}
            style={[styles.repairCard, selectedIds.includes(item._id) && styles.repairCardSelected]} 
            onPress={() => openEditModal(item)}
            onLongPress={() => toggleSelection(item._id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.roomCodeContainer}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`Chọn yêu cầu ${item.title}`} accessibilityState={{ checked: selectedIds.includes(item._id) }} onPress={() => toggleSelection(item._id)} style={styles.checkboxArea}>
                  <Ionicons 
                    name={selectedIds.includes(item._id) ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={selectedIds.includes(item._id) ? theme.primary : theme.muted}
                  />
                </Pressable>
                <Text style={styles.roomCode}>Phòng {item.contractId?.roomId?.roomCode || "N/A"}</Text>
              </View>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) + "15" }]}>
                  <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
                    {getPriorityText(item.priority)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + "15" }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.repairTitle}>{item.title}</Text>
            <Text style={styles.repairDesc} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.cardFooter}>
              <Text style={styles.tenantName}>Khách: {item.contractId?.tenantId?.fullName || "N/A"}</Text>
              <Text style={styles.dateText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : ""}
              </Text>
            </View>
          </Pressable></AnimatedEntry>
        )}
      />

      {/* Modal cập nhật xử lý sự cố */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View accessibilityViewIsModal style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>Cập nhật xử lý sự cố</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng cập nhật sửa chữa" disabled={submitting} onPress={() => setModalVisible(false)}>
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
                    <Text style={styles.infoTitle}>Phòng {selectedRepair.contractId?.roomId?.roomCode}</Text>
                    <Text style={styles.infoDesc}>Tiêu đề: {selectedRepair.title}</Text>
                    <Text style={styles.infoDesc}>Mô tả: {selectedRepair.description}</Text>

                    {/* Chọn độ ưu tiên */}
                    <Text style={styles.label}>Độ ưu tiên</Text>
                    <View style={styles.selectGrid}>
                      {[1, 2, 3].map((p) => (
                        <Pressable
                          key={p}
                          accessibilityRole="radio"
                          accessibilityLabel={`Độ ưu tiên ${getPriorityText(p)}`}
                          accessibilityState={{ selected: priority === p }}
                          style={[
                            styles.selectItem,
                            priority === p && { backgroundColor: getPriorityColor(p) + "20", borderColor: getPriorityColor(p) }
                          ]}
                          onPress={() => setPriority(p)}
                        >
                          <Text style={[styles.selectText, priority === p && { color: getPriorityColor(p), fontWeight: "900" }]}>
                            {getPriorityText(p)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Chọn trạng thái */}
                    <Text style={styles.label}>Trạng thái xử lý</Text>
                    <View style={styles.selectGrid}>
                      {[0, 1, 2, 3].map((s) => (
                        <Pressable
                          key={s}
                          accessibilityRole="radio"
                          accessibilityLabel={`Trạng thái ${getStatusText(s)}`}
                          accessibilityState={{ selected: status === s }}
                          style={[
                            styles.selectItem,
                            status === s && { backgroundColor: getStatusColor(s) + "20", borderColor: getStatusColor(s) }
                          ]}
                          onPress={() => setStatus(s)}
                        >
                          <Text style={[styles.selectText, status === s && { color: getStatusColor(s), fontWeight: "900" }]}>
                            {getStatusText(s)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Ghi chú phản hồi */}
                    <Text style={styles.label}>Ghi chú phản hồi từ Chủ trọ</Text>
                    <TextInput
                      accessibilityLabel="Ghi chú phản hồi từ Chủ trọ"
                      style={[styles.input, styles.textArea]}
                      value={landlordNote}
                      onChangeText={setLandlordNote}
                      placeholder="Nhập ghi chú hoặc phản hồi cho khách"
                      multiline
                      numberOfLines={4}
                    />

                    <AppButton
                      icon="save-outline"
                      loading={submitting}
                      onPress={handleUpdateRepair}
                    >
                      Cập nhật trạng thái
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
