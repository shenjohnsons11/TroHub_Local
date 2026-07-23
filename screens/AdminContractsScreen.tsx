import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { COLORS } from "../constants/theme";
import { adminService, AdminContract, AdminRoom, AdminTenant } from "../services/adminService";
import {
  defaultContractDates,
  displayDateToLocalDate,
  formatDisplayDateInput,
  parseDisplayToIso,
  resolveEndDateAfterStartChange,
  validateContractDateRange,
} from "../utils/contractDate";
type Props = {
  params?: any;
};

export default function AdminContractsScreen({ params }: Props) {
  const initialDates = defaultContractDates();
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
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [endDateWasEdited, setEndDateWasEdited] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  // Wizard states
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [services, setServices] = useState({
    electricity: { enabled: true, price: '3500' },
    water: { enabled: true, price: '25000' },
    trash: { enabled: true, price: '20000' },
    internet: { enabled: true, price: '100000' },
    management: { enabled: false, price: '50000' },
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

    const dateErrors = validateContractDateRange(startDate, endDate);
    const startDateIso = parseDisplayToIso(startDate);
    const endDateIso = parseDisplayToIso(endDate);
    if (Object.keys(dateErrors).length || !startDateIso || !endDateIso) {
      Alert.alert(
        "Ngày hợp đồng không hợp lệ",
        dateErrors.startDate ||
          dateErrors.endDate ||
          "Ngày phải đúng định dạng dd/mm/yyyy.",
      );
      setCurrentStep(2);
      return;
    }

    try {
      setSubmitting(true);
      await adminService.createContract({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate: startDateIso,
        endDate: endDateIso,
        fixedRentPrice: Number(fixedRent),
        fixedDeposit: Number(fixedDeposit),
      });
      Alert.alert("Thành công", "Tạo hợp đồng nháp thành công! Chờ người thuê ký xác nhận.");
      setModalVisible(false);
      setSelectedRoomId("");
      setSelectedTenantId("");
      setCurrentStep(1);
      setConfirmed(false);
      const nextDefaults = defaultContractDates();
      setStartDate(nextDefaults.startDate);
      setEndDate(nextDefaults.endDate);
      setEndDateWasEdited(false);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Tạo hợp đồng thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDatePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    const field = datePickerField;
    setDatePickerField(null);
    if (event.type === "dismissed" || !field || !selectedDate) return;
    const selectedDisplayDate = defaultContractDates(selectedDate).startDate;
    if (field === "startDate") {
      setStartDate(selectedDisplayDate);
      setEndDate((currentEndDate) =>
        resolveEndDateAfterStartChange(
          selectedDisplayDate,
          endDateWasEdited,
          currentEndDate,
        ),
      );
      return;
    }
    setEndDate(selectedDisplayDate);
    setEndDateWasEdited(true);
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

  const selectableRooms = rooms.filter(room => room.status === 0 || room.status === 1);

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
                <Text style={styles.tenantName}>Người thuê: {tenantName} ({tenantPhone !== "N/A" ? String(tenantPhone).replace(/\D/g, "").replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3").replace(/(\d{4})(\d+)/, "$1.$2") : "N/A"})</Text>
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

      {/* Modal Tạo hợp đồng mới (Wizard 4 Bước) */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.wizardContent}>
            {/* Header */}
            <View style={styles.wizardHeader}>
              <View>
                <Text style={styles.wizardTitle}>Tạo hợp đồng mới</Text>
                <Text style={styles.wizardSubtitle}>Hoàn tất 4 bước để lập hợp đồng thuê phòng.</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </Pressable>
            </View>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {[
                { num: 1, label: 'Người thuê', icon: 'person' },
                { num: 2, label: 'Chi tiết', icon: 'home' },
                { num: 3, label: 'Dịch vụ', icon: 'flash' },
                { num: 4, label: 'Xác nhận', icon: 'checkmark-circle' },
              ].map((step, index) => {
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                  <View key={step.num} style={styles.stepItemWrapper}>
                    <View style={styles.stepItem}>
                      <View style={[
                        styles.stepCircle,
                        isCompleted ? styles.stepCircleCompleted : isActive ? styles.stepCircleActive : styles.stepCircleInactive
                      ]}>
                        <Ionicons name={step.icon as any} size={14} color={isCompleted || isActive ? "#FFF" : COLORS.muted} />
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepLabelMini}>BƯỚC {step.num}</Text>
                        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
                      </View>
                    </View>
                    {index < 3 && (
                      <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Content */}
            <ScrollView style={styles.wizardBody} showsVerticalScrollIndicator={false}>

              {/* BƯỚC 1: NGƯỜI THUÊ */}
              {currentStep === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Người thuê</Text>
                    <Text style={styles.cardSubtitle}>Chọn người thuê đã có trên hệ thống để lập hợp đồng.</Text>

                    {tenants.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có người thuê nào trên hệ thống!</Text>
                    ) : (
                      <View style={styles.tenantSelectGrid}>
                        {tenants.map((t) => (
                          <Pressable
                            key={t._id}
                            style={[
                              styles.tenantSelectItem,
                              selectedTenantId === t._id && styles.tenantSelectActive
                            ]}
                            onPress={() => setSelectedTenantId(t._id)}
                          >
                            <Text style={[
                              styles.tenantSelectText,
                              selectedTenantId === t._id && styles.tenantSelectTextActive
                            ]}>
                              {t.fullName}
                            </Text>
                            <Text style={styles.tenantPhoneText}>{t.phone}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* BƯỚC 2: CHI TIẾT THUÊ */}
              {currentStep === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Phòng thuê</Text>
                    <Text style={styles.cardSubtitle}>Chọn phòng còn trống để lập hợp đồng.</Text>

                    {selectableRooms.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có phòng nào có thể chọn!</Text>
                    ) : (
                      <View style={styles.roomSelectGrid}>
                        {selectableRooms.map((room) => (
                          <Pressable
                            key={room._id}
                            style={[
                              styles.roomSelectItem,
                              selectedRoomId === room._id && styles.roomSelectActive
                            ]}
                            onPress={() => handleSelectRoom(room._id)}
                          >
                            <Text style={[
                              styles.roomSelectText,
                              selectedRoomId === room._id && styles.roomSelectTextActive
                            ]}>
                              {room.roomCode}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Điều khoản thuê</Text>

                    <View style={styles.inputGroupRow}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Giá thuê (VNĐ/tháng) <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={fixedRent} onChangeText={setFixedRent} keyboardType="numeric" placeholder="VD: 3500000" />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Tiền cọc (VNĐ) <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={fixedDeposit} onChangeText={setFixedDeposit} keyboardType="numeric" placeholder="VD: 3500000" />
                      </View>
                    </View>

                    <View style={styles.inputGroupRow}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Ngày bắt đầu <Text style={styles.required}>*</Text></Text>
                        <View style={styles.dateInputContainer}>
                          <TextInput
                            style={styles.dateInput}
                            value={startDate}
                            onChangeText={(value) => {
                              const nextStartDate = formatDisplayDateInput(value);
                              setStartDate(nextStartDate);
                              setEndDate((currentEndDate) =>
                                resolveEndDateAfterStartChange(
                                  nextStartDate,
                                  endDateWasEdited,
                                  currentEndDate,
                                ),
                              );
                            }}
                            keyboardType="number-pad"
                            maxLength={10}
                            placeholder="dd/mm/yyyy"
                          />
                          <Pressable
                            accessibilityLabel="Mở lịch chọn ngày bắt đầu"
                            hitSlop={8}
                            onPress={() => setDatePickerField("startDate")}
                            style={styles.datePickerButton}
                          >
                            <Ionicons name="calendar-outline" size={19} color={COLORS.orange} />
                          </Pressable>
                        </View>
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Ngày kết thúc <Text style={styles.required}>*</Text></Text>
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
                          />
                          <Pressable
                            accessibilityLabel="Mở lịch chọn ngày kết thúc"
                            hitSlop={8}
                            onPress={() => setDatePickerField("endDate")}
                            style={styles.datePickerButton}
                          >
                            <Ionicons name="calendar-outline" size={19} color={COLORS.orange} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    {datePickerField ? (
                      <DateTimePicker
                        value={
                          displayDateToLocalDate(
                            datePickerField === "startDate"
                              ? startDate
                              : endDate,
                          ) || new Date()
                        }
                        mode="date"
                        display="default"
                        onChange={handleDatePickerChange}
                      />
                    ) : null}
                  </View>
                </View>
              )}

              {/* BƯỚC 3: DỊCH VỤ */}
              {currentStep === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Dịch vụ & tiện ích</Text>
                    <Text style={styles.cardSubtitle}>Bật các dịch vụ áp dụng cho hợp đồng này và điều chỉnh đơn giá.</Text>

                    {[
                      { key: 'electricity', label: 'Điện', desc: 'Tính theo số điện', unit: 'VNĐ/kWh' },
                      { key: 'water', label: 'Nước', desc: 'Tính theo người/khối', unit: 'VNĐ' },
                      { key: 'trash', label: 'Rác', desc: 'Phí thu gom', unit: 'VNĐ/tháng' },
                      { key: 'internet', label: 'Internet', desc: 'Wi-Fi', unit: 'VNĐ/tháng' },
                      { key: 'management', label: 'Phí quản lý', desc: 'Vệ sinh chung', unit: 'VNĐ/tháng' },
                    ].map(svc => {
                      const service = services[svc.key as keyof typeof services];
                      return (
                        <View key={svc.key} style={[styles.serviceItem, service.enabled && styles.serviceItemActive]}>
                          <View style={styles.serviceHeader}>
                            <View>
                              <Text style={styles.serviceLabel}>{svc.label}</Text>
                              <Text style={styles.serviceDesc}>{svc.desc}</Text>
                            </View>
                            <Switch
                              value={service.enabled}
                              onValueChange={(val) => setServices({...services, [svc.key]: {...service, enabled: val}})}
                              trackColor={{ false: "#E8E9ED", true: COLORS.orange }}
                            />
                          </View>
                          <View style={styles.serviceInputRow}>
                            <TextInput
                              style={[styles.input, !service.enabled && styles.inputDisabled, { flex: 1, height: 36 }]}
                              value={service.price}
                              onChangeText={(text) => setServices({...services, [svc.key]: {...service, price: text}})}
                              editable={service.enabled}
                              keyboardType="numeric"
                            />
                            <Text style={styles.serviceUnit}>{svc.unit}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* BƯỚC 4: XÁC NHẬN */}
              {currentStep === 4 && (
                <View style={styles.stepContent}>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTag}>BẢN XEM TRƯỚC HỢP ĐỒNG</Text>

                    <View style={styles.previewSection}>
                      <Text style={styles.previewSectionTitle}>NGƯỜI THUÊ</Text>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Họ tên</Text>
                        <Text style={styles.previewValue}>{tenants.find(t => t._id === selectedTenantId)?.fullName || "Chưa chọn"}</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Điện thoại</Text>
                        <Text style={styles.previewValue}>{tenants.find(t => t._id === selectedTenantId)?.phone || "Chưa chọn"}</Text>
                      </View>
                    </View>

                    <View style={styles.previewSection}>
                      <Text style={styles.previewSectionTitle}>CHI TIẾT THUÊ</Text>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Phòng</Text>
                        <Text style={styles.previewValue}>{rooms.find(r => r._id === selectedRoomId)?.roomCode || "Chưa chọn"}</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Giá thuê</Text>
                        <Text style={styles.previewValue}>{Number(fixedRent || 0).toLocaleString('vi-VN')}đ/tháng</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Tiền cọc</Text>
                        <Text style={styles.previewValue}>{Number(fixedDeposit || 0).toLocaleString('vi-VN')}đ</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Thời hạn</Text>
                        <Text style={styles.previewValue}>{startDate} → {endDate}</Text>
                      </View>
                    </View>
                  </View>

                  <Pressable style={styles.confirmCheckbox} onPress={() => setConfirmed(!confirmed)}>
                    <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                      {confirmed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <View>
                      <Text style={styles.confirmTitle}>Tôi xác nhận thông tin chính xác</Text>
                      <Text style={styles.confirmDesc}>Hợp đồng nháp sẽ được tạo và chờ người thuê duyệt.</Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.wizardFooter}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <View style={styles.footerActions}>
                {currentStep > 1 && (
                  <Pressable style={styles.backBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
                    <Ionicons name="chevron-back" size={16} color={COLORS.text} />
                    <Text style={styles.backBtnText}>Quay lại</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[
                    styles.nextBtn,
                    (currentStep === 4 && !confirmed) && styles.nextBtnDisabled,
                    submitting && styles.nextBtnDisabled
                  ]}
                  onPress={() => {
                    if (currentStep < 4) setCurrentStep(prev => prev + 1);
                    else handleCreateContract();
                  }}
                  disabled={(currentStep === 4 && !confirmed) || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.nextBtnText}>{currentStep < 4 ? 'Tiếp tục' : 'Tạo hợp đồng'}</Text>
                  )}
                </Pressable>
              </View>
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
    backgroundColor: "#F4F5F7",
    justifyContent: "flex-start",
    paddingTop: 45, // Safe area for iOS
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
  dateInputContainer: {
    width: "100%",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
  },
  dateInput: {
    flex: 1,
    height: 44,
    paddingLeft: 12,
    paddingRight: 4,
    fontSize: 14,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  datePickerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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

  wizardContent: {
    backgroundColor: "#F4F5F7",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  wizardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  wizardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
    justifyContent: "space-between",
  },
  stepItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stepItem: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  stepCircleInactive: {
    borderColor: "#E8E9ED",
  },
  stepCircleActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange,
  },
  stepCircleCompleted: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange,
  },
  stepTextContainer: {
    alignItems: "center",
    marginTop: 8,
    position: "absolute",
    top: 36,
    width: 80,
  },
  stepLabelMini: {
    color: COLORS.muted,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
  },
  stepLabelActive: {
    color: COLORS.orange,
    fontWeight: "800",
  },
  stepLine: {
    position: "absolute",
    top: 15,
    left: "50%",
    width: "100%",
    height: 3,
    backgroundColor: "#E8E9ED",
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.orange,
  },
  wizardBody: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E9ED",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  inputGroupRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  required: {
    color: COLORS.red,
  },
  serviceItem: {
    borderWidth: 1,
    borderColor: "#E8E9ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  serviceItemActive: {
    borderColor: COLORS.orangeSoft,
    backgroundColor: COLORS.orangeSoft,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  serviceDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  serviceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputDisabled: {
    backgroundColor: "#F4F5F7",
    color: COLORS.muted,
  },
  serviceUnit: {
    fontSize: 12,
    color: COLORS.muted,
    width: 80,
  },
  previewCard: {
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 106, 33, 0.2)',
    marginBottom: 20,
  },
  previewTag: {
    fontSize: 11,
    color: COLORS.orange,
    fontWeight: "800",
    marginBottom: 12,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewSectionTitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "800",
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  previewLabel: {
    width: 90,
    fontSize: 13,
    color: COLORS.muted,
  },
  previewValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  confirmCheckbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  confirmDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
  wizardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E9ED",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E9ED",
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 4,
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tenantPhoneText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
