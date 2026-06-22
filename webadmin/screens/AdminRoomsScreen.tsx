import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { adminService, AdminRoom } from "../services/adminService";
type Props = {
  params?: any;
};

export default function AdminRoomsScreen({ params }: Props) {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "empty" | "occupied" | "repair">("all");
  
  // Modal states for adding room
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [roomCode, setRoomCode] = useState("");
  const [area, setArea] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal states
  const [selectedRoom, setSelectedRoom] = useState<AdminRoom | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await adminService.getRooms();
      setRooms(data);
    } catch (error) {
      console.log("Lỗi tải phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleAddRoom = async () => {
    if (!roomCode.trim() || !area.trim() || !rentPrice.trim() || !deposit.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }

    try {
      setSubmitting(true);
      await adminService.createRoom({
        roomCode: roomCode.trim(),
        area: area.trim(),
        defaultRentPrice: Number(rentPrice),
        defaultDeposit: Number(deposit),
      });
      Alert.alert("Thành công", "Đã thêm phòng mới thành công!");
      setModalVisible(false);
      setRoomCode("");
      setArea("");
      setRentPrice("");
      setDeposit("");
      loadRooms();
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Thêm phòng thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: number) => {
    if (status === 0) return "Trống";
    if (status === 1) return "Đang thuê";
    return "Đang sửa";
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return COLORS.green;
    if (status === 1) return COLORS.orange;
    return COLORS.red;
  };

  const getStatusBg = (status: number) => {
    if (status === 0) return "#EAF9F1";
    if (status === 1) return COLORS.orangeSoft;
    return "#FFF1F1";
  };

  const filteredRooms = rooms.filter(room => {
    if (filter === "empty") return room.status === 0;
    if (filter === "occupied") return room.status === 1;
    if (filter === "repair") return room.status === 2;
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
        <Text style={styles.title}>Danh sách phòng</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm phòng</Text>
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
          style={[styles.filterButton, filter === "empty" && styles.filterActive]}
          onPress={() => setFilter("empty")}
        >
          <Text style={[styles.filterText, filter === "empty" && styles.filterTextActive]}>Trống</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "occupied" && styles.filterActive]}
          onPress={() => setFilter("occupied")}
        >
          <Text style={[styles.filterText, filter === "occupied" && styles.filterTextActive]}>Đang thuê</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "repair" && styles.filterActive]}
          onPress={() => setFilter("repair")}
        >
          <Text style={[styles.filterText, filter === "repair" && styles.filterTextActive]}>Sửa chữa</Text>
        </Pressable>
      </View>

      {/* FlatList danh sách phòng */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.roomCard}
            onPress={() => {
              setSelectedRoom(item);
              setDetailVisible(true);
            }}
          >
            <View style={styles.roomInfo}>
              <Text style={styles.roomCode}>{item.roomCode}</Text>
              <Text style={styles.roomSub}>Diện tích: {item.area} | Giá: {item.defaultRentPrice.toLocaleString("vi-VN")}đ</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Modal chi tiết phòng */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết phòng {selectedRoom?.roomCode}</Text>
              <Pressable onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>
            
            {selectedRoom && (
              <View style={styles.detailBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diện tích:</Text>
                  <Text style={styles.detailValue}>{selectedRoom.area}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giá thuê mặc định:</Text>
                  <Text style={styles.detailValue}>{selectedRoom.defaultRentPrice.toLocaleString("vi-VN")}đ/tháng</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tiền cọc mặc định:</Text>
                  <Text style={styles.detailValue}>{selectedRoom.defaultDeposit.toLocaleString("vi-VN")}đ</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedRoom.status), alignSelf: "flex-start" }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedRoom.status) }]}>{getStatusText(selectedRoom.status)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal thêm phòng */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm phòng trọ mới</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Mã phòng (ví dụ: P.101)</Text>
              <TextInput
                style={styles.input}
                value={roomCode}
                onChangeText={setRoomCode}
                placeholder="Nhập mã phòng"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Diện tích (ví dụ: 25m2)</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="Nhập diện tích"
              />

              <Text style={styles.label}>Giá thuê mặc định (VNĐ)</Text>
              <TextInput
                style={styles.input}
                value={rentPrice}
                onChangeText={setRentPrice}
                placeholder="Nhập giá thuê"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Tiền đặt cọc mặc định (VNĐ)</Text>
              <TextInput
                style={styles.input}
                value={deposit}
                onChangeText={setDeposit}
                placeholder="Nhập tiền đặt cọc"
                keyboardType="numeric"
              />

              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleAddRoom}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Thêm phòng</Text>
                )}
              </Pressable>
            </View>
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
    paddingBottom: 10,
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
  roomCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  roomInfo: {
    flex: 1,
  },
  roomCode: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },
  roomSub: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 4,
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
  detailBody: {
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#F4F5F7",
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "700",
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "800",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
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
  submitButton: {
    height: 48,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
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
