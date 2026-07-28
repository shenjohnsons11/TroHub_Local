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
} from "react-native";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import TroHubLogo from "../components/TroHubLogo";
import AppButton from "../components/ui/AppButton";
import { FONT_FAMILIES } from "../constants/theme";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";

type Props = {
  onLogin: (identifier: string, password: string) => Promise<void>;
};

export default function LoginScreen({ onLogin }: Props) {
  const notification = useNotification();
  const { theme, themeMode } = useAppTheme();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const validate = () => {
    const nextIdentifierError = identifier.trim()
      ? ""
      : "Vui lòng nhập số điện thoại hoặc tên đăng nhập";
    const nextPasswordError = !password
      ? "Vui lòng nhập mật khẩu"
      : password.length < 6
        ? "Mật khẩu phải từ 6 ký tự trở lên"
        : "";

    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);
    return !nextIdentifierError && !nextPasswordError;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onLogin(identifier.trim(), password);
      notification.success("Đăng nhập thành công.");
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể đăng nhập. Vui lòng thử lại."), {
        title: "Đăng nhập thất bại",
      });
    } finally {
      setIsSubmitting(false);
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
              <Text style={[styles.eyebrow, { color: theme.primary }]}>TRO HUB</Text>
              <Text style={[styles.title, { color: theme.text }]}>Đăng nhập</Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Sử dụng tài khoản do Chủ trọ hoặc Admin cung cấp.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Số điện thoại hoặc tên đăng nhập
                </Text>
                <TextInput
                  accessibilityLabel="Số điện thoại hoặc tên đăng nhập"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    if (identifierError) setIdentifierError("");
                  }}
                  placeholder="Ví dụ: 0901234567 hoặc nguyenvana"
                  placeholderTextColor={theme.muted}
                  returnKeyType="next"
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
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {identifierError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>Mật khẩu</Text>
                <TextInput
                  accessibilityLabel="Mật khẩu"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError("");
                  }}
                  onSubmitEditing={handleSubmit}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={theme.muted}
                  returnKeyType="go"
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
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {passwordError}
                  </Text>
                ) : null}
              </View>

              <AppButton
                disabled={isSubmitting}
                icon="key-outline"
                loading={isSubmitting}
                onPress={handleSubmit}
                style={styles.primaryButton}
              >
                Đăng nhập
              </AppButton>

              <AppButton
                disabled={isSubmitting}
                icon="help-circle-outline"
                onPress={() => setForgotVisible(true)}
                style={styles.forgotButton}
                variant="ghost"
              >
                Quên mật khẩu?
              </AppButton>

              <View
                style={[
                  styles.accountNotice,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Text style={[styles.accountNoticeText, { color: theme.text }]}>
                  Chưa có tài khoản? Hãy liên hệ Chủ trọ để được cấp quyền truy
                  cập.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 16,
    fontWeight: "800",
  },
  forgotButton: {
    marginTop: 8,
  },
  forgotText: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: 14,
    fontWeight: "800",
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
});
