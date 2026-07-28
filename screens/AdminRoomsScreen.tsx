import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminRoom } from "../services/adminService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";

type Props = { params?: any };

export default function AdminRoomsScreen({ params }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "empty" | "occupied" | "repair">("all");
  const [modalVisible, setModalVisible] = useState(params?.action === "create");
  const [roomCode, setRoomCode] = useState("");
  const [area, setArea] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<AdminRoom | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadRooms = async () => {
    try { setRooms(await adminService.getRooms()); }
    catch (error) { console.log("Lỗi tải phòng:", error); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadRooms(); }, []);

  const handleAddRoom = async () => {
    if (!roomCode.trim() || !area.trim() || !rentPrice.trim() || !deposit.trim()) {
      notification.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    try {
      setSubmitting(true);
      await adminService.createRoom({ roomCode: roomCode.trim(), area: area.trim(), defaultRentPrice: Number(rentPrice), defaultDeposit: Number(deposit) });
      notification.success("Đã thêm phòng mới thành công!");
      setModalVisible(false);
      setRoomCode(""); setArea(""); setRentPrice(""); setDeposit("");
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
  const filteredRooms = rooms.filter((room) => filter === "empty" ? room.status === 0 : filter === "occupied" ? room.status === 1 : filter === "repair" ? room.status === 2 : true);
  if (loading) return <AppLoadingScreen />;

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <GradientHero icon="home-outline" label="DANH MỤC PHÒNG" value={`${rooms.length} phòng`} detail={`${rooms.filter((room) => room.status === 0).length} phòng đang trống`} actionLabel="Thêm phòng" actionIcon="add" onAction={() => setModalVisible(true)} />
          <View style={styles.filters}>{(["all", "empty", "occupied", "repair"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[styles.filter, { backgroundColor: filter === value ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setFilter(value)}><Text style={[styles.filterText, { color: filter === value ? theme.primary : theme.muted }]}>{({ all: "Tất cả", empty: "Trống", occupied: "Đang thuê", repair: "Sửa chữa" })[value]}</Text></Pressable>)}</View>
        </>}
        ListEmptyComponent={<IllustratedEmptyState kind="contract" title={rooms.length ? "Không có phòng phù hợp" : "Chưa có phòng trọ"} description={rooms.length ? "Hãy chọn bộ lọc khác." : "Thêm phòng đầu tiên để bắt đầu vận hành."} actionLabel={rooms.length ? undefined : "Thêm phòng"} actionIcon="add" onAction={rooms.length ? undefined : () => setModalVisible(true)} />}
        renderItem={({ item, index }) => {
          const [label, color, background] = statusMeta(item.status);
          return <AnimatedEntry delay={Math.min(index, 6) * 45}><Pressable accessibilityRole="button" style={[styles.card, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]} onPress={() => { setSelectedRoom(item); setDetailVisible(true); }}><View style={[styles.iconTile, { backgroundColor: theme.primarySoft }]}><Ionicons name="business-outline" size={22} color={theme.primary} /></View><View style={styles.info}><Text style={[styles.roomCode, { color: theme.text }]}>{item.roomCode}</Text><Text style={[styles.sub, { color: theme.muted }]}>{item.area} · {item.defaultRentPrice.toLocaleString("vi-VN")}đ/tháng</Text></View><View style={[styles.badge, { backgroundColor: background as string }]}><Text style={[styles.badgeText, { color: color as string }]}>{label}</Text></View></Pressable></AnimatedEntry>;
        }}
      />

      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setDetailVisible(false); }}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Chi tiết phòng {selectedRoom?.roomCode}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng chi tiết phòng" onPress={() => setDetailVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
          {selectedRoom ? <View style={styles.detailBody}>{[["Diện tích", selectedRoom.area], ["Giá thuê mặc định", `${selectedRoom.defaultRentPrice.toLocaleString("vi-VN")}đ/tháng`], ["Tiền cọc mặc định", `${selectedRoom.defaultDeposit.toLocaleString("vi-VN")}đ`], ["Trạng thái", statusMeta(selectedRoom.status)[0]]].map(([label, value]) => <View key={label} style={[styles.detailRow, { backgroundColor: theme.background }]}><Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text><Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text></View>)}</View> : null}
        </View></View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} /><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Thêm phòng trọ mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thêm phòng" disabled={submitting} onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.field}><Text style={[styles.label, { color: theme.text }]}>Mã phòng (ví dụ: P.101)</Text><TextInput style={inputStyle} value={roomCode} onChangeText={setRoomCode} placeholder="Nhập mã phòng" placeholderTextColor={theme.muted} autoCapitalize="characters" /></View>
            {[["Diện tích (ví dụ: 25m2)", area, setArea, "Nhập diện tích", "default"], ["Giá thuê mặc định (VNĐ)", rentPrice, setRentPrice, "Nhập giá thuê", "numeric"], ["Tiền đặt cọc mặc định (VNĐ)", deposit, setDeposit, "Nhập tiền đặt cọc", "numeric"]].map(([label, value, setter, placeholder, keyboard]) => <View key={label as string} style={styles.field}><Text style={[styles.label, { color: theme.text }]}>{label as string}</Text><TextInput style={inputStyle} value={value as string} onChangeText={setter as (text: string) => void} placeholder={placeholder as string} placeholderTextColor={theme.muted} keyboardType={keyboard as any} /></View>)}
            <AppButton icon="add-circle-outline" loading={submitting} onPress={handleAddRoom}>Thêm phòng</AppButton>
          </ScrollView>
        </View></KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 36, gap: 10 },
  filters: { flexDirection: "row", gap: 7, marginVertical: 18 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  iconTile: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginLeft: 12 },
  roomCode: { fontSize: 17, fontWeight: "900" },
  sub: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: "900" },
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
});
