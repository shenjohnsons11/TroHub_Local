import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminTenant, AdminRoom } from "../services/adminService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import CCCDScannerModal from "../components/CCCDScannerModal";
import AddTenantModal from "../components/AddTenantModal";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";

export default function AdminTenantsScreen() {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [lookupIdentifier, setLookupIdentifier] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "new" | "error">("idle");
  const [existingTenantId, setExistingTenantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const handleSendInvite = async (tenant: AdminTenant) => {
    const rawPhone = unformatDigits(tenant.phone);
    const useZalo = await notification.confirm({
      title: "Gửi lời mời tải App",
      message: `Gửi lời mời TroHub cho ${tenant.fullName} (${rawPhone}) qua Zalo hoặc SMS?`,
      confirmText: "Zalo",
      cancelText: "SMS",
    });
    if (useZalo) {
      const url = `https://zalo.me/${rawPhone}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else notification.info(`Mở Zalo tới SĐT: ${rawPhone}`);
      return;
    }
    const msg = encodeURIComponent(`Xin chao ${tenant.fullName}, Chu tro moi ban tai App TroHub de theo doi hop dong va hoa don: https://trohub.app/download`);
    await Linking.openURL(`sms:${rawPhone}?body=${msg}`).catch(() => {
      notification.info(`Mở SMS tới SĐT: ${rawPhone}`);
    });
  };

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([adminService.getTenants(), adminService.getRooms()]);
      setTenants(tenantsData); setRooms(roomsData);
    } catch (error) { console.log("Lỗi tải dữ liệu người thuê:", error); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (!modalVisible || !lookupIdentifier) return;
    const digits = unformatDigits(lookupIdentifier);
    const ready = digits.length === 10 || digits.length === 12 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lookupIdentifier.trim());
    if (!ready) { setLookupStatus("idle"); return; }
    let active = true;
    setLookupStatus("loading");
    const timer = setTimeout(() => {
      adminService.lookupTenant(lookupIdentifier).then((result) => {
        if (!active) return;
        if (result.found && result.data) {
          setExistingTenantId(result.data._id);
          setFullName(result.data.fullName || "");
          setPhone(formatPhone(result.data.phone));
          setEmail(result.data.email || "");
          setIdCard(formatCCCD(result.data.idCard));
          setLookupStatus("found");
        } else {
          setExistingTenantId(null);
          setLookupStatus("new");
        }
      }).catch(() => { if (active) setLookupStatus("error"); });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [lookupIdentifier, modalVisible]);

  const handleAddTenant = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !idCard.trim() || !roomCode) { notification.error("Vui lòng điền đầy đủ thông tin và chọn phòng!"); return; }
    const cleanPhone = unformatDigits(phone);
    const cleanIdCard = unformatDigits(idCard);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { notification.error("Vui lòng nhập Email đúng định dạng (ví dụ: nguyenvanA@gmail.com) để làm tên đăng nhập!"); return; }
    if (cleanPhone.length !== 10) { notification.error("Số điện thoại phải gồm đúng 10 chữ số!"); return; }
    if (cleanIdCard.length !== 12) { notification.error("Số CCCD phải gồm đúng 12 chữ số!"); return; }
    try {
      setSubmitting(true);
      await adminService.createTenant({ fullName: fullName.trim(), phone: cleanPhone, email: email.trim(), idCard: cleanIdCard, roomCode });
      notification.success(existingTenantId ? "Đã liên kết Người thuê vào phòng!" : "Đã tạo mới và liên kết Người thuê vào phòng!");
      setModalVisible(false);
      void loadData();
    } catch (error) { notification.error(error instanceof Error ? error.message : "Thêm người thuê thất bại!"); }
    finally { setSubmitting(false); }
  };

  const openCreateModal = () => {
    setFullName(""); setPhone(""); setEmail(""); setIdCard(""); setRoomCode("");
    setLookupIdentifier(""); setLookupStatus("idle"); setExistingTenantId(null);
    setModalVisible(true);
  };
  if (loading) return <AppLoadingScreen />;
  const vacantRooms = rooms.filter((room) => room.status === 0);
  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text }];

  const filteredTenants = tenants.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.fullName && t.fullName.toLowerCase().includes(q)) ||
      (t.phone && String(t.phone).includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GradientHero
              icon="people-outline"
              label="CỘNG ĐỒNG NGƯỜI THUÊ"
              value={`${tenants.length} người`}
              detail={`${vacantRooms.length} phòng trống sẵn sàng tiếp nhận`}
            />

            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Quản lý người thuê</Text>
                <Text style={[styles.sectionSub, { color: theme.muted }]}>Danh sách Người thuê & liên kết ứng dụng</Text>
              </View>
            </View>

            {/* Ô Tìm Kiếm Người Thuê */}
            <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Tìm theo tên, SĐT hoặc Email..."
                placeholderTextColor={theme.muted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <Pressable accessibilityRole="button" onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={18} color={theme.muted} />
                </Pressable>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            kind="contract"
            title="Không tìm thấy người thuê"
            description="Thử thay đổi từ khóa tìm kiếm hoặc thêm người thuê mới."
            actionLabel="+ Thêm người thuê"
            actionIcon="person-add-outline"
            onAction={openCreateModal}
          />
        }
        renderItem={({ item, index }) => {
          const isLinked = item.mustChangePassword === false;
          const formattedPhone = formatPhone(item.phone) || "-";

          return (
            <AnimatedEntry delay={Math.min(index, 6) * 45}>
              <View style={[styles.card, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}>
                <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {item.fullName ? item.fullName.slice(0, 2).toUpperCase() : "KT"}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text style={[styles.name, { color: theme.text }]}>{item.fullName}</Text>
                  <Text style={[styles.sub, { color: theme.muted }]}>
                    <Ionicons name="call-outline" size={12} /> {formattedPhone}
                  </Text>
                  {item.email ? (
                    <Text style={[styles.sub, { color: theme.muted }]}>
                      <Ionicons name="mail-outline" size={12} /> {item.email}
                    </Text>
                  ) : null}
                  {item.idCard ? (
                    <Text style={[styles.sub, { color: theme.muted }]}>
                      <Ionicons name="card-outline" size={12} /> CCCD: {formatCCCD(item.idCard)}
                    </Text>
                  ) : null}

                  {/* App Link Status Badge */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: isLinked ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name={isLinked ? "checkmark-circle" : "alert-circle"}
                        size={12}
                        color={isLinked ? "#10b981" : "#f59e0b"}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: isLinked ? "#10b981" : "#f59e0b",
                        }}
                      >
                        {isLinked ? "Đã liên kết App" : "Chưa liên kết App"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Nút Gửi lời mời cho khách chưa liên kết */}
                {!isLinked && (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.inviteBtn}
                    onPress={() => handleSendInvite(item)}
                  >
                    <Ionicons name="paper-plane-outline" size={14} color="#ffffff" />
                    <Text style={styles.inviteBtnText}>Gửi lời mời</Text>
                  </Pressable>
                )}
              </View>
            </AnimatedEntry>
          );
        }}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="Thêm người thuê" onPress={openCreateModal} style={styles.fab}>
        <Ionicons name="person-add-outline" size={20} color="#b8f5da" />
        <Text style={styles.fabText}>+ Thêm người thuê</Text>
      </Pressable>

      <AddTenantModal visible={modalVisible} rooms={rooms} onClose={() => setModalVisible(false)} onSuccess={() => { void loadData(); }} />

    <Modal visible={false} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} /><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Thêm người thuê mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thêm người thuê" disabled={submitting} onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.formHint, { color: theme.muted }]}>Nhập SĐT, CCCD hoặc Email; hệ thống sẽ tự tra cứu sau khi dữ liệu hợp lệ.</Text>
          <Field label="Số điện thoại" value={phone} setValue={(text: string) => { const value = formatPhone(text); setPhone(value); setLookupIdentifier(value); }} placeholder="0901.234.567" style={inputStyle} muted={theme.muted} keyboardType="phone-pad" editable={!existingTenantId} />
          <Field label="Số CCCD" value={idCard} setValue={(text: string) => { const value = formatCCCD(text); setIdCard(value); setLookupIdentifier(value); }} placeholder="0790.1234.5678" style={inputStyle} muted={theme.muted} keyboardType="numeric" editable={!existingTenantId} accessory={<Pressable accessibilityRole="button" accessibilityLabel="Quét CCCD bằng camera" disabled={Boolean(existingTenantId)} onPress={() => setScannerVisible(true)} style={[styles.scanButton, { backgroundColor: theme.primarySoft }]}><Text style={[styles.scanButtonText, { color: theme.primary }]}>📷 Quét CCCD (Camera)</Text></Pressable>} />
          <Field label="Email" value={email} setValue={(text: string) => { setEmail(text); setLookupIdentifier(text); }} placeholder="nguyenvana@gmail.com" style={inputStyle} muted={theme.muted} keyboardType="email-address" editable={!existingTenantId} />
          <Field label="Họ và tên" value={fullName} setValue={setFullName} placeholder="Nguyễn Văn A" style={inputStyle} muted={theme.muted} editable={!existingTenantId} />

          {lookupStatus !== "idle" ? (
            <View accessibilityLiveRegion="polite" style={[styles.lookupBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={lookupStatus === "found" ? "link-outline" : lookupStatus === "loading" ? "search-outline" : "person-add-outline"} size={18} color={theme.primary} />
              <Text style={[styles.lookupText, { color: theme.text }]}>{lookupStatus === "loading" ? "Đang tra cứu…" : lookupStatus === "found" ? "Đã tìm thấy tài khoản. Hồ sơ được khóa để liên kết an toàn." : lookupStatus === "error" ? "Không thể tra cứu lúc này. Vui lòng thử lại." : "Chưa có tài khoản. Hệ thống sẽ tạo mới với mật khẩu 123456."}</Text>
              {existingTenantId ? <Pressable accessibilityRole="button" onPress={openCreateModal}><Text style={[styles.resetLookup, { color: theme.primary }]}>Đổi người</Text></Pressable> : null}
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.text }]}>Phòng xếp</Text>
          <View style={styles.roomChips}>
            {vacantRooms.map((room) => {
              const selected = roomCode === room.roomCode;
              return <Pressable key={room._id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setRoomCode(room.roomCode)} style={[styles.roomChip, { backgroundColor: selected ? theme.primary : theme.background, borderColor: selected ? theme.primary : theme.border }]}><Text style={[styles.roomChipText, { color: selected ? theme.background : theme.text }]}>{room.roomCode}</Text></Pressable>;
            })}
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <AppButton icon={existingTenantId ? "link-outline" : "person-add-outline"} loading={submitting} disabled={lookupStatus === "loading"} onPress={handleAddTenant}>
                {existingTenantId ? "Liên kết Người thuê vào phòng" : "Tạo mới & Liên kết"}
              </AppButton>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  <CCCDScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={(result) => { setIdCard(formatCCCD(result.idCard)); setFullName(result.fullName); setLookupIdentifier(result.idCard); }} />
</View>
);
}

