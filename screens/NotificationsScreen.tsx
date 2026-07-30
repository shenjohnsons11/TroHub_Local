import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SectionList, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppNotification } from "../types/Notification";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { authService } from "../services/authService";
import { adminService } from "../services/adminService";
import { invoiceService } from "../services/invoiceService";
import { contractService } from "../services/contractService";
import { repairService } from "../services/repairService";
import { formatCurrency, formatPhone } from "../utils/formatters";

const STORAGE_KEY = "@trohub_notifications";
const READ_KEY = "@trohub_read_notifications";

interface SectionData {
  title: string;
  data: AppNotification[];
}

type Props = {
  onBack?: () => void;
  onNavigate?: (tab: any, params?: any) => void;
};

export default function NotificationsScreen({ onBack, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userRole, setUserRole] = useState<number>(2);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = await authService.getAuthUser();
      const currentRole = user?.role || 2;
      setUserRole(currentRole);

      // 1. Lấy thông báo lưu cục bộ (nếu có)
      let localNotifs: AppNotification[] = [];
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) localNotifs = JSON.parse(stored);

      // 2. Lấy danh sách ID đã đọc
      let readIds: string[] = [];
      const storedRead = await AsyncStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);

      const dbNotifs: AppNotification[] = [];

      if (currentRole === 1) {
        // ADMIN/CHỦ TRỌ
        const [invoices, contracts, repairs, rooms, tenants] = await Promise.all([
          adminService.getInvoices().catch(() => []),
          adminService.getContracts().catch(() => []),
          adminService.getRepairs().catch(() => []),
          adminService.getRooms().catch(() => []),
          adminService.getTenants().catch(() => [])
        ]);

        // Map 🧾 Hóa đơn chưa thanh toán/quá hạn
        invoices.forEach((inv: any) => {
          if (inv.status === 0 || inv.status === 2 || inv.status === "Chưa thanh toán" || inv.status === "Quá hạn") {
            const roomCode = inv.contractId?.roomId?.roomCode || inv.room || "N/A";
            const id = `invoice-${inv._id || inv.id}`;
            dbNotifs.push({
              id,
              type: "invoice",
              title: inv.status === "Quá hạn" || inv.status === 2 ? `Hóa đơn QUÁ HẠN - Phòng ${roomCode}` : `Hóa đơn chưa thu - Phòng ${roomCode}`,
              content: `Kỳ ${inv.period}: ${formatCurrency(inv.totalAmount)} - Hạn đóng: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "N/A"}`,
              isRead: readIds.includes(id),
              createdAt: inv.createdAt || new Date().toISOString()
            });
          }
        });

        // Map 📄 Hợp đồng chờ ký/phê duyệt/thanh lý
        contracts.forEach((con: any) => {
          if (con.status === 0 || con.status === 4 || con.status === 5) {
            const roomCode = typeof con.roomId === "object" ? con.roomId?.roomCode : "N/A";
            const tenantName = typeof con.tenantId === "object" ? con.tenantId?.fullName : "N/A";
            const id = `contract-${con._id || con.id}`;
            let title = "Hợp đồng chờ duyệt";
            if (con.status === 5) title = "Yêu cầu thanh lý trả phòng";
            else if (con.status === 0) title = "Hợp đồng chờ ký kết";

            dbNotifs.push({
              id,
              type: "contract",
              title,
              content: `Phòng ${roomCode} - Người thuê: ${tenantName}`,
              isRead: readIds.includes(id),
              createdAt: con.createdAt || new Date().toISOString()
            });
          }
        });

        // Map 🔧 Sửa chữa chưa hoàn tất
        repairs.forEach((rep: any) => {
          if (rep.status === 0 || rep.status === 1 || rep.status === "Chờ xử lý" || rep.status === "Đang sửa") {
            const roomCode = rep.contractId?.roomId?.roomCode || rep.roomCode || "N/A";
            const id = `repair-${rep._id || rep.id}`;
            dbNotifs.push({
              id,
              type: "repair",
              title: `Sự cố ${rep.title || rep.description || "Máy lạnh"} - Phòng ${roomCode}`,
              content: `Trạng thái: ${rep.status} · Bấm để cập nhật tiến độ`,
              isRead: readIds.includes(id),
              createdAt: rep.createdAt || new Date().toISOString()
            });
          }
        });

        // Map Người thuê chưa liên kết App
        tenants.forEach((t: any) => {
          if (!t.linkedAccountId) {
            const id = `tenant-${t._id || t.id}`;
            dbNotifs.push({
              id,
              type: "tenant",
              title: `Người thuê chưa cài App: ${t.fullName}`,
              content: `SĐT: ${formatPhone(t.phone)} - Nhấn để gửi tin nhắn Zalo/SMS mời tải App.`,
              isRead: readIds.includes(id),
              createdAt: t.createdAt || new Date().toISOString()
            });
          }
        });

        // Map ⚡ Điện nước kỳ mới
        const occupiedCount = rooms.filter((r: any) => r.status === 1).length;
        if (occupiedCount > 0) {
          const now = new Date();
          const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
          const id = `utility-check-${monthStr}`;
          dbNotifs.push({
            id,
            type: "utility",
            title: `Nhắc chốt số Điện Nước kỳ ${monthStr}`,
            content: `Có ${occupiedCount} phòng đang thuê sẵn sàng nhập chỉ số công tơ.`,
            isRead: readIds.includes(id),
            createdAt: now.toISOString()
          });
        }
      } else {
        // TENANT/NGƯỜI THUÊ
        const [invoices, contracts, repairs] = await Promise.all([
          invoiceService.getInvoices().catch(() => []),
          contractService.getMyContracts().catch(() => []),
          repairService.getRequests().catch(() => [])
        ]);

        invoices.forEach((inv: any) => {
          if (inv.status === 0 || inv.status === 2 || inv.status === "Chưa thanh toán" || inv.status === "Quá hạn") {
            const id = `invoice-${inv._id || inv.id}`;
            dbNotifs.push({
              id,
              type: "invoice",
              title: `Hóa đơn đến hạn thanh toán`,
              content: `Kỳ ${inv.period}: ${formatCurrency(inv.totalAmount)} - Hạn đóng: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "N/A"}`,
              isRead: readIds.includes(id),
              createdAt: inv.createdAt || new Date().toISOString()
            });
          }
        });

        contracts.forEach((con: any) => {
          if (con.status === 0 || con.status === 4 || con.status === 5) {
            const id = `contract-${con._id || con.id}`;
            let title = "Hợp đồng chờ xác nhận";
            if (con.status === 5) title = "Yêu cầu thanh lý đang xử lý";

            dbNotifs.push({
              id,
              type: "contract",
              title,
              content: `Vui lòng kiểm tra và ký số hợp đồng để kích hoạt phòng.`,
              isRead: readIds.includes(id),
              createdAt: con.createdAt || new Date().toISOString()
            });
          }
        });

        repairs.forEach((rep: any) => {
          if (rep.status === 0 || rep.status === 1 || rep.status === "Chờ xử lý" || rep.status === "Đang sửa") {
            const id = `repair-${rep._id || rep.id}`;
            dbNotifs.push({
              id,
              type: "repair",
              title: `Yêu cầu sửa chữa của bạn`,
              content: `${rep.title || rep.description || "N/A"} (${rep.status})`,
              isRead: readIds.includes(id),
              createdAt: rep.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // Gộp và sắp xếp
      const combined = [...dbNotifs, ...localNotifs.map(n => ({ ...n, isRead: readIds.includes(n.id) || n.isRead }))];
      
      const uniqueMap = new Map<string, AppNotification>();
      combined.forEach(n => {
        if (!uniqueMap.has(n.id)) uniqueMap.set(n.id, n);
      });

      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(sorted);
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      let readIds: string[] = [];
      const storedRead = await AsyncStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);

      if (!readIds.includes(id)) {
        readIds.push(id);
        await AsyncStorage.setItem(READ_KEY, JSON.stringify(readIds));
      }

      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
      setNotifications(updated);
    } catch (e) {
      console.log(e);
    }
  };

  const handleMarkAll = async () => {
    try {
      let readIds: string[] = [];
      const storedRead = await AsyncStorage.getItem(READ_KEY);
      if (storedRead) readIds = JSON.parse(storedRead);

      const activeIds = notifications.map(n => n.id);
      const newReadIds = Array.from(new Set([...readIds, ...activeIds]));
      await AsyncStorage.setItem(READ_KEY, JSON.stringify(newReadIds));

      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
    } catch (e) {
      console.log(e);
    }
  };

  const handleItemPress = async (item: AppNotification) => {
    await handleMarkAsRead(item.id);

    if (!onNavigate) return;

    switch (item.type) {
      case "invoice":
        onNavigate(userRole === 1 ? "invoice_bulk" : "invoice");
        break;
      case "repair":
        onNavigate("repair");
        break;
      case "contract":
        onNavigate("contract");
        break;
      case "tenant":
        onNavigate("tenants");
        break;
      case "utility":
        onNavigate("utility");
        break;
      default:
        break;
    }
  };

  const filteredData = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filteredData.reduce((acc, curr) => {
    const dateObj = new Date(curr.createdAt);
    const dateStr = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    
    const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    
    let groupTitle = dateStr;
    if (dateStr === today) groupTitle = "Hôm nay";
    else if (dateStr === yesterday) groupTitle = "Hôm qua";

    const existing = acc.find(g => g.title === groupTitle);
    if (existing) {
      existing.data.push(curr);
    } else {
      acc.push({ title: groupTitle, data: [curr] });
    }
    return acc;
  }, [] as SectionData[]);

  const getCategoryTheme = (type: string) => {
    switch (type) {
      case "invoice":
        return { icon: "receipt-outline", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", label: "Hóa đơn" };
      case "repair":
        return { icon: "construct-outline", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", label: "Sự cố" };
      case "contract":
        return { icon: "document-text-outline", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", label: "Hợp đồng" };
      case "tenant":
        return { icon: "people-outline", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", label: "Người thuê" };
      case "utility":
        return { icon: "flash-outline", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)", label: "Điện nước" };
      default:
        return { icon: "notifications-outline", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", label: "Hệ thống" };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          {onBack && (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          )}
          <Text style={[styles.title, { color: theme.text }]}>Thông báo</Text>
          <Pressable accessibilityRole="button" onPress={handleMarkAll} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={20} color={theme.primary} />
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm kiếm thông báo..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <SectionList
        sections={grouped}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionTitle, { color: theme.muted }]}>{title}</Text>
        )}
        renderItem={({ item, index }) => {
          const config = getCategoryTheme(item.type);
          return (
            <AnimatedEntry delay={Math.min(index, 6) * 40}>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.card,
                  { backgroundColor: item.isRead ? theme.surface : theme.surfaceElevated }
                ]}
                onPress={() => handleItemPress(item)}
              >
                <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon as any} size={22} color={config.color} />
                </View>
                
                <View style={styles.content}>
                  <View style={styles.contentTop}>
                    <Text style={[styles.cardTitle, { color: theme.text, fontWeight: item.isRead ? "600" : "800" }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.badgePill, { backgroundColor: config.bg }]}>
                      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.body, { color: theme.muted }]} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={[styles.time, { color: theme.muted, marginTop: 4 }]}>
                    {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>

                {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />}
              </Pressable>
            </AnimatedEntry>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={60} color={theme.muted} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Không có thông báo nào</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "900", flex: 1 },
  backBtn: { paddingRight: 12 },
  markAllBtn: { padding: 8, backgroundColor: "transparent" },
  searchBox: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 16, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500", height: "100%" },
  listContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 20, marginBottom: 8 },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 20, marginBottom: 10, elevation: 2, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  content: { flex: 1 },
  contentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 14, flex: 1, paddingRight: 8 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  time: { fontSize: 10, fontWeight: "600" },
  body: { fontSize: 12, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: "700", marginTop: 12 },
});
