import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { adminService, AdminRepair } from "../services/adminService";

export default function AdminRepairsScreen() {
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
      Alert.alert("Thành công", "Đã cập nhật yêu cầu sửa chữa!");
      setModalVisible(false);
      loadRepairs();
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Cập nhật thất bại!");
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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} yêu cầu đã chọn không?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const promises = selectedIds.map(id => adminService.deleteRepair(id));
              await Promise.all(promises);
              Alert.alert("Thành công", `Đã xóa ${selectedIds.length} yêu cầu!`);
              setSelectedIds([]);
              loadRepairs();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa một số yêu cầu.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getPriorityText = (p: number) => {
    if (p === 1) return "Thấp";
    if (p === 2) return "Vừa";
    return "Gấp";
  };

  const getPriorityColor = (p: number) => {
    if (p === 1) return COLORS.green;
    if (p === 2) return COLORS.orange;
    return COLORS.red;
  };

  const getStatusText = (s: number) => {
    if (s === 0) return "Mới";
    if (s === 1) return "Đang xử lý";
    if (s === 2) return "Hoàn tất";
    return "Đã hủy";
  };

  const getStatusColor = (s: number) => {
    if (s === 0) return "#007AFF";
    if (s === 1) return COLORS.orange;
    if (s === 2) return COLORS.green;
    return COLORS.muted;
  };

  const filteredRepairs = repairs.filter(repair => {
    if (filter === "pending") return repair.status === 0 || repair.status === 1;
    if (filter === "done") return repair.status === 2;
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xử lý sự cố / Sửa chữa</Text>
      </View>

      {/* Bộ lọc */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterButton, filter === "all" && styles.filterActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>Tất cả</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "pending" && styles.filterActive]}
          onPress={() => setFilter("pending")}
        >
          <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>Chưa xử lý</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "done" && styles.filterActive]}
          onPress={() => setFilter("done")}
        >
          <Text style={[styles.filterText, filter === "done" && styles.filterTextActive]}>Đã hoàn tất</Text>
        </Pressable>
      </View>

      {/* Hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <Text style={styles.bulkText}>Đã chọn {selectedIds.length}</Text>
          <Pressable style={styles.bulkDeleteButton} onPress={handleBulkDelete}>
            <Ionicons name="trash-outline" size={16} color="#FFF" />
            <Text style={styles.bulkDeleteText}>Xóa tất cả</Text>
          </Pressable>
        </View>
      )}

      {/* Tùy chọn chọn tất cả */}
      {filteredRepairs.length > 0 && (
        <Pressable style={styles.selectAllContainer} onPress={toggleAll}>
          <Ionicons 
            name={selectedIds.length === filteredRepairs.length ? "checkbox" : "square-outline"} 
            size={22} 
            color={selectedIds.length === filteredRepairs.length ? COLORS.orange : COLORS.muted} 
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
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.repairCard, selectedIds.includes(item._id) && styles.repairCardSelected]} 
            onPress={() => openEditModal(item)}
            onLongPress={() => toggleSelection(item._id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.roomCodeContainer}>
                <Pressable onPress={() => toggleSelection(item._id)} style={styles.checkboxArea}>
                  <Ionicons 
                    name={selectedIds.includes(item._id) ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={selectedIds.includes(item._id) ? COLORS.orange : COLORS.muted} 
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
          </Pressable>
        )}
      />

      {/* Modal cập nhật xử lý sự cố */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật xử lý sự cố</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            {selectedRepair && (
              <FlatList
                data={[1]}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
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
                      style={[styles.input, styles.textArea]}
                      value={landlordNote}
                      onChangeText={setLandlordNote}
                      placeholder="Nhập ghi chú hoặc phản hồi cho khách"
                      multiline
                      numberOfLines={4}
                    />

                    <Pressable
                      style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                      onPress={handleUpdateRepair}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Cập nhật trạng thái</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
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
    backgroundColor: "#FFF0F0",
    paddingVertical: 10,
    marginHorizontal: 18,
    borderRadius: 8,
  },
  bulkText: {
    color: COLORS.red,
    fontWeight: "700",
    fontSize: 14,
  },
  bulkDeleteButton: {
    backgroundColor: COLORS.red,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkDeleteText: {
    color: "#FFF",
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
    color: COLORS.muted,
    fontWeight: "600",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E8E9ED",
  },
  filterActive: {
    backgroundColor: COLORS.orangeSoft,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
  },
  filterTextActive: {
    color: COLORS.orange,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  repairCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  repairCardSelected: {
    backgroundColor: "#FFF5ED",
    borderColor: COLORS.orange,
    borderWidth: 1,
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
    color: COLORS.text,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  repairTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
  },
  repairDesc: {
    fontSize: 12,
    color: COLORS.muted,
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
    borderColor: "#F4F5F7",
  },
  tenantName: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
    borderColor: "#F0F0F0",
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  form: {
    width: "100%",
    paddingBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
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
    borderColor: "#E8E9ED",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  selectText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 48,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
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
