import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/theme";
import { useInboxNotifications } from "../hooks/useInboxNotifications";
import { InboxNotification } from "../services/notification-api";

type Props = {
  onBack: () => void;
  onOpen: (notification: InboxNotification) => void;
};

const formatTime = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));

export default function NotificationsScreen({ onBack, onOpen }: Props) {
  const { notifications, loading, refresh, markRead, markAllRead } = useInboxNotifications();
  useEffect(() => { void refresh(); }, [refresh]);
  const groups = useMemo(() => ({
    unread: notifications.filter((item) => !item.isRead),
    read: notifications.filter((item) => item.isRead),
  }), [notifications]);

  const open = async (item: InboxNotification) => {
    await markRead(item);
    onOpen(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Quay lại" style={styles.iconButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={21} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Thông báo</Text>
          <Text style={styles.subtitle}>Hợp đồng và nhắc thanh toán của bạn</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void markAllRead()}>
          <Text style={styles.markAll}>Đánh dấu tất cả đã đọc</Text>
        </Pressable>
      </View>
      {loading && notifications.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.orange} /></View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={26} color={COLORS.orange} /></View>
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptyText}>Hợp đồng và hóa đơn cần xử lý sẽ xuất hiện tại đây.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.unread.length > 0 && <Text style={styles.section}>Mới</Text>}
          {groups.unread.map((item) => <NotificationRow key={item._id} item={item} onPress={() => void open(item)} />)}
          {groups.read.length > 0 && <Text style={styles.section}>Đã đọc</Text>}
          {groups.read.map((item) => <NotificationRow key={item._id} item={item} onPress={() => void open(item)} />)}
        </ScrollView>
      )}
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: InboxNotification; onPress: () => void }) {
  const contract = item.entityType === "CONTRACT";
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !item.isRead && styles.unreadRow, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.typeIcon, contract ? styles.contractIcon : styles.invoiceIcon]}>
        <Ionicons name={contract ? "document-text-outline" : "receipt-outline"} size={20} color={contract ? "#176B87" : COLORS.orange} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View accessibilityLabel="Chưa đọc" style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E4E7" },
  headerCopy: { marginTop: 14, marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  subtitle: { color: "#697178", fontSize: 13, marginTop: 3 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#F1F3F4" },
  markAll: { color: COLORS.orange, fontSize: 13, fontWeight: "800" },
  list: { paddingHorizontal: 18, paddingVertical: 18, paddingBottom: 36 },
  section: { color: "#697178", fontSize: 12, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  row: { minHeight: 92, flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E1E4E7" },
  unreadRow: { backgroundColor: "#FFF7F1", marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 12, borderBottomWidth: 0, marginBottom: 6 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  contractIcon: { backgroundColor: "#E7F3F7" },
  invoiceIcon: { backgroundColor: "#FFF0E7" },
  rowCopy: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  message: { color: "#545C63", fontSize: 13, lineHeight: 19, marginTop: 3 },
  time: { color: "#7A8289", fontSize: 11, marginTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange, marginTop: 5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 42 },
  emptyIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#FFF0E7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "900", marginTop: 16 },
  emptyText: { color: "#697178", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
