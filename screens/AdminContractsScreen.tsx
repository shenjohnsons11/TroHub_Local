import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { adminService, AdminContract, AdminRoom, AdminTenant } from "../services/adminService";
type Props = {
  params?: any;
};

export default function AdminContractsScreen({ params }: Props) {
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  // Modal states for creating contract
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [fixedRent, setFixedRent] = useState("");
  const [fixedDeposit, setFixedDeposit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Default dates
    const today = new Date();
    setStartDate(today.toISOString().split("T")[0]);

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().split("T")[0]);
  }, []);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find(r => r._id === roomId);
    if (room) {
      setFixedRent(String(room.defaultRentPrice || 0));
      setFixedDeposit(String(room.defaultDeposit || 0));
    }
  };

  const handleCreateContract = async () => {
    if (!selectedRoomId || !selectedTenantId || !fixedRent.trim() || !fixedDeposit.trim() || !startDate.trim() || !endDate.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }

    try {
      setSubmitting(true);
      await adminService.createContract({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        fixedRentPrice: Number(fixedRent),
        fixedDeposit: Number(fixedDeposit),
      });
      Alert.alert("Thành công", "Tạo hợp đồng nháp thành công! Chờ người thuê ký xác nhận.");
      setModalVisible(false);
      setSelectedRoomId("");
      setSelectedTenantId("");
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Tạo hợp đồng thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveContract = async (contractId: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn duyệt và kích hoạt hợp đồng này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            try {
              setLoading(true);
              const success = await adminService.confirmContract(contractId);
              if (success) {
                Alert.alert("Thành công", "Đã duyệt và kích hoạt hợp đồng thành công!");
                loadData();
              } else {
                throw new Error("Không thể xác nhận hợp đồng");
              }
            } catch (error) {
              Alert.alert("Lỗi", error instanceof Error ? error.message : "Duyệt hợp đồng thất bại!");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Chờ khách ký";
      case 1: return "Có hiệu lực";
      case 2: return "Hết hạn";
      case 3: return "Đã hủy";
      case 4: return "Chờ chủ duyệt";
      default: return "Nháp";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return COLORS.orange;
      case 1: return COLORS.green;
      case 2: return COLORS.muted;
      case 3: return COLORS.red;
      case 4: return "#007AFF";
      default: return COLORS.muted;
    }
  };

  const getStatusBg = (status: number) => {
    switch (status) {
      case 0: return COLORS.orangeSoft;
      case 1: return "#EAF9F1";
      case 2: return "#E8E9ED";
      case 3: return "#FFF1F1";
      case 4: return "#E8F4FD";
      default: return "#E8E9ED";
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (filter === "pending") return c.status === 0 || c.status === 4;
    if (filter === "active") return c.status === 1;
    return true;
  });

  const vacantRooms = rooms.filter(room => room.status === 0);

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
        <Text style={styles.title}>Quản lý hợp đồng</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="document-text" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Tạo hợp đồng</Text>
        </Pressable>
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
          <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>Chờ duyệt/ký</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "active" && styles.filterActive]}
          onPress={() => setFilter("active")}
        >
          <Text style={[styles.filterText, filter === "active" && styles.filterTextActive]}>Đang hiệu lực</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredContracts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const roomCode = (item.roomId && typeof item.roomId === "object") ? item.roomId.roomCode : "N/A";
          const tenantName = (item.tenantId && typeof item.tenantId === "object") ? item.tenantId.fullName : "N/A";
          const tenantPhone = (item.tenantId && typeof item.tenantId === "object") ? item.tenantId.phone : "N/A";
          
          return (
            <View style={styles.contractCard}>
              <View style={styles.contractInfo}>
                <Text style={styles.roomCode}>Phòng {roomCode}</Text>
                <Text style={styles.tenantName}>Khách thuê: {tenantName} ({tenantPhone !== "N/A" ? String(tenantPhone).replace(/\D/g, "").replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3").replace(/(\d{4})(\d+)/, "$1.$2") : "N/A"})</Text>
                <Text style={styles.contractDates}>
                  Thời hạn: {item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN") : ""} - {item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN") : ""}
                </Text>
                <Text style={styles.contractPrices}>
                  Tiền thuê: {item.fixedRentPrice?.toLocaleString("vi-VN")}đ • Cọc: {item.fixedDeposit?.toLocaleString("vi-VN")}đ
                </Text>
              </View>
              
              <View style={styles.rightAction}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
                {item.status === 4 && (
                  <Pressable style={styles.approveButton} onPress={() => handleApproveContract(item._id)}>
                    <Text style={styles.approveButtonText}>Duyệt</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal Tạo hợp đồng mới */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo hợp đồng mới</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                {/* Chọn phòng trống */}
                <Text style={styles.label}>Chọn phòng trống</Text>
                <ScrollView style={styles.roomSelectScroll} nestedScrollEnabled={true}>
                  <View style={styles.roomSelectGrid}>
                    {vacantRooms.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có phòng trống nào hiện tại!</Text>
                    ) : (
                      vacantRooms.map((room) => (
                        <Pressable
                          key={room._id}
                          style={[
                            styles.roomSelectItem,
                            selectedRoomId === room._id && styles.roomSelectActive
                          ]}
                          onPress={() => handleSelectRoom(room._id)}
                        >
                          <Text
                            style={[
                              styles.roomSelectText,
                              selectedRoomId === room._id && styles.roomSelectTextActive
                            ]}
                          >
                            {room.roomCode}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>

                {/* Chọn khách thuê */}
                <Text style={styles.label}>Chọn khách thuê</Text>
                <ScrollView style={styles.tenantSelectScroll} nestedScrollEnabled={true}>
                  <View style={styles.tenantSelectGrid}>
                    {tenants.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có khách thuê nào trên hệ thống!</Text>
                    ) : (
                      tenants.map((t) => (
                        <Pressable
                          key={t._id}
                          style={[
                            styles.tenantSelectItem,
                            selectedTenantId === t._id && styles.tenantSelectActive
                          ]}
                          onPress={() => setSelectedTenantId(t._id)}
                        >
                          <Text
                            style={[
                              styles.tenantSelectText,
                              selectedTenantId === t._id && styles.tenantSelectTextActive
                            ]}
                          >
                            {t.fullName}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>

                <Text style={styles.label}>Tiền thuê chốt hàng tháng (đ)</Text>
                <TextInput
                  style={styles.input}
                  value={fixedRent}
                  onChangeText={setFixedRent}
                  placeholder="Ví dụ: 3000000"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Tiền đặt cọc chốt (đ)</Text>
                <TextInput
                  style={styles.input}
                  value={fixedDeposit}
                  onChangeText={setFixedDeposit}
                  placeholder="Ví dụ: 3000000"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Ngày bắt đầu (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.label}>Ngày kết thúc (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />

                <Pressable
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleCreateContract}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Tạo hợp đồng</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 8,
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
  contractCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  contractInfo: {
    flex: 1,
    paddingRight: 10,
  },
  roomCode: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },
  tenantName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 4,
  },
  contractDates: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 4,
  },
  contractPrices: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: "800",
    marginTop: 4,
  },
  rightAction: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  approveButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
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
    height: "85%",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  noVacantText: {
    fontSize: 13,
    color: COLORS.red,
    fontWeight: "700",
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
    borderColor: "#E8E9ED",
    backgroundColor: "#FFFFFF",
  },
  roomSelectActive: {
    backgroundColor: COLORS.orangeSoft,
    borderColor: COLORS.orange,
  },
  roomSelectText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
  },
  roomSelectTextActive: {
    color: COLORS.orange,
    fontWeight: "900",
  },
  roomSelectScroll: {
    maxHeight: 80,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  tenantSelectScroll: {
    maxHeight: 50,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
    padding: 8,
  },
  tenantSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tenantSelectItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    backgroundColor: "#FFFFFF",
  },
  tenantSelectActive: {
    backgroundColor: COLORS.orangeSoft,
    borderColor: COLORS.orange,
  },
  tenantSelectText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
  },
  tenantSelectTextActive: {
    color: COLORS.orange,
    fontWeight: "900",
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
