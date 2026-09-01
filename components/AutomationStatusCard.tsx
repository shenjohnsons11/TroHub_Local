import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { BillingAutomationPolicy } from "../services/adminService";

export default function AutomationStatusCard({
  policy,
  onConfigure,
  compact = false,
}: {
  policy: BillingAutomationPolicy;
  onConfigure: () => void;
  compact?: boolean;
}) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const enabled = policy.autoInvoiceEnabled;
  const reminderDay =
    policy.invoiceDay === 1 ? "ngày cuối tháng trước" : `ngày ${policy.invoiceDay - 1}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onConfigure}
      style={[
        styles.card,
        compact && styles.compact,
        {
          backgroundColor: enabled
            ? isDark
              ? "rgba(184, 245, 218, 0.06)"
              : "rgba(15, 82, 71, 0.05)"
            : isDark
              ? theme.surface
              : "#FFFFFF",
          borderColor: enabled
            ? isDark
              ? "rgba(184, 245, 218, 0.25)"
              : "rgba(15, 82, 71, 0.22)"
            : theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: enabled
              ? isDark
                ? "#B8F5DA"
                : "#0F5247"
              : isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "#EDF3EF",
          },
        ]}
      >
        <Ionicons
          name="flash"
          size={19}
          color={
            enabled
              ? isDark
                ? "#04100E"
                : "#FFFFFF"
              : isDark
                ? "#A5BCB1"
                : "#52635C"
          }
        />
      </View>

      <View style={styles.copy}>
        <AppText
          style={[
            styles.title,
            { color: isDark ? "#E4F7EE" : "#1A202C" },
          ]}
        >
          TỰ ĐỘNG HÓA: {enabled ? "ĐANG BẬT" : "ĐANG TẮT"}
        </AppText>
        <AppText style={[styles.description, { color: theme.muted }]}>
          {enabled
            ? `Nhắc quét ${reminderDay} · Phát hành 07:00 ngày ${policy.invoiceDay}`
            : "Bật tự động xuất hóa đơn hàng tháng để tiết kiệm thời gian chốt số."}
        </AppText>
      </View>

      <View
        style={[
          styles.action,
          {
            borderColor: isDark ? "rgba(184, 245, 218, 0.3)" : "rgba(15, 82, 71, 0.25)",
            backgroundColor: isDark ? "rgba(184, 245, 218, 0.08)" : "#FFFFFF",
          },
        ]}
      >
        <Ionicons
          name={enabled ? "settings-outline" : "flash-outline"}
          size={16}
          color={isDark ? "#B8F5DA" : "#0F5247"}
        />
        {compact ? null : (
          <AppText
            style={[
              styles.actionText,
              { color: isDark ? "#B8F5DA" : "#0F5247" },
            ]}
          >
            {enabled ? "Đổi ngày chốt" : "Kích hoạt"}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    shadowColor: "#0F5247",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  compact: {
    minHeight: 76,
    marginBottom: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  action: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
});
