import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation, useLanguage } from "../contexts/LanguageContext";
import { UserProfile } from "../types/UserProfile";
import ChangePasswordModal from "../components/ChangePasswordModal";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { formatPhone, formatCCCD, unformatDigits } from "../utils/formatters";
import {
  getExpoPushToken,
  isPushEnabled,
  notificationPlatform,
  requestNotificationPermission,
  setPushEnabled,
} from "../services/pushNotificationService";
import { notificationService } from "../services/notificationService";
import { authService } from "../services/authService";

type Props = {
  profile: UserProfile;
  onLogout: () => void;
  onNavigate?: (screen: any, params?: any) => void;
  onPushTokenChange?: (token: string | null) => void;
  onProfileUpdate?: (profile: UserProfile) => void;
};

export default function AccountScreen({
  profile,
  onLogout,
  onNavigate,
  onPushTokenChange,
  onProfileUpdate,
}: Props) {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");

  // Edit profile form state
  const [editName, setEditName] = useState(profile.fullName || "");
  const [editPhone, setEditPhone] = useState(formatPhone(profile.phone));
  const [editEmail, setEditEmail] = useState(profile.email || "");
  const [editSaving, setEditSaving] = useState(false);

  const isLandlord = profile.role === 1 || String(profile.role) === "1";

  useEffect(() => {
    void isPushEnabled(profile.id).then(setPushPreference);
  }, [profile.id]);

  const handlePushChange = async (next: boolean) => {
    const previous = pushEnabled;
    setPushLoading(true);
    setPushError("");
    try {
      if (next) {
        const status = await requestNotificationPermission();
        if (status !== "granted") {
          setPushError(t("common.error"));
          return;
        }
        const token = await getExpoPushToken();
        if (!token) throw new Error(t("common.error"));
        await notificationService.registerDevice(token, notificationPlatform());
        await setPushEnabled(profile.id, true);
        setPushPreference(true);
        onPushTokenChange?.(token);
      } else {
        const token = await getExpoPushToken();
        if (token) await notificationService.deactivateDevice(token);
        await setPushEnabled(profile.id, false);
        setPushPreference(false);
        onPushTokenChange?.(null);
      }
    } catch (error: any) {
      setPushPreference(previous);
      setPushError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setPushLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t("common.error"), t("auth.fullName"));
      return;
    }
    try {
      setEditSaving(true);
      const updated = {
        ...profile,
        fullName: editName.trim(),
        phone: unformatDigits(editPhone),
        email: editEmail.trim(),
      };
      await authService.updateProfile(updated);
      onProfileUpdate?.(updated);
      setEditProfileVisible(false);
      Alert.alert(t("common.success"), t("account.saveSuccess"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || "Không thể cập nhật hồ sơ");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* 1. HERO BENTO CARD: AVATAR & USER IDENTITY                */}
        {/* ========================================================= */}
        <AnimatedEntry delay={80}>
          <View style={[styles.heroBentoCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <LinearGradient
              colors={isDark ? ["rgba(16, 185, 129, 0.18)", "rgba(6, 78, 59, 0.05)"] : ["rgba(16, 185, 129, 0.12)", "rgba(240, 253, 244, 0.6)"]}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopRow}>
                {/* Glowing Avatar */}
                <View style={[styles.avatarOuter, { borderColor: theme.primary }]}>
                  <LinearGradient colors={["#10B981", "#047857"]} style={styles.avatarInner}>
                    <AppText style={styles.avatarLetter}>
                      {(profile.fullName || "U").charAt(0).toUpperCase()}
                    </AppText>
                  </LinearGradient>
                </View>

                {/* Identity Info */}
                <View style={styles.identityInfo}>
                  <View style={styles.roleBadgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: isLandlord ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)" }]}>
                      <AppText style={[styles.roleBadgeText, { color: isLandlord ? "#10B981" : "#3B82F6" }]}>
                        {isLandlord ? t("account.roleLandlord") : t("account.roleTenant")}
                      </AppText>
                    </View>
                    {!isLandlord && profile.room ? (
                      <View style={[styles.roomBadge, { backgroundColor: theme.primarySoft }]}>
                        <AppText style={[styles.roomBadgeText, { color: theme.primary }]}>
                          Phòng {profile.room}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  <AppText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                    {profile.fullName || "Chưa cập nhật tên"}
                  </AppText>
                  <AppText style={[styles.userContact, { color: theme.muted }]}>
                    📱 {formatPhone(profile.phone)}
                  </AppText>
                  {profile.email ? (
                    <AppText style={[styles.userEmail, { color: theme.muted }]} numberOfLines={1}>
                      ✉️ {profile.email}
                    </AppText>
                  ) : null}
                </View>
              </View>

              {/* Landlord Property Address Badge */}
              {profile.propertyAddress ? (
                <View style={[styles.propertyRow, { backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)" }]}>
                  <Ionicons name="location" size={15} color="#10B981" />
                  <AppText style={[styles.propertyAddressText, { color: theme.text }]} numberOfLines={1}>
                    {profile.propertyAddress}
                  </AppText>
                </View>
              ) : null}
            </LinearGradient>
          </View>
        </AnimatedEntry>

        {/* ========================================================= */}
        {/* 2. BENTO GROUP 1: HỒ SƠ & BẢO MẬT                         */}
        {/* ========================================================= */}
        <AnimatedEntry delay={140}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
            <AppText style={[styles.sectionTitle, { color: theme.text }]}>
              {t("account.profileAndSecurity")}
            </AppText>
          </View>

          <View style={styles.bentoGrid2x2}>
            {/* Tile 1: Chỉnh sửa thông tin */}
            <Pressable
              style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => {
                setEditName(profile.fullName || "");
                setEditPhone(formatPhone(profile.phone));
                setEditEmail(profile.email || "");
                setEditProfileVisible(true);
              }}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                <Ionicons name="person" size={20} color="#3B82F6" />
              </View>
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.editProfile")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Tên, SĐT, Email</AppText>
            </Pressable>

            {/* Tile 2: Đổi mật khẩu */}
            <Pressable
              style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setPasswordVisible(true)}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="lock-closed" size={20} color="#F59E0B" />
              </View>
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.changePassword")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Bảo mật tài khoản</AppText>
            </Pressable>

            {/* Tile 3: Căn cước công dân */}
            <View style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <View style={[styles.tileIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                <Ionicons name="card" size={20} color="#10B981" />
              </View>
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.idCard")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: "#10B981", fontWeight: "800" }]}>
                {profile.idCard ? formatCCCD(profile.idCard) : "Chưa xác thực"}
              </AppText>
            </View>

            {/* Tile 4: Role-specific Tile */}
            {isLandlord ? (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => onNavigate?.("admin_settings")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                  <Ionicons name="qr-code" size={20} color="#8B5CF6" />
                </View>
                <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.banking")}</AppText>
                <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Cấu hình nhận tiền</AppText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => onNavigate?.("contract")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                  <Ionicons name="document-text" size={20} color="#8B5CF6" />
                </View>
                <AppText style={[styles.tileTitle, { color: theme.text }]}>Hợp đồng thuê</AppText>
                <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Xem điều khoản & cọc</AppText>
              </Pressable>
            )}
          </View>
        </AnimatedEntry>

        {/* ========================================================= */}
        {/* 3. BENTO GROUP 2: TÙY CHỌN ỨNG DỤNG                      */}
        {/* ========================================================= */}
        <AnimatedEntry delay={200}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options" size={16} color={theme.primary} />
            <AppText style={[styles.sectionTitle, { color: theme.text }]}>
              {t("account.appPreferences")}
            </AppText>
          </View>

          {/* Bento List Card: Language, Notification, Theme */}
          <View style={[styles.bentoListCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            {/* Row 1: Ngôn ngữ */}
            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="globe-outline" size={18} color="#10B981" />
                </View>
                <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("common.language")}</AppText>
              </View>

              {/* Segmented Language Switcher */}
              <View style={[styles.langSegmented, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Pressable
                  style={[styles.langPill, language === "vi" && { backgroundColor: theme.primary }]}
                  onPress={() => void setLanguage("vi")}
                >
                  <AppText style={[styles.langPillText, { color: language === "vi" ? theme.background : theme.muted }]}>
                    🇻🇳 VI
                  </AppText>
                </Pressable>
                <Pressable
                  style={[styles.langPill, language === "en" && { backgroundColor: theme.primary }]}
                  onPress={() => void setLanguage("en")}
                >
                  <AppText style={[styles.langPillText, { color: language === "en" ? theme.background : theme.muted }]}>
                    🇬🇧 EN
                  </AppText>
                </Pressable>
              </View>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            {/* Row 2: Thông báo đẩy */}
            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconCircle, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                  <Ionicons name="notifications-outline" size={18} color="#3B82F6" />
                </View>
                <View>
                  <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("account.pushNotifications")}</AppText>
                  <AppText style={[styles.rowSubLabel, { color: theme.muted }]}>Cảnh báo hóa đơn & sự cố</AppText>
                </View>
              </View>

              {pushLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Switch
                  value={pushEnabled}
                  onValueChange={(val) => void handlePushChange(val)}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            {/* Row 3: Giao diện sáng / tối */}
            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                  <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color="#F59E0B" />
                </View>
                <View>
                  <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("account.themeMode")}</AppText>
                  <AppText style={[styles.rowSubLabel, { color: theme.muted }]}>{isDark ? "Chế độ Tối (Dark)" : "Chế độ Sáng (Light)"}</AppText>
                </View>
              </View>

              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </AnimatedEntry>

        {/* ========================================================= */}
        {/* 4. BENTO GROUP 3: HỆ THỐNG & ĐĂNG XUẤT                    */}
        {/* ========================================================= */}
        <AnimatedEntry delay={260}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="information-circle" size={16} color={theme.primary} />
            <AppText style={[styles.sectionTitle, { color: theme.text }]}>
              {t("account.systemAndLegal")}
            </AppText>
          </View>

          <View style={[styles.bentoListCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconCircle, { backgroundColor: "rgba(107, 114, 128, 0.15)" }]}>
                  <Ionicons name="shield-outline" size={18} color="#6B7280" />
                </View>
                <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("account.terms")}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconCircle, { backgroundColor: "rgba(107, 114, 128, 0.15)" }]}>
                  <Ionicons name="cube-outline" size={18} color="#6B7280" />
                </View>
                <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("account.appVersion")}</AppText>
              </View>
              <AppText style={[styles.versionPill, { color: theme.primary, backgroundColor: theme.primarySoft }]}>
                v2.0 AI Edition
              </AppText>
            </View>
          </View>

          {/* Big Rounded Red Logout Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("account.logout")}
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Alert.alert(
                t("account.logout"),
                "Bạn có chắc chắn muốn đăng xuất khỏi TroHub?",
                [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("account.logout"), style: "destructive", onPress: onLogout },
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <AppText style={styles.logoutButtonText}>{t("account.logout")}</AppText>
          </Pressable>
        </AnimatedEntry>
      </ScrollView>

      {/* ========================================================= */}
      {/* 5. MODAL CHỈNH SỬA HỒ SƠ                                  */}
      {/* ========================================================= */}
      <Modal visible={editProfileVisible} transparent animationType="slide" onRequestClose={() => setEditProfileVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <AppText style={[styles.modalTitle, { color: theme.text }]}>{t("account.editProfile")}</AppText>
              <Pressable onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>{t("auth.fullName")}</AppText>
                <AppTextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>{t("auth.phone")}</AppText>
                <AppTextInput
                  value={editPhone}
                  onChangeText={(val) => setEditPhone(formatPhone(val))}
                  keyboardType="phone-pad"
                  placeholder="0901.234.567"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>Email</AppText>
                <AppTextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@example.com"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <Pressable
                style={[styles.saveModalBtn, { backgroundColor: theme.primary }]}
                disabled={editSaving}
                onPress={handleSaveProfile}
              >
                {editSaving ? (
                  <ActivityIndicator size="small" color={theme.background} />
                ) : (
                  <AppText style={[styles.saveModalBtnText, { color: theme.background }]}>{t("common.save")}</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <ChangePasswordModal visible={passwordVisible} onClose={() => setPasswordVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 60 },
  heroBentoCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroGradient: { padding: 20 },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  identityInfo: { flex: 1 },
  roleBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleBadgeText: { fontSize: 11, fontWeight: "900" },
  roomBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roomBadgeText: { fontSize: 11, fontWeight: "900" },
  userName: { fontSize: 19, fontWeight: "900" },
  userContact: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  userEmail: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  propertyAddressText: { fontSize: 12, fontWeight: "700", flex: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  bentoGrid2x2: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  bentoTile: {
    width: "48%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileTitle: { fontSize: 13, fontWeight: "800" },
  tileSubtitle: { fontSize: 11, fontWeight: "600" },
  bentoListCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "800" },
  rowSubLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  rowDivider: { height: 1, opacity: 0.6 },
  langSegmented: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3 },
  langPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  langPillText: { fontSize: 12, fontWeight: "900" },
  versionPill: { fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 8,
    shadowColor: "#EF4444",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalBody: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "800" },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  saveModalBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveModalBtnText: { fontSize: 15, fontWeight: "900" },
});