function Field({ label, value, setValue, placeholder, style, muted, keyboardType, onBlur, error, danger, editable = true, accessory }: any) {
  return <View style={styles.field}><Text style={[styles.label, { color: style[1].color }]}>{label}</Text><View style={accessory ? styles.fieldRow : undefined}><TextInput editable={editable} style={accessory ? [...style, styles.fieldInput] : style} value={value} onChangeText={setValue} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={muted} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} />{accessory}</View>{error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: danger }]}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, list: { padding: 18, paddingBottom: 36, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: "900" }, info: { flex: 1 }, name: { fontSize: 16, fontWeight: "900" }, sub: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  overlay: { flex: 1, justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  form: { paddingTop: 4, paddingBottom: 8 }, formHint: { fontSize: 12, lineHeight: 18, marginBottom: 16 }, field: { marginBottom: 14 }, label: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 }, error: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 }, fieldInput: { flex: 1 }, scanButton: { minHeight: 44, justifyContent: "center", borderRadius: 12, paddingHorizontal: 10 }, scanButtonText: { fontSize: 11, fontWeight: "800" },
  lookupBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, padding: 12, marginBottom: 16 }, lookupText: { flex: 1, fontSize: 12, lineHeight: 17 }, resetLookup: { fontSize: 12, fontWeight: "800" },
  roomChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }, roomChip: { minHeight: 44, minWidth: 68, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, roomChipText: { fontSize: 13, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 }, action: { flex: 1 },
  sectionRow: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  sectionSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 5 },
  sectionBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  fab: { position: "absolute", right: 20, bottom: 24, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 26, backgroundColor: "#073e36", paddingHorizontal: 18, elevation: 6, shadowColor: "#073e36", shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabText: { color: "#b8f5da", fontSize: 13, fontWeight: "900" },
  searchBox: { flexDirection: "row", alignItems: "center", minHeight: 44, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "600", height: "100%" },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#10b981", marginLeft: 10 },
  inviteBtnText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
});
