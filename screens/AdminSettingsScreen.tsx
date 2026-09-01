import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, Switch, StyleSheet, View, Pressable } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { UserProfile } from "../types/UserProfile";
import ChangePasswordModal from "../components/ChangePasswordModal";
import SignaturePadModal from "../components/SignaturePadModal";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { formatPhone, unformatDigits } from "../utils/formatters";
import {
  getExpoPushToken,
  isPushEnabled,
  notificationPlatform,
  requestNotificationPermission,
  setPushEnabled,
} from "../services/pushNotificationService";
import { notificationService } from "../services/notificationService";
import { useTranslation, useLanguage } from "../contexts/LanguageContext";
import { adminService, BillingAutomationPolicy } from "../services/adminService";

const AUTOMATION_DEFAULTS: BillingAutomationPolicy = {
  autoInvoiceEnabled: true,
  invoiceDay: 25,
  dueDay: 5,
  autoRemindEnabled: true,
  remindDaysBeforeDue: 2,
};
const AUTOMATION_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
type AutomationDayField = "invoiceDay" | "dueDay" | "remindDaysBeforeDue";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onLogout: () => void;
  onPushTokenChange?: (token: string | null) => void;
  onNavigate?: (tab: any) => void;
};

export default function AdminSettingsScreen({
  profile,
  onSave,
  onBack,
  onLogout,
  onPushTokenChange,
  onNavigate,
}: Props) {
  const { theme, resolvedTheme, toggleTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const notification = useNotification();

  const [fullName, setFullName] = useState(profile.fullName || "");
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [email, setEmail] = useState(profile.email || "");
  const [propertyAddress, setPropertyAddress] = useState(profile.propertyAddress || "");
  const [landlordSignature, setLandlordSignature] = useState(profile.landlordSignature || "");
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [bankId, setBankId] = useState(profile.bankId || "");
  const [bankAccountNo, setBankAccountNo] = useState(profile.bankAccountNo || "");
  const [bankAccountName, setBankAccountName] = useState(profile.bankAccountName || "");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pushEnabled, setPushPreference] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [automationPolicy, setAutomationPolicy] = useState(AUTOMATION_DEFAULTS);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [dayPicker, setDayPicker] = useState<{ field: AutomationDayField; title: string } | null>(null);

  useEffect(() => {
    void isPushEnabled(profile.id).then(setPushPreference);
  }, [profile.id]);

  useEffect(() => {
    let active = true;
    void adminService.getBillingAutomationPolicy()
      .then((policy) => {
        if (active) setAutomationPolicy({ ...AUTOMATION_DEFAULTS, ...policy });
      })
      .catch(() => notification.error(t("common.error")))
      .finally(() => {
        if (active) setAutomationLoading(false);
      });
    return () => { active = false; };
  }, [notification, t]);

  const handlePushChange = async (next: boolean) => {
    const previous = pushEnabled;
    setPushLoading(true);
    setPushError("");
    try {
      if (next) {
        if ((await requestNotificationPermission()) !== "granted") {
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

  const handleSave = () => {
    if (!fullName.trim()) {
      notification.error(t("common.error"));
      return;
    }
    if ((bankId || bankAccountNo || bankAccountName) && (!bankId || !bankAccountNo || !bankAccountName)) {
      notification.error(t("common.error"));
      return;
    }
    onSave({
      ...profile,
      fullName: fullName.trim(),
      phone: unformatDigits(phone),
      email: email.trim(),
      propertyAddress: propertyAddress.trim(),
      bankId: bankId.trim().toUpperCase(),
      bankAccountNo: bankAccountNo.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
      landlordSignature: landlordSignature.trim(),
    });
    notification.success(t("common.success"));
  };

  const handleSaveAutomation = async () => {
    try {
      setAutomationSaving(true);
      const saved = await adminService.updateBillingAutomationPolicy(automationPolicy);
      setAutomationPolicy({ ...AUTOMATION_DEFAULTS, ...saved });
      notification.success(t("settings.automationSaved"));
    } catch {
      notification.error(t("common.error"));
    } finally {
      setAutomationSaving(false);
    }
  };

  const selectAutomationDay = (day: number) => {
    if (!dayPicker) return;
    setAutomationPolicy((current) => ({ ...current, [dayPicker.field]: day }));
    setDayPicker(null);
  };

  const reminderDay = automationPolicy.invoiceDay === 1
    ? t("settings.previousMonthEnd")
    : automationPolicy.invoiceDay - 1;

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={styles.back}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
          <AppText style={[styles.backText, { color: theme.primary }]}>{t("common.back")}</AppText>
        </Pressable>

        {/* Hero Section */}
        <AnimatedEntry delay={50}>
          <View style={[styles.heroCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={[styles.heroIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Ionicons name="settings" size={26} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.heroTitle, { color: theme.text }]}>Cài đặt Chủ trọ</AppText>
              <AppText style={[styles.heroSubtitle, { color: theme.muted }]}>
                {fullName || "Tài khoản quản trị"}
              </AppText>
            </View>
          </View>
        </AnimatedEntry>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.("services")}
          style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, flexDirection: "row", alignItems: "center", gap: 12 }]}
        >
          <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="construct-outline" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={[styles.cardTitle, { color: theme.text }]}>{t("servicesMobile.title")}</AppText>
            <AppText style={[styles.pushDescription, { color: theme.muted }]}>{t("servicesMobile.shortcutDescription")}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </Pressable>

        {/* Thông tin cá nhân */}
        <AnimatedEntry delay={100}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                <Ionicons name="person" size={18} color="#3B82F6" />
              </View>
              <AppText style={[styles.cardTitle, { color: theme.text }]}>{t("auth.account")}</AppText>
            </View>
            <Field label={t("auth.fullName")} value={fullName} setValue={setFullName} placeholder="Nguyen Van A" style={inputStyle} muted={theme.muted} />
            <Field label={t("auth.phone")} value={phone} setValue={(v: string) => setPhone(formatPhone(v))} placeholder="0901.234.567" keyboardType="number-pad" style={inputStyle} muted={theme.muted} />
            <Field label={t("auth.email")} value={email} setValue={setEmail} placeholder="landlord@email.com" keyboardType="email-address" style={inputStyle} muted={theme.muted} autoCapitalize="none" />
            <Field label="Địa chỉ nhà trọ" value={propertyAddress} setValue={setPropertyAddress} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" style={inputStyle} muted={theme.muted} />
          </View>
        </AnimatedEntry>

        {/* Chữ ký mẫu của Chủ trọ */}
        <AnimatedEntry delay={120}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                <Ionicons name="create" size={18} color="#10B981" />
              </View>
              <View style={styles.automationHeadingCopy}>
                <AppText style={[styles.cardTitle, { color: theme.text }]}>Chữ ký mẫu Chủ trọ (Bên A)</AppText>
                <AppText style={[styles.pushDescription, { color: theme.muted }]}>Tự động đóng dấu chữ ký vào hợp đồng PDF</AppText>
              </View>
            </View>

            {landlordSignature ? (
              <View style={[styles.signatureBox, { borderColor: theme.primary, backgroundColor: "#ffffff" }]}>
                <Image
                  source={{ uri: landlordSignature.startsWith("data:") ? landlordSignature : `data:image/png;base64,${landlordSignature}` }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.signatureEmptyBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Ionicons name="brush-outline" size={28} color={theme.muted} />
                <AppText style={[styles.signatureEmptyText, { color: theme.muted }]}>Chưa thiết lập chữ ký mẫu</AppText>
              </View>
            )}

            <View style={styles.signatureActions}>
              <AppButton
                variant={landlordSignature ? "secondary" : "primary"}
                icon="brush-outline"
                onPress={() => setSignatureModalVisible(true)}
                style={styles.signatureBtn}
              >
                {landlordSignature ? "Ký lại / Đổi chữ ký" : "Vẽ hoặc tải chữ ký"}
              </AppButton>
              {landlordSignature ? (
                <AppButton
                  variant="ghost"
                  icon="trash-outline"
                  onPress={() => setLandlordSignature("")}
                  style={styles.signatureDeleteBtn}
                >
                  Xóa
                </AppButton>
              ) : null}
            </View>
          </View>
        </AnimatedEntry>

        {/* Tài khoản VietQR */}
        <AnimatedEntry delay={150}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                <Ionicons name="qr-code" size={18} color="#8B5CF6" />
              </View>
              <AppText style={[styles.cardTitle, { color: theme.text }]}>Tài khoản nhận tiền (VietQR)</AppText>
            </View>
            <View style={[styles.note, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="information-circle" size={18} color={theme.primary} />
              <AppText style={[styles.noteText, { color: theme.text }]}>
                Mã VietQR động trên hóa đơn sẽ tự động tạo theo thông tin ngân hàng này.
              </AppText>
            </View>
            <Field label="Mã ngân hàng (BIN / Code)" value={bankId} setValue={setBankId} placeholder="MB / VCB / TCB" style={inputStyle} muted={theme.muted} autoCapitalize="characters" />
            <Field label="Số tài khoản" value={bankAccountNo} setValue={setBankAccountNo} placeholder="0123456789" keyboardType="number-pad" style={inputStyle} muted={theme.muted} />
            <Field label="Tên chủ tài khoản" value={bankAccountName} setValue={setBankAccountName} placeholder="NGUYEN VAN A" style={inputStyle} muted={theme.muted} autoCapitalize="characters" />
          </View>
        </AnimatedEntry>

        {/* Tự động hóa hóa đơn */}
        <AnimatedEntry delay={200}>
          {automationLoading ? (
            <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]} accessibilityLabel={t("common.loading")}>
              <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: "48%" }]} />
              <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: "100%" }]} />
              <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: "74%" }]} />
            </View>
          ) : (
            <>
              <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <View style={styles.sectionHeading}>
                  <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name="receipt-outline" size={18} color={theme.primary} /></View>
                  <View style={styles.automationHeadingCopy}>
                    <AppText style={[styles.cardTitle, { color: theme.text }]}>{t("settings.autoInvoice")}</AppText>
                    <AppText style={[styles.pushDescription, { color: theme.muted }]}>{t("settings.autoInvoiceDescription")}</AppText>
                  </View>
                  <Switch value={automationPolicy.autoInvoiceEnabled} onValueChange={(value) => setAutomationPolicy((current) => ({ ...current, autoInvoiceEnabled: value }))} trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: theme.primary }} thumbColor="#FFFFFF" />
                </View>
                <DaySettingField label={t("settings.invoiceDay")} value={automationPolicy.invoiceDay} disabled={!automationPolicy.autoInvoiceEnabled} theme={theme} onPress={() => setDayPicker({ field: "invoiceDay", title: t("settings.invoiceDay") })} />
                <DaySettingField label={t("settings.dueDay")} value={automationPolicy.dueDay} disabled={!automationPolicy.autoInvoiceEnabled} theme={theme} onPress={() => setDayPicker({ field: "dueDay", title: t("settings.dueDay") })} />
                <View style={[styles.note, { backgroundColor: theme.primarySoft }]}><Ionicons name="calendar-outline" size={18} color={theme.primary} /><AppText style={[styles.noteText, { color: theme.text }]}>{t("settings.invoiceAutomationFlow", { reminderDay, invoiceDay: automationPolicy.invoiceDay })}</AppText></View>
              </View>

              <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <View style={styles.sectionHeading}>
                  <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name="notifications-outline" size={18} color={theme.primary} /></View>
                  <View style={styles.automationHeadingCopy}>
                    <AppText style={[styles.cardTitle, { color: theme.text }]}>{t("settings.autoRemind")}</AppText>
                    <AppText style={[styles.pushDescription, { color: theme.muted }]}>{t("settings.autoRemindDescription")}</AppText>
                  </View>
                  <Switch value={automationPolicy.autoRemindEnabled} onValueChange={(value) => setAutomationPolicy((current) => ({ ...current, autoRemindEnabled: value }))} trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: theme.primary }} thumbColor="#FFFFFF" />
                </View>
                <DaySettingField label={t("settings.remindDaysBeforeDue")} value={automationPolicy.remindDaysBeforeDue} disabled={!automationPolicy.autoRemindEnabled} theme={theme} onPress={() => setDayPicker({ field: "remindDaysBeforeDue", title: t("settings.remindDaysBeforeDue") })} />
                <View style={[styles.note, { backgroundColor: theme.primarySoft }]}><Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} /><AppText style={[styles.noteText, { color: theme.text }]}>{t("settings.reminderScheduleHint", { days: automationPolicy.remindDaysBeforeDue })}</AppText></View>
              </View>

              <AppButton icon="flash-outline" loading={automationSaving} onPress={() => void handleSaveAutomation()} style={styles.automationSave}>{t("settings.saveAutomation")}</AppButton>
            </>
          )}
        </AnimatedEntry>

        {/* Tùy chọn hệ thống */}
        <AnimatedEntry delay={250}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="options" size={18} color="#F59E0B" />
              </View>
              <AppText style={[styles.cardTitle, { color: theme.text }]}>{t("account.appPreferences")}</AppText>
            </View>

            {/* Language switch row */}
            <View style={styles.pushRow}>
              <View style={styles.pushCopy}>
                <AppText style={[styles.pushTitle, { color: theme.text }]}>{t("common.language")}</AppText>
              </View>
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

            {/* Dark mode switch row */}
            <View style={[styles.pushRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}>
              <View style={styles.pushCopy}>
                <AppText style={[styles.pushTitle, { color: theme.text }]}>{t("account.themeMode")}</AppText>
                <AppText style={[styles.pushDescription, { color: theme.muted }]}>
                  {isDark ? "Chế độ Tối (Dark)" : "Chế độ Sáng (Light)"}
                </AppText>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: "#E5E7EB", true: "#10B981" }} thumbColor="#FFFFFF" />
            </View>

            {/* Push notification row */}
            <View style={[styles.pushRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}>
              <View style={styles.pushCopy}>
                <AppText style={[styles.pushTitle, { color: theme.text }]}>{t("account.pushNotifications")}</AppText>
                <AppText style={[styles.pushDescription, { color: theme.muted }]}>Thông báo sự cố & thanh toán</AppText>
              </View>
              {pushLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Switch
                  value={pushEnabled}
                  onValueChange={(val) => void handlePushChange(val)}
                  trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>
            {pushError ? (
              <AppText accessibilityRole="alert" style={[styles.pushError, { color: theme.danger }]}>
                {pushError}
              </AppText>
            ) : null}
          </View>
        </AnimatedEntry>

        {/* Nút lưu */}
        <AnimatedEntry delay={300}>
          <AppButton icon="save-outline" onPress={handleSave}>
            {t("common.save")}
          </AppButton>

          {/* Đổi mật khẩu */}
          <Pressable
            accessibilityRole="button"
            style={[styles.security, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            onPress={() => setPasswordVisible(true)}
          >
            <View style={styles.securityLead}>
              <View style={[styles.sectionIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="lock-closed" size={18} color="#F59E0B" />
              </View>
              <AppText style={[styles.securityText, { color: theme.text }]}>{t("account.changePassword")}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>

          {/* Nút Đăng xuất */}
          <AppButton icon="log-out-outline" variant="danger" onPress={onLogout} style={styles.logout}>
            {t("account.logout")}
          </AppButton>
        </AnimatedEntry>
      </ScrollView>

      <ChangePasswordModal visible={passwordVisible} onClose={() => setPasswordVisible(false)} />
      <SignaturePadModal visible={signatureModalVisible} onSave={(sig) => setLandlordSignature(sig)} onClose={() => setSignatureModalVisible(false)} />
      <DayPickerModal visible={dayPicker !== null} title={dayPicker?.title || ""} closeLabel={t("common.close")} selected={dayPicker ? automationPolicy[dayPicker.field] : 1} theme={theme} onSelect={selectAutomationDay} onClose={() => setDayPicker(null)} />
    </>
  );
}

function DaySettingField({ label, value, disabled, theme, onPress }: any) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.dayField, { borderColor: theme.border, backgroundColor: theme.background }, disabled && styles.controlDisabled, pressed && !disabled && styles.controlPressed]}>
      <View><AppText style={[styles.dayFieldLabel, { color: theme.muted }]}>{label}</AppText><AppText style={[styles.dayFieldValue, { color: theme.text }]}>{value}</AppText></View>
      <Ionicons name="chevron-down" size={18} color={theme.primary} />
    </Pressable>
  );
}

