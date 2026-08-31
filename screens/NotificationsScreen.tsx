import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View, StyleSheet, SectionList, Pressable } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppNotification } from "../types/Notification";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { notificationService } from "../services/notificationService";
import { resolveNotificationTarget } from "../utils/notificationNavigation";
import { useTranslation } from "../contexts/LanguageContext";

interface SectionData { title: string; data: AppNotification[]; }
type FilterCategory = "all" | "checkout" | "contract" | "invoice" | "utility" | "repair";

export type NotificationScreenProps = {
  onBack?: () => void;
  onNavigate?: (tab: any, params?: any) => void;
  refreshKey?: number;
  onUnreadChanged?: () => void;
  mode?: "tenant" | "landlord";
};

export default function NotificationsScreen({ onBack, onNavigate, refreshKey = 0, onUnreadChanged, mode = "tenant" }: NotificationScreenProps) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const filters: Array<{ key: FilterCategory; label: string }> = mode === "landlord" ? [
    { key: "all", label: t("common.all") },
    { key: "checkout", label: t("contracts.title") },
    { key: "repair", label: t("repairs.title") },
    { key: "contract", label: t("contracts.title") },
    { key: "invoice", label: t("payments.title") },
  ] : [
    { key: "all", label: t("common.all") },
    { key: "contract", label: t("contracts.title") },
    { key: "invoice", label: t("invoices.title") },
    { key: "utility", label: t("nav.utilities") },
    { key: "repair", label: t("repairs.title") },
  ];

  const loadNotifications = async () => {
    try {
      setNotifications(await notificationService.getNotifications());
    } catch (error) {
      console.log("Lỗi lấy thông báo:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadNotifications(); }, [refreshKey]);

  const handleMarkAsRead = async (item: AppNotification) => {
    if (item.isRead) return true;
    const previous = notifications;
    setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, isRead: true } : current));
    try {
      await notificationService.markAsRead(item.id);
      onUnreadChanged?.();
      return true;
    } catch {
      setNotifications(previous);
      return false;
    }
  };

  const handleMarkAll = async () => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    try {
      await notificationService.markAllAsRead();
      onUnreadChanged?.();
    } catch {
      setNotifications(previous);
    }
  };

  const handleItemPress = async (item: AppNotification) => {
    await handleMarkAsRead(item);
    const target = resolveNotificationTarget(item);
    if (!target) return;
    onNavigate?.(target.tab, target.params);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  };

  const filteredNotifications = useMemo(() => notifications.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.type === selectedCategory;
    const matchesSearch = !search.trim() || item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [notifications, search, selectedCategory]);

  const sections: SectionData[] = useMemo(() => {
    const groups: { today: AppNotification[]; yesterday: AppNotification[]; older: AppNotification[] } = { today: [], yesterday: [], older: [] };
    filteredNotifications.forEach((item) => {
      const date = new Date(item.createdAt);
      if (isToday(date)) groups.today.push(item);
      else if (isYesterday(date)) groups.yesterday.push(item);
      else groups.older.push(item);
    });
    const result: SectionData[] = [];
    if (groups.today.length > 0) result.push({ title: t("notifications.today"), data: groups.today });
    if (groups.yesterday.length > 0) result.push({ title: t("notifications.yesterday"), data: groups.yesterday });
    if (groups.older.length > 0) result.push({ title: t("notifications.older"), data: groups.older });
    return result;
  }, [filteredNotifications, t]);

  const getCategoryTheme = (type: string) => {
    switch (type) {
      case "checkout": return { icon: "log-out-outline", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", label: t("contracts.title"), action: t("common.confirm") };
      case "invoice": return { icon: "receipt-outline", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", label: t("payments.title"), action: t("invoices.title") };
      case "contract": return { icon: "document-text-outline", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", label: t("contracts.title"), action: t("contracts.title") };
      case "repair": return { icon: "build-outline", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", label: t("repairs.title"), action: t("repairs.title") };
      case "tenant": return { icon: "people-outline", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", label: t("common.room") };
      case "utility": return { icon: "flash-outline", color: "#D4A017", bg: "rgba(212, 160, 23, 0.14)", label: t("nav.utilities") };
      default: return { icon: "notifications-outline", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", label: "System" };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          {onBack && <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.text} /></Pressable>}
          <AppText style={[styles.title, { color: theme.text }]}>{t("notifications.title")}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={t("notifications.markAllRead")} onPress={handleMarkAll} style={styles.markAllBtn}><Ionicons name="checkmark-done" size={18} color={theme.primary} /><AppText style={[styles.markAllText, { color: theme.primary }]}>{t("notifications.markAllRead")}</AppText></Pressable>
        </View>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <AppTextInput style={[styles.searchInput, { color: theme.text }]} placeholder={t("common.search")} placeholderTextColor={theme.muted} value={search} onChangeText={setSearch} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const active = selectedCategory === filter.key;
            return <Pressable key={filter.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedCategory(filter.key)} style={[styles.filterTab, { backgroundColor: active ? theme.primary : theme.surfaceElevated }]}><AppText style={[styles.filterText, { color: active ? theme.background : theme.muted }]}>{filter.label}</AppText></Pressable>;
          })}
        </ScrollView>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadNotifications(); }} tintColor={theme.primary} />}
        renderSectionHeader={({ section: { title } }) => <AppText style={[styles.sectionTitle, { color: theme.muted }]}>{title}</AppText>}
        renderItem={({ item, index }) => {
          const config = getCategoryTheme(item.type);
          return <AnimatedEntry delay={Math.min(index, 6) * 40}><Pressable accessibilityRole="button" accessibilityLabel={`${item.title}${mode === "landlord" && config.action ? `. ${config.action}` : ""}`} style={[styles.card, { backgroundColor: item.isRead ? theme.surface : theme.surfaceElevated }]} onPress={() => void handleItemPress(item)}>
            <View style={[styles.iconBox, { backgroundColor: config.bg }]}><Ionicons name={config.icon as any} size={22} color={config.color} /></View>
            <View style={styles.content}><View style={styles.contentTop}><AppText style={[styles.cardTitle, { color: theme.text, fontWeight: item.isRead ? "600" : "800" }]} numberOfLines={1}>{item.title}</AppText><View style={[styles.badgePill, { backgroundColor: config.bg }]}><AppText style={[styles.badgeText, { color: config.color }]}>{config.label}</AppText></View></View><AppText style={[styles.body, { color: theme.muted }]} numberOfLines={2}>{item.content}</AppText>{mode === "landlord" && config.action ? <View style={styles.actionRow}><AppText style={[styles.actionText, { color: config.color }]}>{config.action}</AppText><Ionicons name="arrow-forward" size={14} color={config.color} /></View> : null}<View style={styles.metaRow}><AppText style={[styles.time, { color: theme.muted }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</AppText><AppText style={[styles.readState, { color: item.isRead ? theme.muted : theme.danger }]}>{item.isRead ? t("notifications.read") : t("notifications.unread")}</AppText></View></View>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />}
          </Pressable></AnimatedEntry>;
        }}
<<<<<<< HEAD
        ListEmptyComponent={<View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="notifications-off-outline" size={60} color={theme.muted} /><AppText style={[styles.emptyText, { color: theme.text }]}>{t("notifications.empty")}</AppText><AppText style={[styles.emptyHint, { color: theme.muted }]}>{t("notifications.empty")}</AppText></View>}
=======
        ListEmptyComponent={<View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="notifications-off-outline" size={60} color={theme.muted} /><AppText style={[styles.emptyText, { color: theme.text }]}>{t("notifications.empty")}</AppText><AppText style={[styles.emptyHint, { color: theme.muted }]}>{t("notifications.emptyDescription")}</AppText></View>}
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }, headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, title: { fontSize: 24, fontWeight: "900", flex: 1 }, backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" }, markAllBtn: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, markAllText: { fontSize: 11, fontWeight: "800" }, searchBox: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 16, paddingHorizontal: 14, gap: 10 }, searchInput: { flex: 1, fontSize: 15, fontWeight: "500", height: "100%" }, filterRow: { gap: 8, paddingTop: 12 }, filterTab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 14 }, filterText: { fontSize: 13, fontWeight: "800" }, listContent: { padding: 20, paddingBottom: 40, flexGrow: 1 }, sectionTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 20, marginBottom: 8 }, card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, marginBottom: 10, elevation: 2, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 }, iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 }, content: { flex: 1 }, contentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, cardTitle: { fontSize: 14, flex: 1, paddingRight: 8 }, badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }, badgeText: { fontSize: 10, fontWeight: "800" }, actionRow: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }, actionText: { fontSize: 11, fontWeight: "800" }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }, time: { fontSize: 10, fontWeight: "600" }, readState: { fontSize: 10, fontWeight: "800" }, body: { fontSize: 12, lineHeight: 18 }, unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 }, emptyBox: { alignItems: "center", justifyContent: "center", borderRadius: 20, borderWidth: 1, marginTop: 28, padding: 28 }, emptyText: { fontSize: 15, fontWeight: "700", marginTop: 12 }, emptyHint: { fontSize: 13, marginTop: 6, textAlign: "center" },
});
