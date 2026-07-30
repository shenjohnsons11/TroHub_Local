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
import ProgressStepper from "../components/ui/ProgressStepper";

const steps = [
  { label: "Tra cứu", icon: "search-outline" as const },
  { label: "Thông tin", icon: "person-outline" as const },
  { label: "Liên hệ", icon: "call-outline" as const },
  { label: "Xác nhận", icon: "checkmark-circle-outline" as const },
];

export default function AdminTenantsScreen() {
  const { theme } = useAppTheme();
  const notification = useNotification();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [idCardError, setIdCardError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSendInvite = async (tenant: AdminTenant) => {
    const rawPhone = tenant.phone ? String(tenant.phone).replace(/\D/g, "") : "";
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

  const handleCheckDuplicate = async (field: string, value: string) => {
    if (!value.trim()) return;
    try {
      let cleanValue = value.trim();
      if (field === "phone" || field === "idCard") cleanValue = value.replace(/\D/g, "");
      if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) { setEmailError("Email không hợp lệ"); return; }
      if (field === "phone" && cleanValue.length !== 10) { setPhoneError("Số điện thoại chưa đủ 10 số"); return; }
      if (field === "idCard" && cleanValue.length !== 12) { setIdCardError("CCCD chưa đủ 12 số"); return; }
      const result = await adminService.checkTenantDuplicate(field, cleanValue);
      if (field === "email") setEmailError(result.message || "");
      if (field === "phone") setPhoneError(result.message || "");
      if (field === "idCard") setIdCardError(result.message || "");
    } catch (error) { console.log("Error checking duplicate:", error); }
  };

  const handleSearchTenant = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      notification.error("Vui lòng nhập đúng 10 số điện thoại để tra cứu!");
      return;
    }
    try {
      setSubmitting(true);
      // Gửi request POST /tenants với duy nhất phone để tra cứu
      const res = await adminService.createTenant({
        fullName: "",
        phone: cleanPhone,
        email: "",
        idCard: ""
      });
      // Nếu thành công, có nghĩa là tài khoản đã tồn tại và hệ thống đã gửi lời mời liên kết
      notification.success("Đã tìm thấy tài khoản và gửi lời mời liên kết thành công!");
      setModalVisible(false);
      void loadData();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Khách mới chưa có tài khoản")) {
        // Tài khoản chưa tồn tại -> Chuyển sang bước nhập thông tin đầy đủ
        setStep(1);
        notification.info("Khách hàng mới chưa có tài khoản. Hãy điền tiếp thông tin để tạo mới.");
      } else {
        notification.error(msg || "Tra cứu Người thuê thất bại!");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTenant = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !idCard.trim()) { notification.error("Vui lòng điền đầy đủ thông tin!"); return; }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanIdCard = idCard.trim().replace(/\D/g, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { notification.error("Vui lòng nhập Email đúng định dạng (ví dụ: nguyenvanA@gmail.com) để làm tên đăng nhập!"); return; }
    if (cleanPhone.length !== 10) { notification.error("Số điện thoại phải gồm đúng 10 chữ số!"); return; }
    if (cleanIdCard.length !== 12) { notification.error("Số CCCD phải gồm đúng 12 chữ số!"); return; }
    try {
      setSubmitting(true);
      await adminService.createTenant({ fullName: fullName.trim(), phone: cleanPhone, email: email.trim(), idCard: cleanIdCard });
      notification.success("Đã thêm người thuê mới!");
      setModalVisible(false); setStep(0); setFullName(""); setPhone(""); setEmail(""); setIdCard(""); setEmailError(""); setPhoneError(""); setIdCardError("");
      void loadData();
    } catch (error) { notification.error(error instanceof Error ? error.message : "Thêm người thuê thất bại!"); }
    finally { setSubmitting(false); }
  };

  const advance = () => {
    if (step === 1 && !fullName.trim()) { notification.error("Vui lòng nhập họ và tên!"); return; }
    if (step === 2 && (!email.trim() || !phone.trim() || !idCard.trim())) { notification.error("Vui lòng điền đầy đủ thông tin liên hệ!"); return; }
    setStep((current) => Math.min(current + 1, 3));
  };
  const openCreateModal = () => {
    setStep(0);
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
              <Pressable
                accessibilityRole="button"
                style={[styles.sectionBtn, { backgroundColor: "#10b981" }]}
                onPress={openCreateModal}
              >
                <Ionicons name="person-add-outline" size={15} color="#fff" />
                <Text style={styles.sectionBtnText}>+ Thêm người thuê</Text>
              </Pressable>
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
          const formattedPhone = item.phone
            ? String(item.phone).replace(/\D/g, "").replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3").replace(/(\d{4})(\d+)/, "$1.$2")
            : "-";

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
                      <Ionicons name="card-outline" size={12} /> CCCD: {item.idCard}
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

    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { if (!submitting) setModalVisible(false); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} /><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.modalHeader}><Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]}>Thêm người thuê mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng thêm người thuê" disabled={submitting} onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></Pressable></View>
        <ProgressStepper steps={steps} currentStep={step} />
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {step === 0 ? (
            <Field 
              label="Số điện thoại của Người thuê"
              value={phone} 
              setValue={(text: string) => { 
                let value = text.replace(/\D/g, "").slice(0, 10); 
                if (value.length > 7) value = value.replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3"); 
                else if (value.length > 4) value = value.replace(/(\d{4})(\d+)/, "$1.$2"); 
                setPhone(value); 
                setPhoneError(""); 
              }} 
              placeholder="Nhập 10 số điện thoại để tra cứu" 
              style={inputStyle} 
              muted={theme.muted} 
              keyboardType="phone-pad" 
              error={phoneError} 
              danger={theme.danger} 
            />
          ) : null}

          {step === 1 ? (
            <Field 
              label="Họ và tên" 
              value={fullName} 
              setValue={setFullName} 
              placeholder="Nhập họ và tên khách" 
              style={inputStyle} 
              muted={theme.muted} 
            />
          ) : null}

          {step === 2 ? <>
            <Field label="Email (Tên đăng nhập)" value={email} setValue={(text: string) => { setEmail(text); setEmailError(""); }} placeholder="Nhập email" style={[...inputStyle, emailError && { backgroundColor: theme.warningSoft }]} muted={theme.muted} keyboardType="email-address" onBlur={() => void handleCheckDuplicate("email", email)} error={emailError} danger={theme.danger} />
            <Field label="Số điện thoại" value={phone} setValue={() => {}} style={[...inputStyle, { opacity: 0.6 }]} muted={theme.muted} keyboardType="phone-pad" error={phoneError} danger={theme.danger} editable={false} />
            <Field label="Số CCCD (Bắt buộc 12 số)" value={idCard} setValue={(text: string) => { let value = text.replace(/\D/g, "").slice(0, 12); if (value.length > 8) value = value.replace(/(\d{4})(\d{4})(\d+)/, "$1.$2.$3"); else if (value.length > 4) value = value.replace(/(\d{4})(\d+)/, "$1.$2"); setIdCard(value); setIdCardError(""); }} placeholder="Nhập CCCD" style={inputStyle} muted={theme.muted} keyboardType="numeric" onBlur={() => void handleCheckDuplicate("idCard", idCard)} error={idCardError} danger={theme.danger} />
          </> : null}

          {step === 3 ? (
            <View style={[styles.summary, { backgroundColor: theme.background }]}>
              <Ionicons name="shield-checkmark-outline" size={34} color={theme.primary} />
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{fullName}</Text>
              <Text style={[styles.summaryText, { color: theme.muted }]}>{email}</Text>
              <Text style={[styles.summaryText, { color: theme.muted }]}>{phone} · CCCD {idCard}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {step > 0 ? (
              <View style={styles.action}>
                <AppButton icon="arrow-back" variant="secondary" disabled={submitting} onPress={() => setStep((current) => current - 1)}>
                  Quay lại
                </AppButton>
              </View>
            ) : null}
            <View style={styles.action}>
              {step === 0 ? (
                <AppButton icon="search-outline" iconPosition="left" loading={submitting} onPress={handleSearchTenant}>
                  Tra cứu & liên kết
                </AppButton>
              ) : step === 3 ? (
                <AppButton icon="person-add-outline" iconPosition="left" loading={submitting} onPress={handleAddTenant}>
                  Thêm người thuê
                </AppButton>
              ) : (
                <AppButton icon="arrow-forward" iconPosition="right" loading={submitting} onPress={advance}>
                  Tiếp tục
                </AppButton>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
</View>
);
}

function Field({ label, value, setValue, placeholder, style, muted, keyboardType, onBlur, error, danger, editable = true }: any) {
  return <View style={styles.field}><Text style={[styles.label, { color: style[1].color }]}>{label}</Text><TextInput editable={editable} style={style} value={value} onChangeText={setValue} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={muted} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} />{error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: danger }]}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, list: { padding: 18, paddingBottom: 36, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: "900" }, info: { flex: 1 }, name: { fontSize: 16, fontWeight: "900" }, sub: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  overlay: { flex: 1, justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  form: { paddingTop: 20, paddingBottom: 8 }, field: { marginBottom: 14 }, label: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 }, error: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  summary: { alignItems: "center", borderRadius: 20, padding: 22 }, summaryTitle: { fontSize: 20, fontWeight: "900", marginTop: 10 }, summaryText: { fontSize: 13, marginTop: 5 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 }, action: { flex: 1 },
  sectionRow: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  sectionSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 5 },
  sectionBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", minHeight: 44, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "600", height: "100%" },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#10b981", marginLeft: 10 },
  inviteBtnText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
});
