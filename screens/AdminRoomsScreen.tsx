import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminRoom } from "../services/adminService";
import { apiClient } from "../services/apiClient";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import MeterCameraModal from "../components/MeterCameraModal";
import { formatCurrency, formatMeterReading, formatNumberInput, parseMeterReading, unformatNumber } from "../utils/formatters";
import { useLanguage } from "../contexts/LanguageContext";
import { applyMeterReading, type MeterType } from "../utils/meterReadingTarget";

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
  const [editingRoom, setEditingRoom] = useState<AdminRoom | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [area, setArea] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [floor, setFloor] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [meterModalVisible, setMeterModalVisible] = useState(false);
  const [meterReadings, setMeterReadings] = useState<Record<string, { electricity: string; water: string }>>({}); 
  const [scanTarget, setScanTarget] = useState<{ roomId: string; roomCode: string; meterType: MeterType } | null>(null);

  const loadRooms = async () => {
    try { 
      setRooms(await adminService.getRooms()); 
    } catch (error) { 
      console.log("Lỗi tải phòng:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    void loadRooms(); 
  }, []);

  const handleBulkMeterReport = async () => {
    try {
      setSubmitting(true);
      const utilities = Object.entries(meterReadings)
        .filter(([, data]) => data.electricity.trim() !== "" || data.water.trim() !== "")
        .map(([roomId, data]) => ({
          roomId,
          draftElectricity: data.electricity ? parseMeterReading(data.electricity) ?? undefined : undefined,
          draftWater: data.water ? parseMeterReading(data.water) ?? undefined : undefined,
        }));
      if (utilities.length === 0) { notification.error(t("mobile.rooms.requiredMeter")); return; }
      const token = await authService.getToken();
      const response = await apiClient.post<{ success: boolean }>("/rooms/bulk-report-utility", { utilities }, token);
      if (response.success) {
        notification.success(t("mobile.rooms.meterSaved"));
        setMeterModalVisible(false);
        setMeterReadings({});
      }
    } catch (error) {
      notification.error(error instanceof Error ? error.message : t("mobile.rooms.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomCode("");
    setArea("");
    setRentPrice("");
    setDeposit("");
    setFloor("1");
    setModalVisible(true);
  };

  const openEditRoom = (room: AdminRoom) => {
    setEditingRoom(room);
    setRoomCode(room.roomCode);
    setFloor(String(room.floor || 1));
    setArea(room.area);
    setRentPrice(formatNumberInput(room.defaultRentPrice));
    setDeposit(formatNumberInput(room.defaultDeposit));
    setModalVisible(true);
  };

  const handleSaveRoom = async () => {
    if (!roomCode.trim() || !area.trim() || !rentPrice.trim() || !deposit.trim() || !Number.isInteger(Number(floor)) || Number(floor) < 1) {
      notification.error(t("mobile.rooms.required"));
      return;
    }
    try {
      setSubmitting(true);
      if (editingRoom) {
        await adminService.updateRoom(editingRoom._id, {
          roomCode: roomCode.trim(),
          area: area.trim(),
          defaultRentPrice: unformatNumber(rentPrice),
          defaultDeposit: unformatNumber(deposit),
          floor: Number(floor),
        });
        notification.success("Cập nhật phòng thành công!");
      } else {
        await adminService.createRoom({ 
          roomCode: roomCode.trim(), 
          area: area.trim(), 
          defaultRentPrice: unformatNumber(rentPrice), 
          defaultDeposit: unformatNumber(deposit), 
          floor: Number(floor) 
        });
        notification.success(t("mobile.rooms.created") || "Thêm phòng thành công!");
      }
      setModalVisible(false);
      setEditingRoom(null);
      setRoomCode(""); setArea(""); setRentPrice(""); setDeposit(""); setFloor("1");
      void loadRooms();
    } catch (error) {
      notification.error(error instanceof Error ? error.message : (editingRoom ? "Lỗi cập nhật phòng" : t("mobile.rooms.createFailed")));
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDeleteRoom = (room: AdminRoom) => {
    if (room.status === 1) {
      notification.error("Không thể xóa phòng đang có người thuê!");
      return;
    }
    Alert.alert(
      "Xóa phòng",
      `Bạn có chắc chắn muốn xóa phòng ${room.roomCode}?`,
      [
        { text: t("common.cancel") || "Hủy", style: "cancel" },
        {
          text: t("common.delete") || "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await adminService.deleteRoom(room._id);
              notification.success("Đã xóa phòng thành công!");
              void loadRooms();
            } catch (error) {
              notification.error(error instanceof Error ? error.message : "Không thể xóa phòng.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleQuickStatus = (room: AdminRoom) => {
    Alert.alert(
      `Trạng thái phòng ${room.roomCode}`,
      "Cập nhật trạng thái:",
      [
        {
          text: "✅ Trống (Sẵn sàng cho thuê)",
          onPress: async () => {
            try {
              await adminService.updateRoom(room._id, { status: 0 });
              notification.success("Đã chuyển sang Trống!");
              void loadRooms();
            } catch (e: any) {
              notification.error(e.message || "Lỗi cập nhật trạng thái");
            }
          },
        },
        {
          text: "🏠 Đang thuê",
          onPress: async () => {
            try {
              await adminService.updateRoom(room._id, { status: 1 });
              notification.success("Đã chuyển sang Đang thuê!");
              void loadRooms();
            } catch (e: any) {
              notification.error(e.message || "Lỗi cập nhật trạng thái");
            }
          },
        },
        {
          text: "🔧 Bảo trì / Sửa chữa",
          onPress: async () => {
            try {
              await adminService.updateRoom(room._id, { status: 2 });
              notification.success("Đã chuyển sang Bảo trì!");
              void loadRooms();
            } catch (e: any) {
              notification.error(e.message || "Lỗi cập nhật trạng thái");
            }
          },
        },
        { text: t("common.cancel") || "Hủy", style: "cancel" },
      ]
    );
  };

  const statusMeta = (status: number) => status === 0
    ? [t("mobile.rooms.available") || "Trống", theme.positive, theme.positiveSoft]
    : status === 1
      ? [t("mobile.rooms.occupied") || "Đang thuê", theme.primary, theme.primarySoft]
      : [t("mobile.rooms.repair") || "Bảo trì", theme.danger, theme.warningSoft];

  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor || 1))].sort((a, b) => a - b), [rooms]);
  const filteredRooms = rooms.filter((room) => {
    const matchesStatus = filter === "empty" ? room.status === 0 : filter === "occupied" ? room.status === 1 : filter === "repair" ? room.status === 2 : true;
    return matchesStatus && (selectedFloor === "all" || (room.floor || 1) === selectedFloor);
  });
  const roomsByFloor = useMemo(() => floors.filter((value) => selectedFloor === "all" || value === selectedFloor).map((value) => ({ floor: value, rooms: filteredRooms.filter((room) => (room.floor || 1) === value) })).filter((group) => group.rooms.length), [floors, filteredRooms, selectedFloor]);
  
  if (loading) return <ContentSkeleton rows={4} />;

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={roomsByFloor}
        keyExtractor={(item) => String(item.floor)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <GradientHero icon="home-outline" label={t("mobile.rooms.heroLabel")} value={t("mobile.rooms.heroValue", { count: rooms.length })} detail={t("mobile.rooms.heroDetail", { count: rooms.filter((room) => room.status === 0).length })} />
          <View style={styles.headingRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText style={[styles.title, { color: theme.text }]}>{t("mobile.rooms.listTitle")}</AppText>
              <AppText style={[styles.subtitle, { color: theme.muted }]}>{t("mobile.rooms.listSubtitle")}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={openAddRoom}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.background} />
              <AppText style={[styles.addButtonText, { color: theme.background }]}>{t("mobile.rooms.add") || "Thêm phòng"}</AppText>
            </Pressable>
          </View>
          <View style={styles.subActionBar}>
            <Pressable
              accessibilityRole="button"
              style={[styles.toolBtn, { backgroundColor: theme.primarySoft }]}
              onPress={() => { setMeterReadings({}); setMeterModalVisible(true); }}
            >
              <Ionicons name="flash-outline" size={16} color={theme.primary} />
              <AppText style={[styles.toolBtnText, { color: theme.primary }]}>{t("mobile.rooms.recordMeter")}</AppText>
            </Pressable>
          </View>
          <View style={styles.filters}>
            {(["all", "empty", "occupied", "repair"] as const).map((value) => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[styles.filter, { backgroundColor: filter === value ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setFilter(value)}>
                <AppText style={[styles.filterText, { color: filter === value ? theme.primary : theme.muted }]}>
                  {({ all: t("common.all"), empty: t("mobile.rooms.available") || "Trống", occupied: t("mobile.rooms.occupied") || "Đang thuê", repair: t("mobile.rooms.repair") || "Bảo trì" })[value]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floorFilters}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedFloor === "all" }} style={[styles.filter, { backgroundColor: selectedFloor === "all" ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setSelectedFloor("all")}>
              <AppText style={[styles.filterText, { color: selectedFloor === "all" ? theme.primary : theme.muted }]}>{t("common.all")}</AppText>
            </Pressable>
            {floors.map((value) => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selectedFloor === value }} style={[styles.filter, { backgroundColor: selectedFloor === value ? theme.primarySoft : theme.surfaceElevated }]} onPress={() => setSelectedFloor(value)}>
                <AppText style={[styles.filterText, { color: selectedFloor === value ? theme.primary : theme.muted }]}>{t("common.floor", { number: value })}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </>}
        ListEmptyComponent={<IllustratedEmptyState kind="contract" title={rooms.length ? t("mobile.rooms.noMatch") : t("mobile.rooms.empty")} description={rooms.length ? t("mobile.rooms.tryFilter") : t("mobile.rooms.addFirst")} actionLabel={rooms.length ? undefined : t("mobile.rooms.add")} actionIcon="add" onAction={rooms.length ? undefined : openAddRoom} />}
        renderItem={({ item: group, index }) => (
          <View style={styles.floorGroup}>
            <View style={styles.floorHeader}>
              <AppText style={[styles.floorTitle, { color: theme.text }]}>
                {t("common.floor", { number: group.floor }).toUpperCase()}
              </AppText>
              <AppText style={[styles.floorCount, { color: theme.muted }]}>
                {group.rooms.length} {t("nav.rooms") || "phòng"}
              </AppText>
            </View>

            <View style={styles.roomList}>
              {group.rooms.map((item, roomIndex) => {
                const [label, color, background] = statusMeta(item.status);
                return (
                  <AnimatedEntry key={item._id} delay={Math.min(index + roomIndex, 6) * 45} style={styles.roomCardWrap}>
                    <View style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, shadowColor: theme.text }]}>
                      {/* Top row: PHÒNG / roomCode / statusBadge / settings */}
                      <View style={styles.cardHeader}>
                        <View>
                          <AppText style={[styles.roomEyebrow, { color: theme.muted }]}>
                            {t("common.room")?.toUpperCase() || "PHÒNG"}
                          </AppText>
                          <AppText style={[styles.roomCode, { color: theme.text }]}>
                            {item.roomCode}
                          </AppText>
                        </View>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: background as string }]}>
                            <AppText style={[styles.badgeText, { color: color as string }]}>
                              {label}
                            </AppText>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Đổi trạng thái"
                            style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={() => handleQuickStatus(item)}
                          >
                            <Ionicons name="settings-outline" size={14} color={theme.text} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Reserved banner if applicable */}
                      {item.reservedFrom ? (
                        <View style={[styles.reservedBanner, { backgroundColor: "rgba(14, 165, 233, 0.1)" }]}>
                          <AppText style={[styles.reservedText, { color: "#0284c7" }]}>
                            🔵 {t("rooms.reservedFrom") || "Đã cọc từ"} {new Date(item.reservedFrom).toLocaleDateString()}
                          </AppText>
                        </View>
                      ) : null}

                      {/* Highlight Price Box */}
                      <View style={[styles.priceBox, { backgroundColor: theme.primarySoft }]}>
                        <AppText style={[styles.priceLabel, { color: theme.muted }]}>
                          {t("rooms.price") || "Giá thuê hàng tháng"}
                        </AppText>
                        <AppText style={[styles.priceValue, { color: theme.primary }]}>
                          {formatCurrency(item.defaultRentPrice)}
                        </AppText>
                      </View>

                      {/* Details row: Tầng & Diện tích · Người thuê */}
                      <View style={styles.detailsRow}>
                        <View style={styles.detailCol}>
                          <AppText style={[styles.detailMetaLabel, { color: theme.muted }]}>
                            {t("rooms.floor") || "Tầng"}
                          </AppText>
                          <AppText style={[styles.detailMetaVal, { color: theme.text }]}>
                            {t("common.floor", { number: item.floor || 1 })}
                          </AppText>
                        </View>
                        <View style={[styles.detailCol, { alignItems: "flex-end" }]}>
                          <AppText style={[styles.detailMetaLabel, { color: theme.muted }]}>
                            {t("rooms.area") || "Diện tích"} (m²) · {t("common.tenant") || "Người thuê"}
                          </AppText>
                          <AppText style={[styles.detailMetaVal, { color: theme.text }]} numberOfLines={1}>
                            {item.area} m² · {item.tenant || t("common.unspecified") || "Chưa có người thuê"}
                          </AppText>
                        </View>
                      </View>

                      {/* Actions row: Chỉnh sửa & Xóa */}
                      <View style={styles.actionsRow}>
                        <Pressable
                          accessibilityRole="button"
                          style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => openEditRoom(item)}
                        >
                          <Ionicons name="create-outline" size={14} color={theme.text} />
                          <AppText style={[styles.actionBtnText, { color: theme.text }]}>
                            {t("common.edit") || "Chỉnh sửa"}
                          </AppText>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => handleDeleteRoom(item)}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.danger} />
                          <AppText style={[styles.actionBtnText, { color: theme.danger }]}>
                            {t("common.delete") || "Xóa"}
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  </AnimatedEntry>
                );
              })}
            </View>
          </View>
        )}
      />

      {/* Modal Thêm mới / Chỉnh sửa phòng */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>
                {editingRoom ? `Chỉnh sửa phòng ${editingRoom.roomCode}` : (t("mobile.rooms.newTitle") || "Thêm phòng mới")}
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.rooms.closeNew")} disabled={submitting} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={26} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.rooms.roomCode")}</AppText>
                <AppTextInput style={inputStyle} value={roomCode} onChangeText={setRoomCode} placeholder={t("mobile.rooms.roomCodePlaceholder")} placeholderTextColor={theme.muted} autoCapitalize="characters" />
              </View>
              <View style={styles.field}>
                <AppText style={[styles.label, { color: theme.text }]}>{t("common.floor", { number: "" })}</AppText>
                <AppTextInput style={inputStyle} value={floor} onChangeText={setFloor} placeholder="1" placeholderTextColor={theme.muted} keyboardType="number-pad" />
              </View>
              <View style={styles.field}>
                <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.rooms.areaInput")}</AppText>
                <AppTextInput style={inputStyle} value={area} onChangeText={setArea} placeholder={t("mobile.rooms.areaPlaceholder")} placeholderTextColor={theme.muted} />
              </View>
              <View style={styles.field}>
                <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.rooms.rentInput")}</AppText>
                <AppTextInput style={inputStyle} value={rentPrice} onChangeText={(val) => setRentPrice(formatNumberInput(val))} placeholder={t("mobile.rooms.rentPlaceholder")} placeholderTextColor={theme.muted} keyboardType="numeric" />
              </View>
              <View style={styles.field}>
                <AppText style={[styles.label, { color: theme.text }]}>{t("mobile.rooms.depositInput")}</AppText>
                <AppTextInput style={inputStyle} value={deposit} onChangeText={(val) => setDeposit(formatNumberInput(val))} placeholder={t("mobile.rooms.depositPlaceholder")} placeholderTextColor={theme.muted} keyboardType="numeric" />
              </View>
              <AppButton icon={editingRoom ? "save-outline" : "add-circle-outline"} loading={submitting} onPress={handleSaveRoom}>
                {editingRoom ? "Lưu thay đổi" : (t("mobile.rooms.add") || "Thêm phòng")}
              </AppButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal chốt chỉ số điện nước hàng loạt */}
      <Modal visible={meterModalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setMeterModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>{t("mobile.rooms.meterTitle")}</AppText>
              <Pressable disabled={submitting} onPress={() => setMeterModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {rooms.filter(r => r.status === 1).length === 0 && (
                <AppText style={{ color: theme.muted, textAlign: "center", marginVertical: 40 }}>{t("mobile.rooms.noOccupied")}</AppText>
              )}
              {rooms.filter(r => r.status === 1).map(room => (
                <View key={room._id} style={{ marginBottom: 14, padding: 12, backgroundColor: theme.background, borderRadius: 12 }}>
                  <View style={styles.meterCardHeader}><AppText style={{ fontWeight: "800", color: theme.text }}>{t("mobile.rooms.room", { roomCode: room.roomCode })}</AppText><Pressable accessibilityRole="button" accessibilityLabel={t("mobile.rooms.scanMeter", { roomCode: room.roomCode })} disabled={submitting} onPress={() => setScanTarget({ roomId: room._id, roomCode: room.roomCode, meterType: "electricity" })} style={[styles.scanMeterButton, { backgroundColor: theme.primarySoft }]}><Ionicons name="camera-outline" size={15} color={theme.primary} /><AppText style={[styles.scanMeterText, { color: theme.primary }]}>{t("mobile.rooms.scan")}</AppText></Pressable></View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.label, { color: theme.muted }]}>{t("mobile.rooms.newElectricity")}</AppText>
                      <AppTextInput style={inputStyle} keyboardType="decimal-pad" placeholder={t("mobile.rooms.electricityPlaceholder")} placeholderTextColor={theme.muted}
                        value={meterReadings[room._id]?.electricity || ""}
                        onChangeText={(value) => setMeterReadings(prev => ({ ...prev, [room._id]: { ...prev[room._id], electricity: parseMeterReading(value) === null ? value : formatMeterReading(value), water: prev[room._id]?.water || "" } }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.label, { color: theme.muted }]}>{t("mobile.rooms.newWater")}</AppText>
                      <AppTextInput style={inputStyle} keyboardType="decimal-pad" placeholder={t("mobile.rooms.waterPlaceholder")} placeholderTextColor={theme.muted}
                        value={meterReadings[room._id]?.water || ""}
                        onChangeText={(value) => setMeterReadings(prev => ({ ...prev, [room._id]: { ...prev[room._id], water: parseMeterReading(value) === null ? value : formatMeterReading(value), electricity: prev[room._id]?.electricity || "" } }))}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <AppButton icon="save-outline" loading={submitting} onPress={handleBulkMeterReport}>{t("mobile.rooms.saveAll")}</AppButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {scanTarget ? (
        <MeterCameraModal
          visible={Boolean(scanTarget)}
          roomCode={scanTarget.roomCode}
          initialMeterType={scanTarget.meterType}
          onClose={() => setScanTarget(null)}
          onRead={(meterType: MeterType, digits: string) => {
            setMeterReadings(prev => applyMeterReading(prev, scanTarget.roomId, meterType, digits));
            setScanTarget(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 110 },
  floorFilters: { gap: 7, paddingBottom: 14 },
  floorGroup: { marginBottom: 24 },
  floorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  floorTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 0.8 },
  floorCount: { fontSize: 12, fontWeight: "700" },
  roomList: { gap: 14 },
  roomCardWrap: { width: "100%" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterText: { fontSize: 12, fontWeight: "800" },
  
  // Card styling matching webadmin
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    elevation: 2,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  roomEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  roomCode: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  settingsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  reservedBanner: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  reservedText: {
    fontSize: 11,
    fontWeight: "800",
  },
  
  // Highlight Price Box
  priceBox: {
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.4,
  },

  // Details
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  detailCol: {
    flex: 1,
  },
  detailMetaLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailMetaVal: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14, borderWidth: 1 },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 22,
    marginBottom: 6,
  },
  title: {
    color: "#e4f7ee",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#a5bcb1",
    fontSize: 12,
    marginTop: 3,
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  subActionBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    gap: 6,
    minHeight: 40,
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  meterCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  scanMeterButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10 },
  scanMeterText: { fontSize: 11, fontWeight: "900" },
});
