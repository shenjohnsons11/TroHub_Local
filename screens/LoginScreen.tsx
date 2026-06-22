import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../constants/theme";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { authService } from "../services/authService";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export default function LoginScreen({ onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false);

  // Đăng nhập
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");

  // Đăng ký (thêm các trường bắt buộc)
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCccd, setRegCccd] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Errors
  const [loginEmailError, setLoginEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [regEmailError, setRegEmailError] = useState("");
  const [regPhoneError, setRegPhoneError] = useState("");
  const [regCccdError, setRegCccdError] = useState("");
  const [regPasswordError, setRegPasswordError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const clearErrors = () => {
    setLoginEmailError("");
    setPasswordError("");
    setFullNameError("");
    setRegEmailError("");
    setRegPhoneError("");
    setRegCccdError("");
    setRegPasswordError("");
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateLogin = () => {
    let isValid = true;

    if (!loginEmail.trim()) {
      setLoginEmailError("Vui lòng nhập thông tin đăng nhập");
      isValid = false;
    } else {
      setLoginEmailError("");
    }

    if (!password.trim()) {
      setPasswordError("Vui lòng nhập mật khẩu");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Mật khẩu phải từ 6 ký tự trở lên");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const validateRegister = () => {
    let isValid = true;

    if (!fullName.trim()) {
      setFullNameError("Vui lòng nhập họ và tên");
      isValid = false;
    } else {
      setFullNameError("");
    }

    if (!regEmail.trim()) {
      setRegEmailError("Vui lòng nhập email");
      isValid = false;
    } else if (!isValidEmail(regEmail.trim())) {
      setRegEmailError("Email không đúng định dạng");
      isValid = false;
    } else {
      setRegEmailError("");
    }

    const rawPhone = regPhone.replace(/\D/g, '');
    if (!rawPhone) {
      setRegPhoneError("Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (rawPhone.length !== 10) {
      setRegPhoneError("Số điện thoại phải gồm đúng 10 chữ số");
      isValid = false;
    } else {
      setRegPhoneError("");
    }

    const rawCccd = regCccd.replace(/\D/g, '');
    if (!rawCccd) {
      setRegCccdError("Vui lòng nhập số CMND/CCCD");
      isValid = false;
    } else if (rawCccd.length !== 12) {
      setRegCccdError("Số CCCD phải gồm đúng 12 chữ số");
      isValid = false;
    } else {
      setRegCccdError("");
    }

    if (!regPassword.trim()) {
      setRegPasswordError("Vui lòng nhập mật khẩu");
      isValid = false;
    } else if (regPassword.length < 6) {
      setRegPasswordError("Mật khẩu phải từ 6 ký tự trở lên");
      isValid = false;
    } else {
      setRegPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (isRegister) {
        if (!validateRegister()) return;

        await authService.register({
          email: regEmail.trim(),
          password: regPassword,
          fullName: fullName.trim(),
          phone: regPhone.replace(/\D/g, ''),
          idCard: regCccd.replace(/\D/g, ''),
        });
        Alert.alert(
          "Thành công",
          "Đăng ký tài khoản khách thuê thành công!\nVui lòng đăng nhập bằng email vừa đăng ký."
        );
        // Tự động điền email vào ô đăng nhập
        setLoginEmail(regEmail.trim());
        setIsRegister(false);
        // Reset form đăng ký
        setFullName("");
        setRegEmail("");
        setRegPhone("");
        setRegCccd("");
        setRegPassword("");
      } else {
        if (!validateLogin()) return;

        await onLogin(loginEmail.trim(), password.trim());
      }
    } catch (error) {
      console.log(isRegister ? "Lỗi đăng ký:" : "Lỗi đăng nhập:", error);
      Alert.alert(
        "Lỗi",
        error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>TH</Text>
              <Text style={styles.logoText}>TroHub</Text>
            </View>

            <Text style={styles.title}>
              {isRegister ? "Đăng ký tài khoản" : "Đăng nhập hệ thống TroHub"}
            </Text>

            <View style={styles.form}>
              {isRegister ? (
                <>
                  {/* ===== FORM ĐĂNG KÝ ===== */}
                  <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, fullNameError ? styles.inputError : null]}
                    value={fullName}
                    onChangeText={(v) => { setFullName(v); if (fullNameError) setFullNameError(""); }}
                    placeholder="Nhập họ và tên đầy đủ"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}

                  <Text style={styles.label}>Email (tên đăng nhập) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, regEmailError ? styles.inputError : null]}
                    value={regEmail}
                    onChangeText={(v) => { setRegEmail(v); if (regEmailError) setRegEmailError(""); }}
                    placeholder="Nhập địa chỉ email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isSubmitting}
                  />
                  {regEmailError ? <Text style={styles.errorText}>{regEmailError}</Text> : null}

                  <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, regPhoneError ? styles.inputError : null]}
                    value={regPhone}
                    onChangeText={(v) => { 
                      const digits = v.replace(/\D/g, '');
                      let formatted = digits;
                      if (formatted.length > 10) formatted = formatted.slice(0, 10);
                      if (formatted.length > 7) formatted = formatted.replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3");
                      else if (formatted.length > 4) formatted = formatted.replace(/(\d{4})(\d+)/, "$1.$2");
                      setRegPhone(formatted); 
                      if (regPhoneError) setRegPhoneError(""); 
                    }}
                    placeholder="Nhập số điện thoại (VD: 090.123.4567)"
                    keyboardType="phone-pad"
                    maxLength={12}
                    editable={!isSubmitting}
                  />
                  {regPhoneError ? <Text style={styles.errorText}>{regPhoneError}</Text> : null}

                  <Text style={styles.label}>Số CMND/CCCD <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, regCccdError ? styles.inputError : null]}
                    value={regCccd}
                    onChangeText={(v) => { 
                      const digits = v.replace(/\D/g, '');
                      let formatted = digits;
                      if (formatted.length > 12) formatted = formatted.slice(0, 12);
                      if (formatted.length > 8) formatted = formatted.replace(/(\d{4})(\d{4})(\d+)/, "$1.$2.$3");
                      else if (formatted.length > 4) formatted = formatted.replace(/(\d{4})(\d+)/, "$1.$2");
                      setRegCccd(formatted); 
                      if (regCccdError) setRegCccdError(""); 
                    }}
                    placeholder="Nhập số CMND/CCCD (12 số)"
                    keyboardType="numeric"
                    maxLength={14}
                    editable={!isSubmitting}
                  />
                  {regCccdError ? <Text style={styles.errorText}>{regCccdError}</Text> : null}

                  <Text style={styles.label}>Mật khẩu <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, regPasswordError ? styles.inputError : null]}
                    value={regPassword}
                    onChangeText={(v) => { setRegPassword(v); if (regPasswordError) setRegPasswordError(""); }}
                    placeholder="Nhập mật khẩu (từ 6 ký tự)"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    editable={!isSubmitting}
                  />
                  {regPasswordError ? <Text style={styles.errorText}>{regPasswordError}</Text> : null}
                </>
              ) : (
                <>
                  {/* ===== FORM ĐĂNG NHẬP ===== */}
                  <Text style={styles.label}>Email / Số điện thoại / Tên đăng nhập</Text>
                  <TextInput
                    style={[styles.input, loginEmailError ? styles.inputError : null]}
                    value={loginEmail}
                    onChangeText={(v) => { setLoginEmail(v); if (loginEmailError) setLoginEmailError(""); }}
                    placeholder="Nhập email, số điện thoại hoặc tên đăng nhập"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    editable={!isSubmitting}
                  />
                  {loginEmailError ? <Text style={styles.errorText}>{loginEmailError}</Text> : null}

                  <Text style={styles.label}>Mật khẩu</Text>
                  <TextInput
                    style={[styles.input, passwordError ? styles.inputError : null]}
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(""); }}
                    placeholder="Nhập mật khẩu (từ 6 ký tự)"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    editable={!isSubmitting}
                  />
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </>
              )}

              <Pressable
                style={[
                  styles.primaryButton,
                  isSubmitting && styles.primaryButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>
                    {isRegister ? "Đăng ký" : "Đăng nhập"}
                  </Text>
                )}
              </Pressable>

              {!isRegister && (
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => setForgotVisible(true)}
                >
                  <Text style={styles.forgot}>Quên mật khẩu?</Text>
                </Pressable>
              )}

              <Pressable
                disabled={isSubmitting}
                onPress={() => {
                  setIsRegister(!isRegister);
                  clearErrors();
                }}
                style={{ marginTop: 24 }}
              >
                <Text style={[styles.forgot, { marginTop: 0 }]}>
                  {isRegister
                    ? "Đã có tài khoản? Đăng nhập ngay"
                    : "Chưa có tài khoản? Đăng ký khách thuê"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 26,
    paddingTop: 70,
    paddingBottom: 40,
    backgroundColor: "#F4F5F7",
  },
  logoBox: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoIcon: {
    color: COLORS.orange,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  logoText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: "#FF3B30",
    fontWeight: "800",
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF7F7",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 2,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  forgot: {
    color: COLORS.orange,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 22,
  },
});