import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../contexts/LanguageContext";
import { Contract } from "../types/Contract";

type Props = {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onConfirmSign: (signatureBase64: string) => Promise<void>;
};

export default function ContractSignModal({
  visible,
  contract,
  onClose,
  onConfirmSign,
}: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);

  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [signing, setSigning] = useState(false);
  const isDark = resolvedTheme === "dark";

  const signaturePadHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body {
      background-color: ${isDark ? "#1F2937" : "#F9FAFB"};
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    #canvas {
      width: 100%;
      height: 100%;
      touch-action: none;
      background: transparent;
      cursor: crosshair;
    }
    .placeholder {
      position: absolute;
      color: ${isDark ? "#6B7280" : "#9CA3AF"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="hint" class="placeholder">✍️ Dùng ngón tay ký tên vào đây</div>
  <canvas id="canvas"></canvas>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const hint = document.getElementById('hint');
    let drawing = false;
    let hasDrawn = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '${isDark ? "#60A5FA" : "#1D4ED8"}';
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 100);

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (!hasDrawn) {
        hasDrawn = true;
        hint.style.display = 'none';
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DRAWN' }));
      }
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function endDraw(e) {
      if (!drawing) return;
      e.preventDefault();
      drawing = false;
    }

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: false });

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);

    window.clearCanvas = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      hint.style.display = 'block';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEARED' }));
    };

    window.getSignature = function() {
      if (!hasDrawn) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EMPTY' }));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIGNATURE', data: dataUrl }));
    };
  </script>
</body>
</html>
`;

  const handleMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "DRAWN") {
        setHasDrawn(true);
      } else if (msg.type === "CLEARED") {
        setHasDrawn(false);
      } else if (msg.type === "EMPTY") {
        setSigning(false);
      } else if (msg.type === "SIGNATURE" && msg.data) {
        try {
          await onConfirmSign(msg.data);
        } finally {
          setSigning(false);
        }
      }
    } catch (e) {
      setSigning(false);
    }
  };

  const handleClear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript("window.clearCanvas(); true;");
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    if (!hasDrawn || !agreed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSigning(true);
    webViewRef.current?.injectJavaScript("window.getSignature(); true;");
  };

  if (!visible || !contract) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ gap: 2 }}>
              <AppText style={[styles.title, { color: theme.text }]}>
                Ký Hợp Đồng Thuê Phòng
              </AppText>
              <AppText style={[styles.subtitle, { color: theme.muted }]}>
                Phòng {contract.room} • {contract.tenantName}
              </AppText>
            </View>

            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={theme.muted} />
            </Pressable>
          </View>

          {/* Quick Summary Pill */}
          <View style={[styles.summaryPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.summaryItem}>
              <AppText style={[styles.summaryLabel, { color: theme.muted }]}>Tiền thuê</AppText>
              <AppText style={[styles.summaryVal, { color: theme.primary }]}>{contract.rentFee}</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AppText style={[styles.summaryLabel, { color: theme.muted }]}>Tiền cọc</AppText>
              <AppText style={[styles.summaryVal, { color: theme.warning }]}>{contract.deposit}</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AppText style={[styles.summaryLabel, { color: theme.muted }]}>Thời hạn</AppText>
              <AppText style={[styles.summaryVal, { color: theme.text }]}>{contract.startDate}</AppText>
            </View>
          </View>

          {/* Signature Canvas Box */}
          <View style={styles.canvasSection}>
            <View style={styles.canvasHeader}>
              <AppText style={[styles.canvasLabel, { color: theme.text }]}>
                Chữ ký tay điện tử của bạn:
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={handleClear}
                style={[styles.clearBtn, !hasDrawn && { opacity: 0.5 }]}
                disabled={!hasDrawn}
              >
                <Ionicons name="refresh-outline" size={14} color="#EF4444" />
                <AppText style={styles.clearBtnText}>Xóa vẽ lại</AppText>
              </Pressable>
            </View>

            <View style={[styles.canvasWrapper, { borderColor: hasDrawn ? theme.primary : theme.border }]}>
              <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                source={{ html: signaturePadHtml }}
                onMessage={handleMessage}
                style={styles.webView}
                scrollEnabled={false}
              />
            </View>
          </View>

          {/* Legal Agreement Checkbox */}
          <Pressable
            style={styles.agreeRow}
            onPress={() => setAgreed(!agreed)}
            accessibilityRole="checkbox"
          >
            <Ionicons
              name={agreed ? "checkbox" : "square-outline"}
              size={20}
              color={agreed ? theme.primary : theme.muted}
            />
            <AppText style={[styles.agreeText, { color: theme.text }]}>
              Tôi đã đọc kỹ và cam kết tuân thủ toàn bộ các điều khoản trong hợp đồng thuê phòng.
            </AppText>
          </Pressable>

          {/* Submit Sign Button */}
          <Pressable
            accessibilityRole="button"
            disabled={!hasDrawn || !agreed || signing}
            onPress={handleConfirm}
            style={[
              styles.signBtn,
              { backgroundColor: theme.primary },
              (!hasDrawn || !agreed || signing) && { opacity: 0.5 },
            ]}
          >
            {signing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" />
                <AppText style={styles.signBtnText}>Xác nhận Ký & Xuất Hợp Đồng</AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "900" },
  subtitle: { fontSize: 13, fontWeight: "600" },
  closeBtn: { padding: 4 },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryLabel: { fontSize: 11, fontWeight: "700" },
  summaryVal: { fontSize: 12, fontWeight: "900" },
  summaryDivider: { width: 1, height: 24, backgroundColor: "rgba(150,150,150,0.2)" },
  canvasSection: { gap: 8 },
  canvasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  canvasLabel: { fontSize: 13, fontWeight: "800" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  clearBtnText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  canvasWrapper: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  webView: { flex: 1, backgroundColor: "transparent" },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  agreeText: { fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 17 },
  signBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  signBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
