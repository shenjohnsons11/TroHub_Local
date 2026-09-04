import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";

type FeatureItem = {
  id: string;
  title: string;
  subtitle: string;
  tab: string;
  params?: any;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  roles: number[]; // 1: landlord, 2: tenant
};

const FEATURES: FeatureItem[] = [
  // Landlord Features
  { id: "rooms", title: "Quản lý Phòng trọ", subtitle: "Xem danh sách, thêm sửa xóa phòng", tab: "rooms", icon: "business-outline", color: "#3B82F6", roles: [1] },
  { id: "create_contract", title: "Tạo Hợp đồng thuê", subtitle: "Lập hợp đồng mới cho khách", tab: "contract", params: { action: "create" }, icon: "document-text-outline", color: "#10B981", roles: [1] },
  { id: "contracts", title: "Danh sách Hợp đồng", subtitle: "Tra cứu, bàn giao, thanh lý HĐ", tab: "contract", icon: "reader-outline", color: "#059669", roles: [1] },
  { id: "create_invoice", title: "Lập Hóa đơn tiền trọ", subtitle: "Tạo hóa đơn tháng cho từng phòng", tab: "invoice", params: { action: "create" }, icon: "receipt-outline", color: "#8B5CF6", roles: [1] },
  { id: "bulk_invoice", title: "Lập Hóa đơn hàng loạt", subtitle: "Tính tiền trọ tự động cho cả dãy", tab: "invoice_bulk", icon: "documents-outline", color: "#6366F1", roles: [1] },
  { id: "utility_meter", title: "Chốt số Điện / Nước", subtitle: "Ghi nhận chỉ số đồng hồ định kỳ", tab: "utility", icon: "flash-outline", color: "#F59E0B", roles: [1, 2] },
  { id: "scan_meter", title: "Quét Camera Điện / Nước (OCR)", subtitle: "Chụp ảnh đồng hồ tự nhận diện số", tab: "scan_meter", icon: "camera-outline", color: "#EC4899", roles: [1] },
  { id: "tenants", title: "Danh bạ Khách thuê", subtitle: "Quản lý thông tin cư dân", tab: "tenants", icon: "people-outline", color: "#14B8A6", roles: [1] },
  { id: "scan_cccd", title: "Quét CCCD tự động", subtitle: "Nhận diện thông tin căn cước nhanh", tab: "cccd_scan", icon: "scan-outline", color: "#06B6D4", roles: [1] },
  { id: "repairs", title: "Quản lý Báo sửa chữa", subtitle: "Tiếp nhận và xử lý sự cố phòng", tab: "repair", icon: "construct-outline", color: "#F97316", roles: [1] },
  { id: "services", title: "Dịch vụ & Bảng giá", subtitle: "Cấu hình giá điện, nước, rác, wifi", tab: "services", icon: "pricetags-outline", color: "#84CC16", roles: [1] },
  { id: "vietqr_settings", title: "Cài đặt VietQR & Chữ ký", subtitle: "Thiết lập tài khoản nhận tiền & chữ ký mẫu", tab: "settings", icon: "qr-code-outline", color: "#6B7280", roles: [1] },
  
  // Tenant Features
  { id: "t_invoice", title: "Hóa đơn của tôi", subtitle: "Xem tiền phòng, quét mã VietQR thanh toán", tab: "invoice", icon: "receipt-outline", color: "#8B5CF6", roles: [2] },
  { id: "t_contract", title: "Hợp đồng thuê phòng", subtitle: "Xem điều khoản và ký hợp đồng online", tab: "contract", icon: "document-text-outline", color: "#10B981", roles: [2] },
  { id: "t_repair", title: "Gửi Báo sửa chữa", subtitle: "Báo sự cố điện nước, thiết bị phòng", tab: "repair", icon: "construct-outline", color: "#F97316", roles: [2] },
  { id: "t_profile", title: "Thông tin cá nhân", subtitle: "Cập nhật số điện thoại, CCCD", tab: "account", icon: "person-outline", color: "#3B82F6", roles: [2] },
];

type Props = {
  visible: boolean;
  role?: number;
  onClose: () => void;
  onSelectFeature: (tab: string, params?: any) => void;
};

export default function FeatureSearchModal({
  visible,
  role = 1,
  onClose,
  onSelectFeature,
}: Props) {
  const { theme } = useAppTheme();
  const [keyword, setKeyword] = useState("");

  const filteredFeatures = useMemo(() => {
    const roleFeatures = FEATURES.filter((f) => f.roles.includes(role));
    if (!keyword.trim()) return roleFeatures;

    const lower = keyword.toLowerCase().trim();
    return roleFeatures.filter(
      (f) =>
        f.title.toLowerCase().includes(lower) ||
        f.subtitle.toLowerCase().includes(lower)
    );
  }, [keyword, role]);

  const handleSelect = (item: FeatureItem) => {
    void Haptics.selectionAsync();
    onClose();
    onSelectFeature(item.tab, item.params);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Search Bar */}
        <View style={[styles.searchHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.searchInputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.muted} />
            <AppTextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Tìm kiếm nhanh chức năng trong app..."
              placeholderTextColor={theme.muted}
              value={keyword}
              onChangeText={setKeyword}
              autoFocus
              clearButtonMode="while-editing"
            />
            {keyword.length > 0 && (
              <Pressable onPress={() => setKeyword("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.muted} />
              </Pressable>
            )}
          </View>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <AppText style={[styles.closeBtnText, { color: theme.primary }]}>Đóng</AppText>
          </Pressable>
        </View>

        {/* Feature List */}
        <FlatList
          data={filteredFeatures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <AppText style={[styles.sectionTitle, { color: theme.muted }]}>
              {keyword ? `Kết quả tìm kiếm (${filteredFeatures.length})` : "Tất cả chức năng ứng dụng"}
            </AppText>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.itemRow,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.itemCopy}>
                <AppText style={[styles.itemTitle, { color: theme.text }]}>{item.title}</AppText>
                <AppText style={[styles.itemSubtitle, { color: theme.muted }]}>{item.subtitle}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={theme.muted} />
              <AppText style={[styles.emptyText, { color: theme.muted }]}>
                Không tìm thấy chức năng phù hợp với &quot;{keyword}&quot;
              </AppText>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  searchInputBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  closeBtnText: { fontSize: 15, fontWeight: "700" },
  listContent: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "800" },
  itemSubtitle: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
