import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import TroHubLogo from "../components/TroHubLogo";
import AppButton from "../components/ui/AppButton";
import CCCDScannerModal from "../components/CCCDScannerModal";
import { FONT_FAMILIES } from "../constants/theme";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";
import { authService } from "../services/authService";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../contexts/LanguageContext";

// Vietnamese identifier label: Số điện thoại hoặc Email.

type Props = {
  onLogin: (identifier: string, password: string) => Promise<void>;
};

export default function LoginScreen({ onLogin }: Props) {
  const notification = useNotification();
  const { theme, themeMode } = useAppTheme();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [idCard, setIdCard] = useState("");
  
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [idCardError, setIdCardError] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const validateLogin = () => {
    const nextIdentifierError = identifier.trim()
      ? ""
      : "Vui lòng nhập số điện thoại hoặc Email";
    const nextPasswordError = !password
      ? "Vui lòng nhập mật khẩu"
      : password.length < 6
        ? "Mật khẩu phải từ 6 ký tự trở lên"
        : "";

    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);
    return !nextIdentifierError && !nextPasswordError;
  };

  const validateRegister = () => {
    let isValid = true;
    
    if (!fullName.trim()) {
      setFullNameError("Vui lòng nhập họ và tên");
      isValid = false;
    } else {
      setFullNameError("");
    }

    const cleanPhone = unformatDigits(identifier);
    if (cleanPhone.length !== 10) {
      setIdentifierError("Số điện thoại phải gồm đúng 10 chữ số");
      isValid = false;
    } else {
      setIdentifierError("");
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Email không đúng định dạng");
      isValid = false;
    } else {
      setEmailError("");
    }

    const cleanId = unformatDigits(idCard);
    if (cleanId.length !== 12) {
      setIdCardError("CCCD phải gồm đúng 12 chữ số");
      isValid = false;
    } else {
      setIdCardError("");
    }

    if (!password || password.length < 6) {
      setPasswordError("Mật khẩu phải từ 6 ký tự trở lên");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (mode === "login") {
      if (!validateLogin()) return;

      try {
        setIsSubmitting(true);
        const cleanIdentifier = identifier.includes("@")
          ? identifier.trim().toLowerCase()
          : unformatDigits(identifier);
        await onLogin(cleanIdentifier, password);
        notification.success("Đăng nhập thành công.");
      } catch (error) {
        notification.error(getNotificationMessage(error, "Không thể đăng nhập. Vui lòng thử lại."), {
          title: "Đăng nhập thất bại",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!validateRegister()) return;

      try {
        setIsSubmitting(true);
        await authService.registerTenant({
          fullName: fullName.trim(),
          phone: unformatDigits(identifier),
          email: email.trim(),
          idCard: unformatDigits(idCard),
          password,
        });
        notification.success("Đăng ký tài khoản Người thuê thành công!");
        setMode("login");
        setPassword("");
      } catch (error) {
        notification.error(error instanceof Error ? error.message : "Đăng ký tài khoản thất bại.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <ImageBackground
              imageStyle={styles.brandArtwork}
              source={require("../assets/images/trohub-property-loading.png")}
              style={[
                styles.brandPanel,
                { backgroundColor: themeMode === "dark" ? theme.surfaceElevated : "#20302A" },
              ]}
            >
              <View style={styles.brandOverlay} />
              <TroHubLogo size="large" inverted />
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle}>Mọi việc ở trọ, rõ ràng hơn.</Text>
                <Text style={styles.brandDescription}>
                  Theo dõi hợp đồng, hóa đơn và yêu cầu sửa chữa trong một ứng
                  dụng thống nhất.
                </Text>
              </View>
              <View style={styles.brandRule}>
                <View style={[styles.rulePrimary, { backgroundColor: theme.primary }]} />
                <View style={[styles.rulePositive, { backgroundColor: theme.positive }]} />
              </View>
            </ImageBackground>

            <View
              style={[
                styles.formPanel,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={{ alignItems: "flex-end", marginBottom: 14 }}><LanguageToggle /></View>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>TRO HUB</Text>
              <Text style={[styles.title, { color: theme.text }]}>
                {mode === "login" ? t("login") : t("register")}
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                {mode === "login"
                  ? t("loginDescription")
                  : t("registerDescription")}
              </Text>

              {mode === "register" && (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>{t("fullName")}</Text>
                  <TextInput
                    editable={!isSubmitting}
                    onChangeText={(value) => {
                      setFullName(value);
                      if (fullNameError) setFullNameError("");
                    }}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    placeholderTextColor={theme.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: fullNameError ? theme.danger : theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={fullName}
                  />
                  {fullNameError ? (
                    <Text style={[styles.errorText, { color: theme.danger }]}>{fullNameError}</Text>
                  ) : null}
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {mode === "login" ? t("phoneOrEmail") : t("phone")}
                </Text>
                <TextInput
                  accessibilityLabel={mode === "login" ? t("phoneOrEmail") : t("phone")}
                  keyboardType={mode === "login" ? "email-address" : "phone-pad"}
                  autoCapitalize={mode === "login" ? "none" : undefined}
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setIdentifier(
                      mode === "register" || /^[\d.\s-]*$/.test(value)
                        ? formatPhone(value)
                        : value,
                    );
                    if (identifierError) setIdentifierError("");
                  }}
                  placeholder="Ví dụ: 0901234567"
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: identifierError ? theme.danger : theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={identifier}
                />
                {identifierError ? (
                  <Text style={[styles.errorText, { color: theme.danger }]}>{identifierError}</Text>
                ) : null}
              </View>

              {mode === "register" && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>{t("email")}</Text>
                    <TextInput
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isSubmitting}
                      onChangeText={(value) => {
                        setEmail(value);
                        if (emailError) setEmailError("");
                      }}
                      placeholder="Ví dụ: tenant@gmail.com"
                      placeholderTextColor={theme.muted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: emailError ? theme.danger : theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={email}
                    />
                    {emailError ? (
                      <Text style={[styles.errorText, { color: theme.danger }]}>{emailError}</Text>
                    ) : null}
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>{t("idCard")}</Text>
                    <View style={styles.identityRow}>
                      <TextInput
                        keyboardType="numeric"
                        editable={!isSubmitting}
                        onChangeText={(value) => {
                          setIdCard(formatCCCD(value));
                          if (idCardError) setIdCardError("");
                        }}
                        placeholder="Nhập 12 số CCCD"
                        placeholderTextColor={theme.muted}
                        style={[styles.input, styles.identityInput, { backgroundColor: theme.surfaceElevated, borderColor: idCardError ? theme.danger : theme.border, color: theme.text }]}
                        value={idCard}
                      />
                      <Pressable accessibilityRole="button" accessibilityLabel="Quét CCCD bằng camera" disabled={isSubmitting} onPress={() => setScannerVisible(true)} style={[styles.scanButton, { backgroundColor: theme.primarySoft }]}>
                        <Text style={[styles.scanButtonText, { color: theme.primary }]}>📷 Quét CCCD (Camera)</Text>
                      </Pressable>
                    </View>
                    {idCardError ? (
                      <Text style={[styles.errorText, { color: theme.danger }]}>{idCardError}</Text>
                    ) : null}
                  </View>
                </>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{t("password")}</Text>
                <TextInput
                  accessibilityLabel={t("password")}
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError("");
                  }}
                  onSubmitEditing={handleSubmit}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={theme.muted}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: passwordError ? theme.danger : theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={password}
                />
                {passwordError ? (
                  <Text style={[styles.errorText, { color: theme.danger }]}>{passwordError}</Text>
                ) : null}
              </View>

              <AppButton
                disabled={isSubmitting}
                icon={mode === "login" ? "key-outline" : "person-add-outline"}
                loading={isSubmitting}
                onPress={handleSubmit}
                style={styles.primaryButton}
              >
                {mode === "login" ? t("login") : t("signUpNow")}
              </AppButton>

              {mode === "login" && (
                <AppButton
                  disabled={isSubmitting}
                  icon="help-circle-outline"
                  onPress={() => setForgotVisible(true)}
                  style={styles.forgotButton}
                  variant="ghost"
                >
                  {t("forgotPassword")}
                </AppButton>
              )}

              <View style={styles.toggleContainer}>
                {mode === "login" ? (
                  <Pressable onPress={() => { setMode("register"); setIdentifierError(""); setPasswordError(""); }}>
                    <Text style={[styles.toggleText, { color: theme.primary }]}>{t("tenantRegister")}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => { setMode("login"); setIdentifierError(""); setPasswordError(""); }}>
                    <Text style={[styles.toggleText, { color: theme.primary }]}>{t("backToLogin")}</Text>
                  </Pressable>
                )}
              </View>

              <View
                style={[
                  styles.accountNotice,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Text style={[styles.accountNoticeText, { color: theme.text }]}>
                  {mode === "login" 
                    ? "Chưa có tài khoản? Người thuê có thể tự đăng ký ở trên, hoặc được tạo bởi Chủ trọ."
                    : "Hệ thống bảo mật dữ liệu Người thuê theo tiêu chuẩn mã hóa SSL/TLS."}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        onClose={() => setForgotVisible(false)}
        visible={forgotVisible}
      />
      <CCCDScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(cccdNumber) => { setIdCard(formatCCCD(cccdNumber)); setIdCardError(""); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  identityRow: { flexDirection: "row", gap: 8 },
  identityInput: { flex: 1 },
  scanButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingHorizontal: 10 },
  scanButtonText: { fontSize: 11, fontWeight: "800" },
  safe: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  brandPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 210,
    overflow: "hidden",
    padding: 24,
  },
  brandArtwork: { opacity: 0.55 },
  brandOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 55, 47, 0.72)",
  },
  brandCopy: {
    marginTop: 28,
    maxWidth: 420,
  },
  brandTitle: {
    color: "#F4F5F3",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  brandDescription: {
    color: "#C8CDD0",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  brandRule: {
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    left: 24,
    position: "absolute",
    right: 24,
  },
  rulePrimary: {
    borderRadius: 2,
    flex: 1.6,
    height: 5,
  },
  rulePositive: {
    borderRadius: 2,
    flex: 0.6,
    height: 5,
  },
  formPanel: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 24,
    shadowColor: "#04100E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  eyebrow: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 38,
    marginTop: 5,
  },
  subtitle: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
    marginTop: 4,
  },
  field: {
    marginTop: 14,
  },
  label: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 15,
  },
  errorText: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 24,
  },
  forgotButton: {
    marginTop: 8,
  },
  accountNotice: {
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountNoticeText: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  toggleContainer: {
    marginTop: 18,
    alignItems: "center",
  },
  toggleText: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "800",
  },
});
