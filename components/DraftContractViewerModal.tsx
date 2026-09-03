import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../constants/api";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppText } from "./ui/typography";

type Props = {
  visible: boolean;
  draftData: {
    roomId?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
    fixedRentPrice?: string | number;
    fixedDeposit?: string | number;
    electricityPrice?: string | number;
    waterPrice?: string | number;
    propertyAddress?: string;
    services?: any;
  } | null;
  onClose: () => void;
  useModal?: boolean;
};

export default function DraftContractViewerModal({ visible, draftData, onClose, useModal = true }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tính toán khoảng cách an toàn cho tai thỏ / Dynamic Island trên iPhone
  const topPadding = Math.max(insets.top, Platform.OS === "ios" ? 54 : 24);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 10);

  useEffect(() => {
    if (!visible || !draftData) {
      setHtmlContent(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await authService.getToken();
        const rentStr = String(draftData.fixedRentPrice ?? "").replace(/\D/g, "");
        const depStr = String(draftData.fixedDeposit ?? "").replace(/\D/g, "");
        const elecStr = String(draftData.electricityPrice ?? "").replace(/\D/g, "");
        const waterStr = String(draftData.waterPrice ?? "").replace(/\D/g, "");

        const res = await fetch(`${API_BASE_URL}/contracts/preview-draft`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId: draftData.roomId,
            tenantId: draftData.tenantId,
            startDate: draftData.startDate,
            endDate: draftData.endDate,
            fixedRentPrice: rentStr,
            fixedDeposit: depStr,
            electricityPrice: elecStr,
            waterPrice: waterStr,
            propertyAddress: draftData.propertyAddress,
            services: draftData.services,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi tải bản xem trước (${res.status})`);
        }

        const text = await res.text();
        let html = text;
        try {
          const parsed = JSON.parse(text);
          if (parsed.data?.html) {
            html = parsed.data.html;
          }
        } catch {}
        if (isMounted) {
          setHtmlContent(html);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Không thể tải bản xem trước.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [visible, draftData]);

  if (!visible) return null;

  const content = (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header bar tránh hoàn toàn Dynamic Island & Status Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: topPadding + 6 }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <AppText style={[styles.title, { color: theme.text }]}>Xem trước toàn bộ hợp đồng</AppText>
          <AppText style={[styles.subtitle, { color: theme.muted }]}>Dự thảo chi tiết trước khi xác nhận tạo</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <View style={[styles.closeIconCircle, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Ionicons name="close" size={22} color={theme.text} />
          </View>
        </Pressable>
      </View>

      {/* Viewer content */}
      <View style={styles.viewer}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} size="large" />
            <AppText style={[styles.loadingText, { color: theme.muted }]}>Đang kết xuất bản xem trước...</AppText>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
            <AppText style={{ color: theme.text, textAlign: "center", fontSize: 14 }}>{error}</AppText>
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.retry, { backgroundColor: theme.primary }]}>
              <AppText style={{ color: theme.background, fontWeight: "700" }}>Quay lại chỉnh sửa</AppText>
            </Pressable>
          </View>
        ) : htmlContent ? (
          <WebView
            source={{ html: htmlContent }}
            originWhitelist={["*"]}
            style={styles.webView}
          />
        ) : null}
      </View>

      {/* Thanh điều hướng đáy để đóng tiện lợi */}
      <View style={[styles.footerBar, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: bottomPadding + 6 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.footerCloseBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="arrow-back" size={18} color={theme.background} />
          <AppText style={[styles.footerCloseText, { color: theme.background }]}>
            Đóng bản xem trước & Quay lại
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  if (useModal) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
        {content}
      </Modal>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999999, elevation: 999999, backgroundColor: theme.background }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 3, fontWeight: "500" },
  closeButton: { padding: 4, alignItems: "center", justifyContent: "center" },
  closeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  viewer: { flex: 1 },
  webView: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  footerBar: {
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCloseBtn: {
    minHeight: 46,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  footerCloseText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
