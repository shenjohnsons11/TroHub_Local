import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../constants/api";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppText } from "./ui/typography";

type Props = {
  visible: boolean;
  draftData: {
    roomId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    fixedRentPrice: string;
    fixedDeposit: string;
    electricityPrice?: string;
    waterPrice?: string;
    propertyAddress?: string;
    services?: any;
  } | null;
  onClose: () => void;
};

export default function DraftContractViewerModal({ visible, draftData, onClose }: Props) {
  const { theme } = useAppTheme();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            fixedRentPrice: draftData.fixedRentPrice?.replace(/\./g, ""),
            fixedDeposit: draftData.fixedDeposit?.replace(/\./g, ""),
            electricityPrice: draftData.electricityPrice?.replace(/\./g, ""),
            waterPrice: draftData.waterPrice?.replace(/\./g, ""),
            propertyAddress: draftData.propertyAddress,
            services: draftData.services,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi tải bản xem trước (${res.status})`);
        }

        const html = await res.text();
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View>
            <AppText style={[styles.title, { color: theme.text }]}>Xem trước toàn văn hợp đồng</AppText>
            <AppText style={[styles.subtitle, { color: theme.muted }]}>Dự thảo chi tiết trước khi xác nhận tạo</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <Ionicons name="close" size={26} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.viewer}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} size="large" />
              <AppText style={[styles.loadingText, { color: theme.muted }]}>Đang kết xuất bản xem trước...</AppText>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
              <AppText style={{ color: theme.text, textAlign: "center" }}>{error}</AppText>
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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  viewer: { flex: 1 },
  webView: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
});
