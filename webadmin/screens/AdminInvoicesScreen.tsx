import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../constants/theme";
import { adminService, AdminInvoice, AdminRoom, AdminContract } from "../services/adminService";
type Props = {
  params?: any;
  onNavigate?: (tab: any, params?: any) => void;
};

export default function AdminInvoicesScreen({ params, onNavigate }: Props) {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");

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
    
    // Find active contract for this room
    const roomContract = contracts.find(
      c => c.status === 1 && (typeof c.roomId === "string" ? c.roomId === roomId : c.roomId._id === roomId)
    );
    
    if (roomContract) {
      // Find last invoice for this contract
      const contractInvoices = invoices.filter(
        inv => inv.contractId && (typeof inv.contractId === "string" ? inv.contractId === roomContract._id : inv.contractId._id === roomContract._id)
      );
      
      if (contractInvoices.length > 0) {
        // Sort by date descending
        const sortedInvoices = [...contractInvoices].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        const lastInv = sortedInvoices[0];
        
        // Auto fill indexes
        setElecOld(String(lastInv.electricityNew || 0));
        setWaterOld(String(lastInv.waterNew || 0));
        setElecNew(String(lastInv.electricityNew || 0));
        setWaterNew(String(lastInv.waterNew || 0));
      } else {
        setElecOld("0");
        setWaterOld("0");
        setElecNew("0");
        setWaterNew("0");
      }
    } else {
      setElecOld("0");
      setWaterOld("0");
      setElecNew("0");
      setWaterNew("0");
    }
  };

  const loadData = async () => {
    try {
      const [invoicesData, roomsData, contractsData] = await Promise.all([
        adminService.getInvoices(),
        adminService.getRooms(),
        adminService.getContracts(),
      ]);
      setInvoices(invoicesData);
      setRooms(roomsData);
      setContracts(contractsData);
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
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const roomContract = contracts.find(
      c => c.status === 1 && (typeof c.roomId === "string" ? c.roomId === selectedRoomId : c.roomId._id === selectedRoomId)
    );

    if (!roomContract) {
      Alert.alert("Lỗi", "Không tìm thấy hợp đồng có hiệu lực cho phòng này!");
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
      
      const electricityAmount = Math.max(0, Number(elecNew) - Number(elecOld)) * electricityPrice;
      const waterAmount = Math.max(0, Number(waterNew) - Number(waterOld)) * waterPrice;
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
        electricityOld: Number(elecOld),
        electricityNew: Number(elecNew),
        electricityPrice: electricityPrice,
        waterOld: Number(waterOld),
        waterNew: Number(waterNew),
        waterPrice: waterPrice,
        services: servicesFee,
        discount: 0,
        total: totalAmount,
        status: 1 // 1: Chưa thanh toán
      });
      Alert.alert("Thành công", "Tạo hóa đơn thành công!");
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Tạo hóa đơn thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return "Nháp";
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return "Chưa thanh toán";
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return "Đã thanh toán";
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return "Quá hạn";
    return "Chưa thanh toán";
  };

  const getStatusColor = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return COLORS.orange;
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return COLORS.red;
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return COLORS.green;
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return COLORS.muted;
    return COLORS.red;
  };

  const getStatusBg = (status: any) => {
    if (status === 0 || status === "DRAFT" || status === "Nháp") return COLORS.orangeSoft;
    if (status === 1 || status === "UNPAID" || status === "Chưa thanh toán") return "#FFF1F1";
    if (status === 2 || status === "PAID" || status === "Đã thanh toán") return "#EAF9F1";
    if (status === 3 || status === "OVERDUE" || status === "Quá hạn") return "#E8E9ED";
    return "#FFF1F1";
  };

  const handleRemind = async (invoiceId: string) => {
    try {
      await adminService.remindInvoice(invoiceId);
      Alert.alert("Thành công", "Đã gửi nhắc nhở và cập nhật trạng thái!");
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", "Gửi nhắc nhở thất bại!");
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const status = invoice.status as any;
    const isUnpaid = status === 1 || status === 0 || status === 3 || status === "UNPAID" || status === "DRAFT" || status === "OVERDUE" || status === "Chưa thanh toán" || status === "Nháp" || status === "Quá hạn";
    const isPaid = status === 2 || status === "PAID" || status === "Đã thanh toán";
    if (filter === "unpaid") return isUnpaid;
    if (filter === "paid") return isPaid;
    return true;
  });

  const occupiedRooms = rooms.filter(room => room.status === 1);

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
        <Text style={styles.title}>Quản lý hóa đơn</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.bulkButton} onPress={() => onNavigate && onNavigate("invoice_bulk")}>
            <Ionicons name="documents-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Hàng loạt</Text>
          </Pressable>
          <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="receipt" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Tạo</Text>
          </Pressable>
        </View>
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
          style={[styles.filterButton, filter === "unpaid" && styles.filterActive]}
          onPress={() => setFilter("unpaid")}
        >
          <Text style={[styles.filterText, filter === "unpaid" && styles.filterTextActive]}>Chưa thu</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === "paid" && styles.filterActive]}
          onPress={() => setFilter("paid")}
        >
          <Text style={[styles.filterText, filter === "paid" && styles.filterTextActive]}>Đã thu</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.roomCode}>Phòng {item.room || item.contractId?.roomId?.roomCode || "N/A"}</Text>
              <Text style={styles.invoicePeriod}>Kỳ hóa đơn: {item.period}</Text>
              <Text style={styles.invoiceAmount}>Tổng tiền: {item.totalAmount?.toLocaleString("vi-VN")}đ</Text>
              <Text style={styles.invoiceSub}>Khách thuê: {item.tenant || item.contractId?.tenantId?.fullName || "N/A"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
              </View>
              {((item.status as any) === 1 || (item.status as any) === "UNPAID" || (item.status as any) === "Chưa thanh toán") && (
                <Pressable
                  style={{ marginTop: 8, backgroundColor: COLORS.orange, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                  onPress={() => handleRemind(item._id)}
                >
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>Nhắc nhở</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      {/* Modal Tạo hóa đơn mới */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo hóa đơn tháng mới</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={(item) => String(item)}
              showsVerticalScrollIndicator={false}
              renderItem={() => (
                <View style={styles.form}>
                  <Text style={styles.label}>Chọn phòng đang thuê</Text>
                  <View style={styles.roomSelectGrid}>
                    {occupiedRooms.length === 0 ? (
                      <Text style={styles.noOccupiedText}>Không có phòng nào đang được thuê hiện tại!</Text>
                    ) : (
                      occupiedRooms.map((room) => (
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

                  <Text style={styles.label}>Kỳ hóa đơn (tháng/năm - MM/YYYY)</Text>
                  <TextInput
                    style={styles.input}
                    value={period}
                    onChangeText={setPeriod}
                    placeholder="MM/YYYY"
                  />

                  <Text style={styles.label}>Hạn thanh toán (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                  />

                  {/* Chỉ số điện */}
                  <View style={styles.indexRow}>
                    <View style={styles.indexCol}>
                      <Text style={styles.label}>Chỉ số điện Cũ</Text>
                      <TextInput
                        style={styles.input}
                        value={elecOld}
                        onChangeText={setElecOld}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.indexCol}>
                      <Text style={styles.label}>Chỉ số điện Mới</Text>
                      <TextInput
                        style={styles.input}
                        value={elecNew}
                        onChangeText={setElecNew}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Chỉ số nước */}
                  <View style={styles.indexRow}>
                    <View style={styles.indexCol}>
                      <Text style={styles.label}>Chỉ số nước Cũ</Text>
                      <TextInput
                        style={styles.input}
                        value={waterOld}
                        onChangeText={setWaterOld}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.indexCol}>
                      <Text style={styles.label}>Chỉ số nước Mới</Text>
                      <TextInput
                        style={styles.input}
                        value={waterNew}
                        onChangeText={setWaterNew}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Pressable
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleCreateInvoice}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>Tạo hóa đơn</Text>
                    )}
                  </Pressable>
                </View>
              )}
            />
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
    backgroundColor: "#1A4D2E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
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
  invoiceCard: {
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
  invoiceInfo: {
    flex: 1,
  },
  roomCode: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },
  invoicePeriod: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.orange,
    marginVertical: 4,
  },
  invoiceSub: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
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
  noOccupiedText: {
    fontSize: 13,
    color: COLORS.red,
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
