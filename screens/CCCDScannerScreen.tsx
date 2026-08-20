import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/typography";
import { useTranslation } from "../contexts/LanguageContext";
import { ocrService, type CCCDRecognitionResult } from "../services/ocrService";

type Props = {
  onBack: () => void;
  onScan?: (result: CCCDRecognitionResult) => void;
};

export default function CCCDScannerScreen({ onBack, onScan }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CCCDRecognitionResult | null>(null);

  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;
    try {
      setIsProcessing(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
      });

      if (!photo?.base64 && !photo?.uri) {
        throw new Error("Không thể chụp ảnh.");
      }

      const imageSource = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
      const ocrData = await ocrService.recognizeCCCD(imageSource);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(ocrData);
      onScan?.(ocrData);
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Lỗi nhận diện", err?.message || "Không thể đọc 12 số CCCD từ ảnh này. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickGallery = async () => {
    if (isProcessing) return;
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        setIsProcessing(true);
        const asset = pickerResult.assets[0];
        const imageSource = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        const ocrData = await ocrService.recognizeCCCD(imageSource);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResult(ocrData);
        onScan?.(ocrData);
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Lỗi nhận diện", err?.message || "Không nhận diện rõ thông tin thẻ CCCD.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          autofocus="on"
        />
      ) : (
        <View style={styles.permission}>
          <AppText style={styles.message}>Cần cấp quyền Camera để nhận diện CCCD.</AppText>
          <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}>
            <AppText style={styles.permissionText}>{t("common.confirm")}</AppText>
          </Pressable>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <AppText style={styles.title}>Quét CCCD (AI OCR)</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setTorchOn((p) => !p)}
            style={[styles.headerBtn, torchOn && { backgroundColor: "#b8f5da" }]}
          >
            <Ionicons name={torchOn ? "flash" : "flash-outline"} size={20} color={torchOn ? "#073e36" : "#ffffff"} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onBack} style={styles.close}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* Card Alignment Overlay */}
      {permission?.granted && !result ? (
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.cardFrame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Ionicons name="card-outline" size={40} color="rgba(184, 245, 218, 0.3)" />
            <AppText style={styles.frameLabel}>MẶT TRƯỚC THẺ CCCD</AppText>
          </View>
          <AppText style={styles.hint}>Căn mặt trước thẻ CCCD vào khung và bấm chụp</AppText>
        </View>
      ) : null}

      {/* Result Card */}
      {result ? (
        <View style={styles.result}>
          <AppText style={styles.resultTitle}>ĐÃ NHẬN DIỆN THÀNH CÔNG</AppText>
          {result.fullName ? <AppText style={styles.resultText}>👤 {result.fullName}</AppText> : null}
          <AppText style={[styles.resultText, { fontSize: 18, color: "#b8f5da" }]}>💳 {result.idCard}</AppText>
          <Pressable accessibilityRole="button" onPress={() => setResult(null)} style={styles.retry}>
            <AppText style={styles.retryText}>Chụp lại</AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Bottom Shutter Controls */}
      {permission?.granted && !result ? (
        <View style={styles.bottomControls}>
          <Pressable accessibilityRole="button" onPress={handlePickGallery} style={styles.sideBtn}>
            <Ionicons name="images-outline" size={24} color="#ffffff" />
            <AppText style={styles.sideBtnText}>Chọn ảnh</AppText>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={handleCapture} style={styles.shutter}>
            <View style={styles.shutterInner}>
              <Ionicons name="scan" size={26} color="#073e36" />
            </View>
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      ) : null}

      {/* Loading Overlay */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <AppText style={styles.loadingText}>Đang đọc số CCCD qua AI Vision...</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1511" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,.45)",
  },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: {
    minHeight: 44,
    marginTop: 20,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#10b981",
    paddingHorizontal: 18,
  },
  permissionText: { color: "#ffffff", fontWeight: "800" },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  cardFrame: {
    width: 320,
    height: 202,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184, 245, 218, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#10b981" },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  frameLabel: { color: "rgba(184, 245, 218, 0.4)", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  hint: { marginTop: 24, color: "#ffffff", textAlign: "center", fontSize: 14, fontWeight: "700" },
  result: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "#374151",
    zIndex: 10,
  },
  resultTitle: { color: "#10b981", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  resultText: { color: "#ffffff", marginTop: 6, fontSize: 16, fontWeight: "800" },
  retry: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#b8f5da",
  },
  retryText: { color: "#073e36", fontWeight: "900" },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  sideBtn: { width: 60, alignItems: "center", gap: 4 },
  sideBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#b8f5da",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 20,
  },
  loadingText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
});
