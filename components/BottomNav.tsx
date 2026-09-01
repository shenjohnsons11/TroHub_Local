import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

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
  | "settings"
  | "notifications"
  | "scan_meter"
  | "cccd_scan"
  | "ai_chat"
  | "services"
  | "admin_settings"
  | "change_password";

type Props = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
  role: number; // 1: Chủ trọ, 2: Người thuê
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type TabItem = {
  key: Tab;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

const tenantTabs: TabItem[] = [
  {
    key: "home",
    label: "nav.home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    key: "invoice",
    label: "nav.invoices",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    key: "repair",
    label: "nav.repairs",
    icon: "construct-outline",
    activeIcon: "construct",
  },
  {
    key: "contract",
    label: "nav.contracts",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "account",
    label: "nav.account",
    icon: "person-outline",
    activeIcon: "person",
  },
];

const landlordTabs: TabItem[] = [
  {
    key: "home",
    label: "nav.overview",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    key: "rooms",
    label: "nav.rooms",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    key: "contract",
    label: "nav.contracts",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "invoice",
    label: "nav.invoices",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    key: "repair",
    label: "nav.incident",
    icon: "construct-outline",
    activeIcon: "construct",
  },
];

export default function BottomNav({ activeTab, onChangeTab, role }: Props) {
  const tabs = role === 1 ? landlordTabs : tenantTabs;
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  const { t } = useLanguage();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={[styles.shadowShell, { shadowColor: theme.text }]}>
        <BlurView
          intensity={isDark ? 52 : 72}
          tint={resolvedTheme}
          style={[styles.container, { borderColor: theme.border }]}
        >
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, opacity: 0.88 }]} />
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
                    active && [
                      styles.iconBoxActive,
                      {
                        backgroundColor: isDark ? "rgba(184, 245, 218, 0.16)" : "#DFF1E7",
                      },
                    ],
                  ]}
                >
                  <Ionicons
                    name={active ? tab.activeIcon : tab.icon}
                    size={22}
                    color={active ? (isDark ? "#B8F5DA" : "#0F5247") : (isDark ? "#A5BCB1" : "#52635C")}
                  />
                </View>

                <AppText
                  style={[
                    styles.label,
                    { color: isDark ? "#A5BCB1" : "#52635C" },
                    active && [styles.activeLabel, { color: isDark ? "#B8F5DA" : "#0F5247" }],
                  ]}
                >
                  {t(tab.label)}
                </AppText>
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
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 6,
  },
  shadowShell: {
    borderRadius: 24,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 8,
  },
  container: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 24,
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
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  iconBoxActive: {
    shadowColor: "#0F5247",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  activeLabel: {
    fontWeight: "900",
  },
});
