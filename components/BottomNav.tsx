import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TROHUB_THEMES } from "../constants/theme";

type Tab =
  | "home"
  | "invoice"
  | "repair"
  | "contract"
  | "account"
  | "utility"
  | "profile"
  | "rooms"
  | "tenants"
  | "invoice_bulk"
  | "settings";

type Props = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
  role: number; // 1: Chủ trọ, 2: Người thuê
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tenantTabs: {
  key: Tab;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}[] = [
  {
    key: "home",
    label: "Trang chủ",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    key: "invoice",
    label: "Hóa đơn",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    key: "repair",
    label: "Sửa chữa",
    icon: "construct-outline",
    activeIcon: "construct",
  },
  {
    key: "contract",
    label: "Hợp đồng",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "account",
    label: "Tài khoản",
    icon: "person-outline",
    activeIcon: "person",
  },
];

const landlordTabs: {
  key: Tab;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}[] = [
  {
    key: "home",
    label: "Thống kê",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    key: "rooms",
    label: "Phòng trọ",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    key: "contract",
    label: "Hợp đồng",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "invoice",
    label: "Hóa đơn",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    key: "repair",
    label: "Sự cố",
    icon: "construct-outline",
    activeIcon: "construct",
  },
];

export default function BottomNav({ activeTab, onChangeTab, role }: Props) {
  const tabs = role === 1 ? landlordTabs : tenantTabs;
  const theme = TROHUB_THEMES[useColorScheme() === "dark" ? "dark" : "light"];

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {tabs.map((tab) => {
          const active =
            activeTab === tab.key ||
            (activeTab === "utility" && tab.key === "home") ||
            (activeTab === "profile" && tab.key === "account");

          return (
            <Pressable
              key={tab.key}
              style={styles.item}
              onPress={() => onChangeTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                <Ionicons
                  name={active ? tab.activeIcon : tab.icon}
                  size={21}
                  color={active ? theme.primary : theme.muted}
                />
              </View>

              <Text style={[styles.label, { color: theme.muted }, active && styles.activeLabel, active && { color: theme.primary }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 6,
  },
  container: {
    height: 68,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 13,
    borderWidth: 1,
    shadowColor: "#25292D",
    shadowOpacity: 0.08,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowRadius: 20,
    elevation: 8,
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 34,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  iconBoxActive: {
    backgroundColor: COLORS.orangeSoft,
  },
  label: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
  },
  activeLabel: {
    color: COLORS.orange,
    fontWeight: "900",
  },
});
