import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminRoom } from "../services/adminService";
import { apiClient } from "../services/apiClient";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import { formatCurrency, formatNumberInput, unformatNumber } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";

type Props = { params?: any };

export default function AdminRoomsScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const notification = useNotification();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "empty" | "occupied" | "repair">("all");
  const [selectedFloor, setSelectedFloor] = useState<"all" | number>("all");
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [roomCode, setRoomCode] = useState("");
  const [area, setArea] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [floor, setFloor] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<AdminRoom | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [meterModalVisible, setMeterModalVisible] = useState(false);
  const [meterReadings, setMeterReadings] = useState<Record<string, { electricity: string; water: string }>>({}); 

  const loadRooms = async () => {
    try { setRooms(await adminService.getRooms()); }
    catch (error) { console.log("Lỗi tải phòng:", error); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadRooms(); }, []);

  const handleBulkMeterReport = async () => {
    try {
      setSubmitting(true);
      const payload = Object.entries(meterReadings)
        .filter(([, data]) => data.electricity.trim() !== "" || data.water.trim() !== "")
        .map(([roomId, data]) => ({
          roomId,
          electricity: data.electricity ? unformatNumber(data.electricity) : undefined,
          water: data.water ? unformatNumber(data.water) : undefined,
        }));
      if (payload.length === 0) { notification.error("Vui lòng nhập ít nhất một chỉ số"); return; }
      const token = await authService.getToken();
      const response = await apiClient.post<{ success: boolean }>("/rooms/bulk-report-utility", { readings: payload }, token);
      if (response.success) {
        notification.success("Đã lưu chỉ số điện nước hàng loạt!");
        setMeterModalVisible(false);
        setMeterReadings({});
      }
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Có lỗi xảy ra!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomCode.trim() || !area.trim() || !rentPrice.trim() || !deposit.trim() || !Number.isInteger(Number(floor)) || Number(floor) < 1) {
      notification.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    try {
      setSubmitting(true);
      await adminService.createRoom({ roomCode: roomCode.trim(), area: area.trim(), defaultRentPrice: unformatNumber(rentPrice), defaultDeposit: unformatNumber(deposit), floor: Number(floor) });
      notification.success("Đã thêm phòng mới thành công!");
      setModalVisible(false);
      setRoomCode(""); setArea(""); setRentPrice(""); setDeposit(""); setFloor("1");
      void loadRooms();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Thêm phòng thất bại!");
    } finally { setSubmitting(false); }
  };

  const statusMeta = (status: number) => status === 0
    ? ["Trống", theme.positive, theme.positiveSoft]
    : status === 1
      ? ["Đang thuê", theme.warningForeground, theme.warningSoft]
      : ["Đang sửa", theme.danger, theme.warningSoft];
  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor || 1))].sort((a, b) => a - b), [rooms]);
  const filteredRooms = rooms.filter((room) => {
    const matchesStatus = filter === "empty" ? room.status === 0 : filter === "occupied" ? room.status === 1 : filter === "repair" ? room.status === 2 : true;
    return matchesStatus && (selectedFloor === "all" || (room.floor || 1) === selectedFloor);
  });
  const roomsByFloor = useMemo(() => floors.filter((value) => selectedFloor === "all" || value === selectedFloor).map((value) => ({ floor: value, rooms: filteredRooms.filter((room) => (room.floor || 1) === value) })).filter((group) => group.rooms.length), [floors, filteredRooms, selectedFloor]);
  if (loading) return <AppLoadingScreen />;

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={roomsByFloor}
        keyExtractor={(item) => String(item.floor)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <GradientHero icon="home-outline" label="DANH MỤC PHÒNG" value={`${rooms.length} phòng`} detail={`${rooms.filter((room) => room.status === 0).length} phòng đang trống`} />
          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Danh sách phòng trọ</Text>
              <Text style={[styles.sectionSub, { color: theme.muted }]}>Quản lý và theo dõi trạng thái từng phòng</Text>
            </View>
            <Pressable accessibilityRole="button" style={[styles.sectionBtn, { backgroundColor: theme.warningForeground }]} onPress={() => { setMeterReadings({}); setMeterModalVisible(true); }}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.sectionBtnText}>Chốt điện nước</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.sectionBtn, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.sectionBtnText}>Thêm phòng</Text>
            </Pressable>
          </View>
          <View style={styles.filters}>{(["all", "empty", "occupied", "repair"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[styles.filter, { backgroundColor: filter === value ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setFilter(value)}><Text style={[styles.filterText, { color: filter === value ? theme.primary : theme.muted }]}>{({ all: t("all"), empty: "Trống", occupied: "Đang thuê", repair: "Sửa chữa" })[value]}</Text></Pressable>)}</View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floorFilters}><Pressable accessibilityRole="button" accessibilityState={{ selected: selectedFloor === "all" }} style={[styles.filter, { backgroundColor: selectedFloor === "all" ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setSelectedFloor("all")}><Text style={[styles.filterText, { color: selectedFloor === "all" ? theme.primary : theme.muted }]}>{t("all")}</Text></Pressable>{floors.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selectedFloor === value }} style={[styles.filter, { backgroundColor: selectedFloor === value ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setSelectedFloor(value)}><Text style={[styles.filterText, { color: selectedFloor === value ? theme.primary : theme.muted }]}>{t("floor")} {value}</Text></Pressable>)}</ScrollView>
        </>}
        ListEmptyComponent={<IllustratedEmptyState kind="contract" title={rooms.length ? "Không có phòng phù hợp" : "Chưa có phòng trọ"} description={rooms.length ? "Hãy chọn bộ lọc khác." : "Thêm phòng đầu tiên để bắt đầu vận hành."} actionLabel={rooms.length ? undefined : "Thêm phòng"} actionIcon="add" onAction={rooms.length ? undefined : () => setModalVisible(true)} />}
        renderItem={({ item: group, index }) => (
          <View style={styles.floorGroup}>
            <Text style={[styles.floorTitle, { color: theme.text }]}>{t("floor").toUpperCase()} {group.floor}</Text>
            <View style={styles.roomGrid}>
              {group.rooms.map((item, roomIndex) => {
                const [label, color, background] = statusMeta(item.status);
                return <AnimatedEntry key={item._id} delay={Math.min(index + roomIndex, 6) * 45} style={styles.roomWrap}>
                  <Pressable accessibilityRole="button" style={[styles.card, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]} onPress={() => { setSelectedRoom(item); setDetailVisible(true); }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                      <View style={[styles.iconTile, { backgroundColor: theme.primarySoft }]}><Ionicons name="business-outline" size={22} color={theme.primary} /></View>
                      <View style={[styles.badge, { backgroundColor: background as string }]}><Text style={[styles.badgeText, { color: color as string }]}>{label}</Text></View>
                    </View>
                    <View style={styles.info}><Text style={[styles.roomCode, { color: theme.text }]}>{item.roomCode}</Text><Text style={[styles.sub, { color: theme.muted }]}>{item.area}</Text><Text style={[styles.sub, { color: theme.primary }]}>{formatCurrency(item.defaultRentPrice)}/th</Text></View>
                  </Pressable>
                </AnimatedEntry>;
              })}
            </View>
          </View>
        )}
      />

      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setDetailVisible(false); }}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Chi tiết phòng {selectedRoom?.roomCode}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng chi tiết phòng" onPress={() => setDetailVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
          {selectedRoom ? <View style={styles.detailBody}>{[[t("floor"), selectedRoom.floor || 1], ["Diện tích", selectedRoom.area], ["Giá thuê mặc định", `${formatCurrency(selectedRoom.defaultRentPrice)}/tháng`], ["Tiền cọc mặc định", formatCurrency(selectedRoom.defaultDeposit)], ["Trạng thái", statusMeta(selectedRoom.status)[0]]].map(([label, value]) => <View key={String(label)} style={[styles.detailRow, { backgroundColor: theme.background }]}><Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text><Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text></View>)}</View> : null}
        </View></View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} /><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Thêm phòng trọ mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thêm phòng" disabled={submitting} onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.field}><Text style={[styles.label, { color: theme.text }]}>Mã phòng (ví dụ: P.101)</Text><TextInput style={inputStyle} value={roomCode} onChangeText={setRoomCode} placeholder="Nhập mã phòng" placeholderTextColor={theme.muted} autoCapitalize="characters" /></View>
            <View style={styles.field}><Text style={[styles.label, { color: theme.text }]}>{t("floor")}</Text><TextInput style={inputStyle} value={floor} onChangeText={setFloor} placeholder="1" placeholderTextColor={theme.muted} keyboardType="number-pad" /></View>
            {[["Diện tích (ví dụ: 25m2)", area, setArea, "Nhập diện tích", "default"], ["Giá thuê mặc định (VNĐ)", rentPrice, (value: string) => setRentPrice(formatNumberInput(value)), "Nhập giá thuê", "numeric"], ["Tiền đặt cọc mặc định (VNĐ)", deposit, (value: string) => setDeposit(formatNumberInput(value)), "Nhập tiền đặt cọc", "numeric"]].map(([label, value, setter, placeholder, keyboard]) => <View key={label as string} style={styles.field}><Text style={[styles.label, { color: theme.text }]}>{label as string}</Text><TextInput style={inputStyle} value={value as string} onChangeText={setter as (text: string) => void} placeholder={placeholder as string} placeholderTextColor={theme.muted} keyboardType={keyboard as any} /></View>)}
            <AppButton icon="add-circle-outline" loading={submitting} onPress={handleAddRoom}>Thêm phòng</AppButton>
          </ScrollView>
        </View></KeyboardAvoidingView>
      </Modal>

      <Modal visible={meterModalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setMeterModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Chốt chỉ số điện nước</Text>
              <Pressable disabled={submitting} onPress={() => setMeterModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {rooms.filter(r => r.status === 1).length === 0 && (
                <Text style={{ color: theme.muted, textAlign: "center", marginVertical: 40 }}>Không có phòng đang thuê</Text>
              )}
              {rooms.filter(r => r.status === 1).map(room => (
                <View key={room._id} style={{ marginBottom: 14, padding: 12, backgroundColor: theme.background, borderRadius: 12 }}>
                  <Text style={{ fontWeight: "800", color: theme.text, marginBottom: 10 }}>Phòng: {room.roomCode}</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.muted }]}>Điện mới (kWh)</Text>
                      <TextInput style={inputStyle} keyboardType="numeric" placeholder="Số điện" placeholderTextColor={theme.muted}
                        value={meterReadings[room._id]?.electricity || ""}
                        onChangeText={(value) => setMeterReadings(prev => ({ ...prev, [room._id]: { ...prev[room._id], electricity: formatNumberInput(value), water: prev[room._id]?.water || "" } }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.muted }]}>Nước mới (m³)</Text>
                      <TextInput style={inputStyle} keyboardType="numeric" placeholder="Số nước" placeholderTextColor={theme.muted}
                        value={meterReadings[room._id]?.water || ""}
                        onChangeText={(value) => setMeterReadings(prev => ({ ...prev, [room._id]: { ...prev[room._id], water: formatNumberInput(value), electricity: prev[room._id]?.electricity || "" } }))}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <AppButton icon="save-outline" loading={submitting} onPress={handleBulkMeterReport}>Lưu tất cả</AppButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 36, gap: 10 },
  filters: { flexDirection: "row", gap: 7, marginVertical: 18 },
  floorFilters: { gap: 7, paddingBottom: 14 },
  floorGroup: { marginBottom: 18 },
  floorTitle: { fontSize: 14, fontWeight: "900", letterSpacing: .8, marginBottom: 10 },
  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roomWrap: { width: "48%" },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: "800" },
  card: { flex: 1, flexDirection: "column", alignItems: "flex-start", borderRadius: 22, padding: 14, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  iconTile: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginTop: 12 },
  roomCode: { fontSize: 17, fontWeight: "900" },
  sub: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontWeight: "900" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  detailBody: { gap: 8 },
  detailRow: { borderRadius: 16, padding: 14 },
  detailLabel: { fontSize: 12, fontWeight: "700" },
  detailValue: { fontSize: 15, fontWeight: "900", marginTop: 4 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 },
  sectionRow: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  sectionSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 5 },
  sectionBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
});
