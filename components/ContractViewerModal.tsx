import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../constants/api";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppText } from "./ui/typography";
import { useTranslation } from "../contexts/LanguageContext";
import FeatureIconBox from "./ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

type Props = {
  visible: boolean;
  contractId: string | null;
  onClose: () => void;
  useModal?: boolean;
};

export default function ContractViewerModal({ visible, contractId, onClose, useModal = true }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Khoảng cách an toàn trên iPhone Dynamic Island & tai thỏ
  const topPadding = Math.max(insets.top, Platform.OS === "ios" ? 54 : 24);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 10);

  useEffect(() => {
    if (!visible || !contractId) return;
    setFailed(false);
    void authService.getToken().then(setToken);
  }, [visible, contractId]);

  if (!visible || !contractId) return null;

  const uri = `${API_BASE_URL}/contracts/${contractId}/viewer`;

  const content = (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header bar tránh hoàn toàn Dynamic Island & Status Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: topPadding + 6 }]}>
        <View style={{ flex: 1, paddingRight: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <FeatureIconBox token={FEATURE_ICONS.contracts} size={20} accessibilityLabel="Xem trước toàn bộ hợp đồng" />
          <View style={{ flex: 1 }}>
          <AppText style={[styles.title, { color: theme.text }]}>Xem trước toàn bộ hợp đồng</AppText>
          <AppText style={[styles.subtitle, { color: theme.muted }]}>
            Toàn văn điều khoản pháp lý & chữ ký số TroHub
          </AppText>
          </View>
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

      {/* Nội dung hợp đồng */}
      <View style={styles.viewer}>
        {failed ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
            <AppText style={{ color: theme.text, fontSize: 14, textAlign: "center" }}>
              {t("tenantContract.viewerError")}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFailed(false);
                setToken(null);
                void authService.getToken().then(setToken);
              }}
              style={[styles.retry, { backgroundColor: theme.primary }]}
            >
              <AppText style={{ color: theme.background, fontWeight: "700" }}>{t("common.retry")}</AppText>
            </Pressable>
          </View>
        ) : token && uri ? (
          <WebView
            source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
            originWhitelist={["*"]}
            onError={() => setFailed(true)}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.primary} size="large" />
                <AppText style={[styles.loadingText, { color: theme.muted }]}>
                  Đang tải toàn bộ văn bản hợp đồng...
                </AppText>
              </View>
            )}
            style={styles.webView}
          />
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} size="large" />
            <AppText style={[styles.loadingText, { color: theme.muted }]}>Đang kết nối xác thực...</AppText>
          </View>
        )}
      </View>

      {/* Thanh điều hướng đáy để đóng thuận tiện cho ngón tay cái */}
      <View
        style={[
          styles.footerBar,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.surface,
            paddingBottom: bottomPadding + 6,
          },
        ]}
      >
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
