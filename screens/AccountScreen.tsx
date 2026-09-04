import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import SignaturePadModal from "../components/SignaturePadModal";
import AutomationStatusCard from "../components/AutomationStatusCard";
import QuickAutoBillingModal from "../components/QuickAutoBillingModal";
import { adminService, BillingAutomationPolicy } from "../services/adminService";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { formatPhone, formatCCCD, unformatDigits } from "../utils/formatters";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS, SYSTEM_ICONS } from "../constants/featureIcons";
import {
  getExpoPushToken,
  isPushEnabled,
  notificationPlatform,
  requestNotificationPermission,
  setPushEnabled,
} from "../services/pushNotificationService";
import { notificationService } from "../services/notificationService";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import * as Location from "expo-location";
import { API_BASE_URL } from "../constants/api";

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
  const { theme, resolvedTheme, toggleTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [signaturePadVisible, setSignaturePadVisible] = useState(false);
  const [signatureDetailVisible, setSignatureDetailVisible] = useState(false);
  const [automationPolicy, setAutomationPolicy] = useState<BillingAutomationPolicy>({
    autoInvoiceEnabled: true,
    invoiceDay: 25,
    dueDay: 5,
    autoRemindEnabled: true,
    remindDaysBeforeDue: 2,
  });
  const [autoBillingModalVisible, setAutoBillingModalVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");

  // Edit profile form state — đầy đủ các trường tương tự lúc đăng ký
  const [editName, setEditName] = useState(profile.fullName || "");
  const [editPhone, setEditPhone] = useState(formatPhone(profile.phone));
  const [editEmail, setEditEmail] = useState(profile.email || "");
  const [editIdCard, setEditIdCard] = useState(profile.cccd || profile.idCard || "");
  const [editPropertyAddress, setEditPropertyAddress] = useState(profile.propertyAddress || "");
  const [editLatitude, setEditLatitude] = useState<number | undefined>(profile.propertyLatitude);
  const [editLongitude, setEditLongitude] = useState<number | undefined>(profile.propertyLongitude);
  const [isLocating, setIsLocating] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const isLandlord = profile.role === 1 || String(profile.role) === "1";

  const openEditProfile = () => {
    setEditName(profile.fullName || "");
    setEditPhone(formatPhone(profile.phone));
    setEditEmail(profile.email || "");
    setEditIdCard(profile.cccd || profile.idCard || "");
    setEditPropertyAddress(profile.propertyAddress || "");
    setEditLatitude(profile.propertyLatitude);
    setEditLongitude(profile.propertyLongitude);
    setEditProfileVisible(true);
  };

  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền vị trí",
          "Vui lòng cho phép ứng dụng truy cập vị trí để tự động điền địa chỉ hiện tại."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setEditLatitude(latitude);
      setEditLongitude(longitude);

      // Gọi backend reverse-geocode để đổi tọa độ thành địa chỉ chuẩn
      try {
        const res = await fetch(`${API_BASE_URL}/auth/reverse-geocode?lat=${latitude}&lng=${longitude}`);
        const json = await res.json();
        if (json.success && json.data?.address) {
          setEditPropertyAddress(json.data.address);
          return;
        }
      } catch {}

      // Dự phòng dịch ngược native của Expo
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const g = geocoded[0];
        const parts = [
          g.streetNumber ? `${g.streetNumber} ${g.street || ""}`.trim() : g.street,
          g.subregion || g.district,
          g.city || g.region,
          g.country,
        ].filter(Boolean);
        if (parts.length > 0) {
          setEditPropertyAddress(parts.join(", "));
        }
      }
    } catch (err: any) {
      Alert.alert("Lỗi vị trí", err?.message || "Không thể lấy vị trí hiện tại.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    void isPushEnabled(profile.id).then(setPushPreference);
  }, [profile.id]);

  useEffect(() => {
    if (isLandlord) {
      void adminService
        .getBillingAutomationPolicy()
        .then((policy) => {
          if (policy) setAutomationPolicy(policy);
        })
        .catch(() => undefined);
    }
  }, [isLandlord]);

  const handleSaveSignature = async (sigBase64: string) => {
    const cleanSig = sigBase64.trim();
    try {
      const updated: UserProfile = {
        ...profile,
        landlordSignature: cleanSig,
      };
      await userService.updateProfile(updated);
      onProfileUpdate?.(updated);
      setSignaturePadVisible(false);
      Alert.alert(t("common.success"), "Đã lưu chữ ký mẫu của Chủ trọ!");
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || "Không thể lưu chữ ký");
    }
  };

  const handleDeleteSignature = async () => {
    try {
      const updated: UserProfile = {
        ...profile,
        landlordSignature: "",
      };
      await userService.updateProfile(updated);
      onProfileUpdate?.(updated);
      setSignatureDetailVisible(false);
      Alert.alert(t("common.success"), "Đã xóa chữ ký mẫu!");
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || "Không thể xóa chữ ký");
    }
  };

  const handlePushChange = async (next: boolean) => {
    const previous = pushEnabled;
    setPushLoading(true);
    setPushError("");
    setPushPreference(next);

    try {
      if (next) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setPushPreference(false);
          await setPushEnabled(profile.id, false);
          return;
        }

        const token = await getExpoPushToken();
        if (token) {
          await notificationService.registerDevice(token, notificationPlatform());
          onPushTokenChange?.(token);
        }
        await setPushEnabled(profile.id, true);
      } else {
        const token = await getExpoPushToken();
        if (token) {
          await notificationService.deactivateDevice(token);
          onPushTokenChange?.(null);
        }
        await setPushEnabled(profile.id, false);
      }
    } catch {
      setPushPreference(previous);
      setPushError(t("account.pushUpdateFailed"));
    } finally {
      setPushLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t("common.error"), t("auth.fullName"));
      return;
    }
    const cleanPhone = unformatDigits(editPhone);
    if (cleanPhone.length !== 10) {
      Alert.alert(t("common.error"), "Số điện thoại phải gồm đúng 10 chữ số");
      return;
    }
    const cleanId = unformatDigits(editIdCard);
    if (cleanId && cleanId.length !== 12) {
      Alert.alert(t("common.error"), "CCCD phải gồm đúng 12 chữ số");
      return;
    }

    try {
      setEditSaving(true);
      const updated: UserProfile = {
        ...profile,
        fullName: editName.trim(),
        phone: cleanPhone,
        email: editEmail.trim(),
        cccd: cleanId,
        idCard: cleanId,
        propertyAddress: editPropertyAddress.trim(),
        propertyLatitude: editLatitude,
        propertyLongitude: editLongitude,
      };
      await userService.updateProfile(updated);
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
              onPress={openEditProfile}
            >
              <FeatureIconBox token={SYSTEM_ICONS.profile} size={20} accessibilityLabel={t("account.editProfile")} />
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.editProfile")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Tên, SĐT, CCCD, Địa chỉ</AppText>
            </Pressable>

            {/* Tile 2: Đổi mật khẩu */}
            <Pressable
              style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setPasswordVisible(true)}
            >
              <FeatureIconBox token={SYSTEM_ICONS.security} size={20} accessibilityLabel={t("account.changePassword")} />
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.changePassword")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Bảo mật tài khoản</AppText>
            </Pressable>

            {/* Tile 3: Căn cước công dân */}
            <Pressable
              style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={openEditProfile}
            >
              <FeatureIconBox token={FEATURE_ICONS.scanCCCD} size={20} accessibilityLabel={t("account.idCard")} />
              <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.idCard")}</AppText>
              <AppText style={[styles.tileSubtitle, { color: "#10B981", fontWeight: "800" }]}>
                {(profile.cccd || profile.idCard) ? formatCCCD(profile.cccd || profile.idCard) : "Chưa xác thực"}
              </AppText>
            </Pressable>

            {/* Tile 4: Role-specific Tile */}
            {isLandlord ? (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => {
                  if (profile.landlordSignature) {
                    setSignatureDetailVisible(true);
                  } else {
                    setSignaturePadVisible(true);
                  }
                }}
              >
                <FeatureIconBox token={SYSTEM_ICONS.signature} size={20} accessibilityLabel="Chữ ký mẫu (Bên A)" />
                <AppText style={[styles.tileTitle, { color: theme.text }]}>Chữ ký mẫu (Bên A)</AppText>
                <AppText
                  style={[
                    styles.tileSubtitle,
                    {
                      color: profile.landlordSignature ? "#10B981" : theme.muted,
                      fontWeight: profile.landlordSignature ? "800" : "600",
                    },
                  ]}
                >
                  {profile.landlordSignature ? "Đã sẵn sàng chữ ký" : "Chưa tạo chữ ký"}
                </AppText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => onNavigate?.("contract")}
              >
                <FeatureIconBox token={FEATURE_ICONS.contracts} size={20} accessibilityLabel="Hợp đồng thuê" />
                <AppText style={[styles.tileTitle, { color: theme.text }]}>Hợp đồng thuê</AppText>
                <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>Xem điều khoản & cọc</AppText>
              </Pressable>
            )}

            {/* Tile 5: Tài khoản nhận tiền (VietQR) */}
            {isLandlord ? (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => onNavigate?.("admin_settings")}
              >
                <FeatureIconBox token={FEATURE_ICONS.vietqr} size={20} accessibilityLabel={t("account.banking")} />
                <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("account.banking")}</AppText>
                <AppText
                  style={[
                    styles.tileSubtitle,
                    {
                      color: profile.bankAccountNo ? "#10B981" : theme.muted,
                      fontWeight: profile.bankAccountNo ? "800" : "600",
                    },
                  ]}
                >
                  {profile.bankAccountNo
                    ? `${profile.bankId || "VietQR"} · ${profile.bankAccountNo}`
                    : "Cấu hình nhận tiền"}
                </AppText>
              </Pressable>
            ) : null}

            {/* Tile 6: Dịch vụ đi kèm */}
            {isLandlord ? (
              <Pressable
                style={[styles.bentoTile, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => onNavigate?.("services")}
              >
                <FeatureIconBox token={FEATURE_ICONS.services} size={20} accessibilityLabel={t("servicesMobile.title")} />
                <AppText style={[styles.tileTitle, { color: theme.text }]}>{t("servicesMobile.title")}</AppText>
                <AppText style={[styles.tileSubtitle, { color: theme.muted }]}>{t("servicesMobile.shortcutDescription")}</AppText>
              </Pressable>
            ) : null}
          </View>
        </AnimatedEntry>

        {/* ========================================================= */}
        {/* 2.5 BENTO: TỰ ĐỘNG HÓA HÓA ĐƠN                            */}
        {/* ========================================================= */}
        {isLandlord && (
          <AnimatedEntry delay={170}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flash" size={16} color={theme.primary} />
              <AppText style={[styles.sectionTitle, { color: theme.text }]}>
                Tự động hóa chu kỳ hóa đơn
              </AppText>
            </View>
            <AutomationStatusCard
              policy={automationPolicy}
              onConfigure={() => setAutoBillingModalVisible(true)}
            />
          </AnimatedEntry>
        )}

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
                <FeatureIconBox token={SYSTEM_ICONS.language} size={18} accessibilityLabel={t("common.language")} />
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
                <FeatureIconBox token={SYSTEM_ICONS.notifications} size={18} accessibilityLabel={t("account.pushNotifications")} />
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
                <FeatureIconBox token={SYSTEM_ICONS.preferences} size={18} accessibilityLabel={t("account.themeMode")} />
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
                <FeatureIconBox token={SYSTEM_ICONS.security} size={18} accessibilityLabel={t("account.terms")} />
                <AppText style={[styles.rowLabel, { color: theme.text }]}>{t("account.terms")}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

            <View style={styles.bentoListRow}>
              <View style={styles.rowLeft}>
                <FeatureIconBox token={SYSTEM_ICONS.information} size={18} accessibilityLabel={t("account.appVersion")} />
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

      {/* Signature Pad Modal cho Chủ trọ */}
      <SignaturePadModal
        visible={signaturePadVisible}
        onClose={() => setSignaturePadVisible(false)}
        onSave={handleSaveSignature}
      />

      {/* Modal xem trước & quản lý Chữ ký mẫu */}
      <Modal
        visible={signatureDetailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignatureDetailVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={[styles.signatureDetailCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.modalTitle, { color: theme.text }]}>Chữ ký mẫu Chủ trọ</AppText>
                <AppText style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Tự động đóng dấu chữ ký Bên A vào hợp đồng</AppText>
              </View>
              <Pressable onPress={() => setSignatureDetailVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.signaturePreviewSurface}>
              {profile.landlordSignature ? (
                <Image
                  source={{
                    uri: profile.landlordSignature.startsWith("data:")
                      ? profile.landlordSignature
                      : `data:image/png;base64,${profile.landlordSignature}`,
                  }}
                  style={styles.signatureImg}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <View style={styles.signatureModalActions}>
              <Pressable
                style={[styles.sigActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setSignatureDetailVisible(false);
                  setSignaturePadVisible(true);
                }}
              >
                <Ionicons name="brush-outline" size={16} color="#FFFFFF" />
                <AppText style={styles.sigActionText}>Ký lại / Đổi chữ ký</AppText>
              </Pressable>

              <Pressable
                style={[styles.sigActionBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => {
                  Alert.alert(
                    "Xóa chữ ký mẫu",
                    "Bạn có chắc muốn xóa chữ ký mẫu của Chủ trọ?",
                    [
                      { text: "Hủy", style: "cancel" },
                      { text: "Xóa chữ ký", style: "destructive", onPress: () => void handleDeleteSignature() },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <AppText style={styles.sigActionText}>Xóa</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tự động hóa hóa đơn cho Chủ trọ */}
      <QuickAutoBillingModal
        visible={autoBillingModalVisible}
        policy={automationPolicy}
        onClose={() => setAutoBillingModalVisible(false)}
        onSaved={(newPolicy) => setAutomationPolicy(newPolicy)}
      />

      {/* ========================================================= */}
      {/* 5. MODAL CHỈNH SỬA HỒ SƠ                                  */}
      {/* ========================================================= */}
      <Modal visible={editProfileVisible} transparent animationType="slide" onRequestClose={() => setEditProfileVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <AppText style={[styles.modalTitle, { color: theme.text }]}>{t("account.editProfile")}</AppText>
                <AppText style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Cập nhật thông tin định danh & liên hệ</AppText>
              </View>
              <Pressable onPress={() => setEditProfileVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
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
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>Số CCCD/CMND (12 số)</AppText>
                <AppTextInput
                  value={editIdCard}
                  onChangeText={(val) => setEditIdCard(unformatDigits(val))}
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholder="012345678901"
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

              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText style={[styles.fieldLabel, { color: theme.text }]}>
                    {isLandlord ? "Địa chỉ nhà trọ / Cơ sở" : "Địa chỉ thường trú"}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleGetLocation}
                    disabled={isLocating}
                    hitSlop={8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: theme.primarySoft,
                    }}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="location-sharp" size={13} color={theme.primary} />
                    )}
                    <AppText style={{ fontSize: 11, fontWeight: "800", color: theme.primary }}>
                      {isLocating ? "Đang định vị..." : "Lấy vị trí hiện tại"}
                    </AppText>
                  </Pressable>
                </View>

                <View style={{ position: "relative", justifyContent: "center" }}>
                  <AppTextInput
                    value={editPropertyAddress}
                    onChangeText={setEditPropertyAddress}
                    placeholder={isLandlord ? "123 Đường Cầu Giấy, Hà Nội" : "Địa chỉ theo CCCD"}
                    placeholderTextColor={theme.muted}
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, paddingRight: 42 }]}
                  />
                  <Pressable
                    onPress={handleGetLocation}
                    disabled={isLocating}
                    hitSlop={10}
                    style={{ position: "absolute", right: 12 }}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="navigate-circle-outline" size={22} color={theme.primary} />
                    )}
                  </Pressable>
                </View>
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  signatureDetailCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  signaturePreviewSurface: {
    height: 130,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  signatureImg: { width: "100%", height: "100%" },
  signatureModalActions: { flexDirection: "row", gap: 10 },
  sigActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sigActionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
