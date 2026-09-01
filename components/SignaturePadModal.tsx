import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import AppButton from "./ui/AppButton";

type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
};

export default function SignaturePadModal({ visible, title = "Chữ ký mẫu Chủ trọ", onClose, onSave }: Props) {
  const { theme } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  const canvasHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; -webkit-user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }
    #canvas { flex: 1; width: 100%; height: 100%; cursor: crosshair; background: #ffffff; }
    #hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #94a3b8; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; pointer-events: none; }
  </style>
</head>
<body>
  <div id="hint">Ký tên tại đây</div>
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
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
    window.addEventListener('resize', resize);
    setTimeout(resize, 80);

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function start(e) {
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

    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function end() {
      drawing = false;
    }

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);

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

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "DRAWN") setHasDrawn(true);
      else if (msg.type === "CLEARED") setHasDrawn(false);
      else if (msg.type === "EMPTY") setSaving(false);
      else if (msg.type === "SIGNATURE" && msg.data) {
        setSaving(false);
        onSave(msg.data);
        onClose();
      }
    } catch {
      setSaving(false);
    }
  };

  const handleClear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript("window.clearCanvas(); true;");
    setHasDrawn(false);
  };

  const handleConfirmDraw = () => {
    if (!hasDrawn) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    webViewRef.current?.injectJavaScript("window.getSignature(); true;");
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const mime = result.assets[0].mimeType || "image/png";
        const base64Uri = `data:${mime};base64,${result.assets[0].base64}`;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(base64Uri);
        onClose();
      }
    } catch (e) {
      console.warn("Pick signature error:", e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View>
            <AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>
            <AppText style={[styles.subtitle, { color: theme.muted }]}>Ký tay vào khung hoặc tải ảnh chữ ký có sẵn</AppText>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={[styles.canvasBox, { borderColor: theme.border, shadowColor: theme.text }]}>
            <WebView
              ref={webViewRef}
              source={{ html: canvasHtml }}
              onMessage={handleMessage}
              scrollEnabled={false}
              style={styles.webView}
            />
          </View>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={handleClear} style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Ionicons name="refresh-outline" size={18} color={theme.text} />
              <AppText style={[styles.actionText, { color: theme.text }]}>Xóa vẽ lại</AppText>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={handlePickImage} style={[styles.actionBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft }]}>
              <Ionicons name="images-outline" size={18} color={theme.primary} />
              <AppText style={[styles.actionText, { color: theme.primary }]}>Chọn ảnh có sẵn</AppText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <AppButton variant="outline" onPress={onClose} style={styles.cancelBtn}>
            Đóng
          </AppButton>
          <AppButton
            loading={saving}
            disabled={!hasDrawn || saving}
            icon="checkmark-circle-outline"
            iconPosition="right"
            onPress={handleConfirmDraw}
            style={styles.saveBtn}
          >
            Lưu chữ ký này
          </AppButton>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 18, fontWeight: "900" },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 18, justifyContent: "center", gap: 14 },
  canvasBox: { height: 260, borderRadius: 18, overflow: "hidden", borderWidth: 1.5, borderStyle: "dashed", backgroundColor: "#ffffff", elevation: 4, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  webView: { flex: 1, backgroundColor: "#ffffff" },
  actions: { flexDirection: "row", gap: 12, justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: "800" },
  footer: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  cancelBtn: { minWidth: 90 },
  saveBtn: { flex: 1 },
});
