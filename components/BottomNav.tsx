import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../contexts/ThemeContext";

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
  const { theme, themeMode } = useAppTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={[styles.shadowShell, { shadowColor: theme.text }]}>
        <BlurView
          intensity={themeMode === "dark" ? 52 : 72}
          tint={themeMode}
          style={[styles.container, { borderColor: theme.border }]}
        >
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, opacity: 0.82 }]} />
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
                <View
                  style={[
                    styles.iconBox,
                    active && styles.iconBoxActive,
                    active && { backgroundColor: theme.primarySoft, shadowColor: theme.primary },
                  ]}
                >
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
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
  },
  shadowShell: {
    borderRadius: 22,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  container: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  item: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 38,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  iconBoxActive: {
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 7,
    elevation: 5,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  activeLabel: {
    fontWeight: "900",
  },
});
