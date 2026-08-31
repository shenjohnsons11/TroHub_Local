import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../constants/api";
import { authService } from "../services/authService";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppText } from "./ui/typography";
import { useTranslation } from "../contexts/LanguageContext";

type Props = { visible: boolean; contractId: string | null; onClose: () => void };

export default function ContractViewerModal({ visible, contractId, onClose }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible || !contractId) return;
    setFailed(false);
    void authService.getToken().then(setToken);
  }, [visible, contractId]);

  const uri = contractId ? `${API_BASE_URL}/contracts/${contractId}/viewer` : "";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <AppText style={[styles.title, { color: theme.text }]}>{t("tenantContract.viewerTitle")}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={t("tenantContract.closeViewer")} onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <Ionicons name="close" size={25} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.viewer}>
          {failed ? (
            <View style={styles.centered}>
              <AppText style={{ color: theme.text }}>{t("tenantContract.viewerError")}</AppText>
              <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setToken(null); void authService.getToken().then(setToken); }} style={[styles.retry, { backgroundColor: theme.primary }]}>
                <AppText style={{ color: theme.background, fontWeight: "700" }}>{t("common.retry")}</AppText>
              </Pressable>
            </View>
          ) : token && uri ? (
            <WebView
              source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
              originWhitelist={["*"]}
              onError={() => setFailed(true)}
              startInLoadingState
              renderLoading={() => <ActivityIndicator color={theme.primary} size="large" />}
              style={styles.webView}
            />
          ) : (
            <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: "700" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  viewer: { flex: 1 },
  webView: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
