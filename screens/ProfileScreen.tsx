import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { UserProfile } from "../types/UserProfile";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../components/ui/AppButton";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onLogout: () => void;
};

export default function ProfileScreen({ profile, onSave, onBack, onLogout }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const styles = createStyles(theme);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [email, setEmail] = useState(profile.email);
  const [cccd, setCccd] = useState(formatCCCD(profile.cccd));
  const [room] = useState(profile.room);
  const [startDate] = useState(profile.startDate);
  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
    if (phoneError) setPhoneError("");
  };

  const handleSave = () => {
    let isValid = true;

    if (!fullName.trim()) {
      setFullNameError(t("common.error"));
      isValid = false;
    }

    const rawPhone = unformatDigits(phone);
    if (!rawPhone) {
      setPhoneError(t("common.error"));
      isValid = false;
    } else if (rawPhone.length < 9) {
      setPhoneError(t("common.error"));
      isValid = false;
    }

    if (!isValid) return;

    onSave({
      ...profile,
      fullName: fullName.trim(),
      phone: rawPhone,
      email: email.trim(),
      cccd: unformatDigits(cccd),
    });

    notification.success(t("common.success"));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color={theme.primary} />
        <AppText style={styles.backText}>{t("common.back")}</AppText>
      </Pressable>

      <AppText style={styles.title}>{t("auth.account")}</AppText>
      <AppText style={styles.subtitle}>{t("dashboard.property")}</AppText>

      <Card style={[styles.card, styles.avatarCard]}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>
            {fullName ? fullName.charAt(0).toUpperCase() : "A"}
          </AppText>
        </View>

        <AppText style={styles.name}>{fullName || t("common.tenant")}</AppText>
        <AppText style={styles.roomText}>{t("common.room")} {room}</AppText>
      </Card>

      <Card style={[styles.card, styles.formCard]}>
        <AppText style={styles.sectionTitle}>{t("auth.account")}</AppText>

        <AppText style={styles.label}>{t("auth.fullName")}</AppText>
        <AppTextInput
          style={[styles.input, fullNameError ? styles.inputError : null]}
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            if (fullNameError) setFullNameError("");
          }}
          placeholder={t("auth.fullName")}
          placeholderTextColor={theme.muted}
        />
        {fullNameError ? (
          <AppText style={styles.errorText}>{fullNameError}</AppText>
        ) : null}

        <AppText style={styles.groupTitle}>{t("auth.phone")}</AppText>
        <AppText style={styles.label}>{t("auth.phone")}</AppText>
        <AppTextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder={t("auth.phone")}
          placeholderTextColor={theme.muted}
        />
        {phoneError ? <AppText style={styles.errorText}>{phoneError}</AppText> : null}

        <AppText style={styles.label}>{t("auth.email")}</AppText>
        <AppTextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t("auth.email")}
          placeholderTextColor={theme.muted}
        />

        <AppText style={styles.label}>CCCD / ID</AppText>
        <AppTextInput
          style={styles.input}
          value={cccd}
          onChangeText={(value) => setCccd(formatCCCD(value))}
          keyboardType="number-pad"
          maxLength={14}
          placeholder="001234567890"
          placeholderTextColor={theme.muted}
        />

        <AppText style={styles.groupTitle}>{t("contracts.title")}</AppText>
        <AppText style={styles.label}>{t("common.room")}</AppText>
        <AppTextInput style={styles.inputDisabled} value={room} editable={false} />

        <AppText style={styles.label}>{t("contracts.startDate")}</AppText>
        <AppTextInput
          style={styles.inputDisabled}
          value={startDate}
          editable={false}
        />

        <AppButton icon="save-outline" onPress={handleSave}>{t("common.save")}</AppButton>
        <AppButton 
          icon="log-out-outline" 
          onPress={onLogout}
          style={{ marginTop: 12, backgroundColor: theme.danger }}
        >
          {t("auth.logout")}
        </AppButton>
      </Card>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  backText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 18,
  },
  card: {
    marginBottom: 16,
  },
  avatarCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: theme.background,
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 4,
  },
  roomText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: "700",
  },
  formCard: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.text,
    marginTop: 18,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.muted,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
  },
  inputDisabled: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.muted,
  },
  inputError: {
    borderColor: theme.danger,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});