function DayPickerModal({ visible, title, closeLabel, selected, theme, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.dayPickerSheet, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={styles.dayPickerHeader}><AppText style={[styles.dayPickerTitle, { color: theme.text }]}>{title}</AppText><Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.modalClose}><Ionicons name="close" size={20} color={theme.text} /></Pressable></View>
          <ScrollView style={styles.dayPickerList} showsVerticalScrollIndicator={false}>
            {AUTOMATION_DAYS.map((day) => {
              const active = day === selected;
              return <Pressable key={day} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onSelect(day)} style={[styles.dayOption, { borderBottomColor: theme.border }, active && { backgroundColor: theme.primarySoft }]}><AppText style={[styles.dayOptionText, { color: active ? theme.primary : theme.text }]}>{day}</AppText>{active ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}</Pressable>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, setValue, placeholder, keyboardType, style, muted, autoCapitalize }: any) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <AppTextInput
        style={style}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingTop: 24, paddingBottom: 48 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44, marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: "900" },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontWeight: "900" },
  heroSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  bentoSection: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sectionIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  field: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontWeight: "600" },
  note: { flexDirection: "row", gap: 8, borderRadius: 14, padding: 12, marginTop: 8, alignItems: "center" },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  security: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  securityLead: { flexDirection: "row", alignItems: "center", gap: 10 },
  securityText: { fontSize: 14, fontWeight: "800" },
  logout: { marginTop: 14 },
  pushRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingVertical: 8 },
  pushCopy: { flex: 1 },
  pushTitle: { fontSize: 14, fontWeight: "800" },
  pushDescription: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  pushError: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  langSegmented: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3 },
  langPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9 },
  langPillText: { fontSize: 11, fontWeight: "900" },
  automationHeadingCopy: { flex: 1 },
  automationSave: { marginBottom: 16 },
  skeletonLine: { height: 14, borderRadius: 7, marginVertical: 7, opacity: 0.7 },
  dayField: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 },
  dayFieldLabel: { fontSize: 11, fontWeight: "700" },
  dayFieldValue: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  controlDisabled: { opacity: 0.45 },
  controlPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4, 16, 14, 0.52)" },
  dayPickerSheet: { maxHeight: "72%", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 },
  dayPickerHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayPickerTitle: { flex: 1, fontSize: 17, fontWeight: "900" },
  modalClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dayPickerList: { maxHeight: 430 },
  dayOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  dayOptionText: { fontSize: 15, fontWeight: "800" },
  signatureBox: { height: 110, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginTop: 12, padding: 8, overflow: "hidden" },
  signatureImage: { width: "100%", height: "100%" },
  signatureEmptyBox: { height: 100, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  signatureEmptyText: { fontSize: 12, fontWeight: "600" },
  signatureActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  signatureBtn: { flex: 1, minHeight: 44 },
  signatureDeleteBtn: { minWidth: 70, minHeight: 44 },
});
