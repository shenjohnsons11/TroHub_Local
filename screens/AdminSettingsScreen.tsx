import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { UserProfile } from "../types/UserProfile";
import AppButton from "../components/ui/AppButton";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { useTranslation } from "../contexts/LanguageContext";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS, SYSTEM_ICONS } from "../constants/featureIcons";

const POPULAR_BANKS = [
  { code: "MB", name: "MBBank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB", name: "VietinBank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
];

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onLogout?: () => void;
  onPushTokenChange?: (token: string | null) => void;
  onNavigate?: (tab: any) => void;
};

export default function AdminSettingsScreen({
  profile,
  onSave,
  onBack,
}: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const { t } = useTranslation();
  const notification = useNotification();

  const [bankId, setBankId] = useState(profile.bankId || "");
  const [bankAccountNo, setBankAccountNo] = useState(profile.bankAccountNo || "");
  const [bankAccountName, setBankAccountName] = useState(profile.bankAccountName || "");
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const cleanBankId = bankId.trim().toUpperCase();
  const cleanAccountNo = bankAccountNo.trim();
  const cleanAccountName = bankAccountName.trim().toUpperCase();

  const isConfigured = Boolean(cleanBankId && cleanAccountNo && cleanAccountName);

  const qrImageUrl = isConfigured
    ? `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-compact2.png?amount=0&addInfo=Thanh%20toan%20tien%20phong&accountName=${encodeURIComponent(cleanAccountName)}`
    : "";

  const handleSave = async () => {
    if (cleanBankId || cleanAccountNo || cleanAccountName) {
      if (!cleanBankId) {
        notification.error("Vui lòng nhập hoặc chọn mã ngân hàng (BIN / Code)");
        return;
      }
      if (!cleanAccountNo) {
        notification.error("Vui lòng nhập số tài khoản ngân hàng");
        return;
      }
      if (!cleanAccountName) {
        notification.error("Vui lòng nhập tên chủ tài khoản");
        return;
      }
    }

    try {
      setSaving(true);
      const updated: UserProfile = {
        ...profile,
        bankId: cleanBankId,
        bankAccountNo: cleanAccountNo,
        bankAccountName: cleanAccountName,
      };
      await onSave(updated);
      notification.success("Đã lưu thông tin tài khoản nhận tiền (VietQR)!");
    } catch (err: any) {
      notification.error(err?.message || "Không thể lưu thông tin nhận tiền");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Nút Quay lại */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={styles.back}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
          <AppText style={[styles.backText, { color: theme.primary }]}>
            {t("common.back")}
          </AppText>
        </Pressable>

        {/* Hero Section */}
        <AnimatedEntry delay={40}>
          <View style={[styles.heroCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <FeatureIconBox token={FEATURE_ICONS.vietqr} size={28} accessibilityLabel="Tài khoản nhận tiền VietQR" />
            <View style={{ flex: 1 }}>
              <AppText style={[styles.heroTitle, { color: theme.text }]}>
                Tài khoản nhận tiền (VietQR)
              </AppText>
              <AppText style={[styles.heroSubtitle, { color: theme.muted }]}>
                Cấu hình tài khoản ngân hàng để tự động xuất mã QR thanh toán trên hóa đơn & hợp đồng
              </AppText>
            </View>
          </View>
        </AnimatedEntry>

        {/* Card Form Cấu hình VietQR */}
        <AnimatedEntry delay={90}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <Ionicons name="card-outline" size={20} color={theme.primary} />
              <AppText style={[styles.cardTitle, { color: theme.text }]}>
                Thông tin tài khoản ngân hàng
              </AppText>
            </View>

            <View style={[styles.note, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="information-circle" size={18} color={theme.primary} />
              <AppText style={[styles.noteText, { color: theme.text }]}>
                Mã VietQR động trên hóa đơn hàng tháng sẽ tự động khớp theo thông tin ngân hàng này. Khách thuê quét mã là tiền về thẳng tài khoản của bạn.
              </AppText>
            </View>

            {/* Chọn nhanh ngân hàng phổ biến */}
            <View style={styles.quickBankWrapper}>
              <AppText style={[styles.quickBankLabel, { color: theme.muted }]}>
                Gợi ý ngân hàng phổ biến:
              </AppText>
              <View style={styles.quickBankChips}>
                {POPULAR_BANKS.map((b) => {
                  const isSelected = cleanBankId === b.code;
                  return (
                    <Pressable
                      key={b.code}
                      onPress={() => setBankId(b.code)}
                      style={[
                        styles.bankChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.bankChipText,
                          { color: isSelected ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        {b.code}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Trường nhập liệu */}
            <View style={styles.field}>
              <AppText style={[styles.label, { color: theme.muted }]}>
                Mã ngân hàng (BIN / Viết tắt)
              </AppText>
              <AppTextInput
                style={inputStyle}
                value={bankId}
                onChangeText={setBankId}
                placeholder="MB / VCB / TCB / BIDV..."
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.field}>
              <AppText style={[styles.label, { color: theme.muted }]}>
                Số tài khoản ngân hàng
              </AppText>
              <AppTextInput
                style={inputStyle}
                value={bankAccountNo}
                onChangeText={setBankAccountNo}
                placeholder="Nhập số tài khoản (ví dụ: 0123456789)"
                placeholderTextColor={theme.muted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <AppText style={[styles.label, { color: theme.muted }]}>
                Tên chủ tài khoản (In hoa không dấu)
              </AppText>
              <AppTextInput
                style={inputStyle}
                value={bankAccountName}
                onChangeText={setBankAccountName}
                placeholder="NGUYEN VAN A"
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </AnimatedEntry>

        {/* Card Xem trước thẻ ngân hàng & Mã QR Live */}
        <AnimatedEntry delay={140}>
          <View style={[styles.bentoSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
              <AppText style={[styles.cardTitle, { color: theme.text }]}>
                Xem trước thẻ nhận tiền & Mã VietQR
              </AppText>
            </View>

            {/* Card ATM mô phỏng */}
            <LinearGradient
              colors={
                isDark
                  ? ["#064e3b", "#022c22"]
                  : ["#10b981", "#047857"]
              }
              style={styles.virtualCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardChip}>
                  <Ionicons name="hardware-chip-outline" size={26} color="#fbbf24" />
                  <AppText style={styles.cardBankTag}>
                    {cleanBankId || "NGÂN HÀNG"}
                  </AppText>
                </View>
                <View style={styles.vietqrBadge}>
                  <AppText style={styles.vietqrBadgeText}>VietQR</AppText>
                </View>
              </View>

              <View style={styles.cardBody}>
                <AppText style={styles.cardNumber}>
                  {cleanAccountNo || "•••• •••• •••• ••••"}
                </AppText>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <AppText style={styles.cardLabel}>CHỦ TÀI KHOẢN</AppText>
                  <AppText style={styles.cardHolderName} numberOfLines={1}>
                    {cleanAccountName || "CHƯA THIẾT LẬP"}
                  </AppText>
                </View>
                <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>

            {/* Live QR Preview */}
            {isConfigured ? (
              <View style={[styles.qrPreviewBox, { backgroundColor: "#FFFFFF", borderColor: theme.border }]}>
                <AppText style={styles.qrTitle}>MÃ VIETQR NHẬN TIỀN MẪU</AppText>
                <View style={styles.qrImageContainer}>
                  {qrLoading && (
                    <ActivityIndicator size="small" color="#10B981" style={StyleSheet.absoluteFill} />
                  )}
                  <Image
                    source={{ uri: qrImageUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                    onLoadStart={() => setQrLoading(true)}
                    onLoadEnd={() => setQrLoading(false)}
                  />
                </View>
                <View style={styles.qrBadgeSuccess}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <AppText style={styles.qrBadgeText}>
                    Sẵn sàng tạo mã động trên mọi hóa đơn
                  </AppText>
                </View>
              </View>
            ) : (
              <View style={[styles.qrEmptyBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Ionicons name="qr-code-outline" size={36} color={theme.muted} />
                <AppText style={[styles.qrEmptyText, { color: theme.muted }]}>
                  Điền đầy đủ Ngân hàng, Số TK và Tên chủ TK bên trên để kích hoạt xem trước mã VietQR
                </AppText>
              </View>
            )}
          </View>
        </AnimatedEntry>

        {/* Nút Lưu cấu hình */}
        <AnimatedEntry delay={180}>
          <AppButton
            icon="save-outline"
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          >
            Lưu cấu hình nhận tiền
          </AppButton>
        </AnimatedEntry>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingTop: 24, paddingBottom: 48 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 44,
    marginBottom: 8,
  },
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
  heroTitle: { fontSize: 17, fontWeight: "900" },
  heroSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 17 },
  bentoSection: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  note: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  quickBankWrapper: { marginBottom: 12 },
  quickBankLabel: { fontSize: 11, fontWeight: "700", marginBottom: 8 },
  quickBankChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bankChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bankChipText: { fontSize: 12, fontWeight: "800" },
  field: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  virtualCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardChip: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardBankTag: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  vietqrBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vietqrBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardBody: { marginVertical: 18 },
  cardNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.8,
  },
  cardHolderName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginTop: 2,
    maxWidth: 220,
  },
  qrPreviewBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  qrImageContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  qrImage: { width: "100%", height: "100%" },
  qrBadgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  qrBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
  },
  qrEmptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  saveBtn: { marginTop: 4, marginBottom: 20 },
});
