import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View, StyleSheet, SectionList, Pressable } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppNotification } from "../types/Notification";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { notificationService } from "../services/notificationService";
import { resolveNotificationTarget } from "../utils/notificationNavigation";

interface SectionData { title: string; data: AppNotification[]; }
type FilterCategory = "all" | "checkout" | "contract" | "invoice" | "utility" | "repair";
const TENANT_FILTERS: Array<{ key: FilterCategory; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "contract", label: "Hợp đồng" },
  { key: "invoice", label: "Hóa đơn" },
  { key: "utility", label: "Điện nước" },
  { key: "repair", label: "Sửa chữa" },
];
const LANDLORD_FILTERS: Array<{ key: FilterCategory; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "checkout", label: "Trả phòng" },
  { key: "repair", label: "Sửa chữa" },
  { key: "contract", label: "Hợp đồng" },
  { key: "invoice", label: "Thanh toán" },
];

export type NotificationScreenProps = {
  onBack?: () => void;
  onNavigate?: (tab: any, params?: any) => void;
  refreshKey?: number;
  onUnreadChanged?: () => void;
  mode?: "tenant" | "landlord";
};

export default function NotificationsScreen({ onBack, onNavigate, refreshKey = 0, onUnreadChanged, mode = "tenant" }: NotificationScreenProps) {
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const filters = mode === "landlord" ? LANDLORD_FILTERS : TENANT_FILTERS;

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
    } catch (error) {
      setNotifications(previous);
      console.log("Lỗi đánh dấu đã đọc:", error);
      return false;
    }
  };

  const handleMarkAll = async () => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    try {
      await notificationService.markAllAsRead();
      onUnreadChanged?.();
    } catch (error) {
      setNotifications(previous);
      console.log("Lỗi đánh dấu tất cả đã đọc:", error);
    }
  };

  const handleItemPress = async (item: AppNotification) => {
    if (!await handleMarkAsRead(item) || !onNavigate) return;
    const target = resolveNotificationTarget(item);
    onNavigate(target.tab, target.params);
  };

  const sections = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const filtered = notifications.filter((item) =>
      (selectedCategory === "all" || item.type === selectedCategory) &&
      (item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase()))
    );
    const today = filtered.filter((item) => new Date(item.createdAt) >= startOfToday);
    const older = filtered.filter((item) => new Date(item.createdAt) < startOfToday);
    return ([
      ...(today.length ? [{ title: "Hôm nay", data: today }] : []),
      ...(older.length ? [{ title: "Cũ hơn", data: older }] : []),
    ] as SectionData[]);
  }, [notifications, search, selectedCategory]);

  const getCategoryTheme = (type: string) => {
    switch (type) {
      case "checkout": return { icon: "exit-outline", color: "#DC2626", bg: "rgba(220, 38, 38, 0.12)", label: "Trả phòng", action: "Duyệt trả phòng" };
      case "invoice": return { icon: "card-outline", color: "#0F9AB5", bg: "rgba(15, 154, 181, 0.12)", label: "Hóa đơn", action: "Xem hóa đơn" };
      case "repair": return { icon: "construct-outline", color: "#E65A35", bg: "rgba(230, 90, 53, 0.12)", label: "Sửa chữa", action: "Xem ảnh sự cố" };
      case "contract": return { icon: "document-text-outline", color: "#059669", bg: "rgba(5, 150, 105, 0.12)", label: "Hợp đồng", action: "Xem hợp đồng" };
      case "tenant": return { icon: "people-outline", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", label: "Phòng" };
      case "utility": return { icon: "flash-outline", color: "#D4A017", bg: "rgba(212, 160, 23, 0.14)", label: "Điện nước" };
      default: return { icon: "notifications-outline", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", label: "Hệ thống" };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.text} /></Pressable>}
          <AppText style={[styles.title, { color: theme.text }]}>Thông báo</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả đã đọc" onPress={handleMarkAll} style={styles.markAllBtn}><Ionicons name="checkmark-done" size={18} color={theme.primary} /><AppText style={[styles.markAllText, { color: theme.primary }]}>Đánh dấu tất cả đã đọc</AppText></Pressable>
        </View>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <AppTextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Tìm kiếm thông báo..." placeholderTextColor={theme.muted} value={search} onChangeText={setSearch} />
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
            <View style={styles.content}><View style={styles.contentTop}><AppText style={[styles.cardTitle, { color: theme.text, fontWeight: item.isRead ? "600" : "800" }]} numberOfLines={1}>{item.title}</AppText><View style={[styles.badgePill, { backgroundColor: config.bg }]}><AppText style={[styles.badgeText, { color: config.color }]}>{config.label}</AppText></View></View><AppText style={[styles.body, { color: theme.muted }]} numberOfLines={2}>{item.content}</AppText>{mode === "landlord" && config.action ? <View style={styles.actionRow}><AppText style={[styles.actionText, { color: config.color }]}>{config.action}</AppText><Ionicons name="arrow-forward" size={14} color={config.color} /></View> : null}<View style={styles.metaRow}><AppText style={[styles.time, { color: theme.muted }]}>{new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</AppText><AppText style={[styles.readState, { color: item.isRead ? theme.muted : theme.danger }]}>{item.isRead ? "Đã đọc" : "Mới"}</AppText></View></View>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />}
          </Pressable></AnimatedEntry>;
        }}
        ListEmptyComponent={<View style={styles.emptyBox}><Ionicons name="notifications-off-outline" size={60} color={theme.muted} /><AppText style={[styles.emptyText, { color: theme.text }]}>Không có thông báo nào</AppText></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }, headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, title: { fontSize: 24, fontWeight: "900", flex: 1 }, backBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" }, markAllBtn: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, markAllText: { fontSize: 11, fontWeight: "800" }, searchBox: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 16, paddingHorizontal: 14, gap: 10 }, searchInput: { flex: 1, fontSize: 15, fontWeight: "500", height: "100%" }, filterRow: { gap: 8, paddingTop: 12 }, filterTab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 14 }, filterText: { fontSize: 13, fontWeight: "800" }, listContent: { padding: 20, paddingBottom: 40, flexGrow: 1 }, sectionTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 20, marginBottom: 8 }, card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, marginBottom: 10, elevation: 2, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 }, iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 }, content: { flex: 1 }, contentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, cardTitle: { fontSize: 14, flex: 1, paddingRight: 8 }, badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }, badgeText: { fontSize: 10, fontWeight: "800" }, actionRow: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }, actionText: { fontSize: 11, fontWeight: "800" }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }, time: { fontSize: 10, fontWeight: "600" }, readState: { fontSize: 10, fontWeight: "800" }, body: { fontSize: 12, lineHeight: 18 }, unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 }, emptyBox: { alignItems: "center", justifyContent: "center", paddingTop: 80 }, emptyText: { fontSize: 15, fontWeight: "700", marginTop: 12 },
});
