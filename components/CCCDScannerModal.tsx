import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/typography";
import { useTranslation } from "../contexts/LanguageContext";
import { ocrService } from "../services/ocrService";
import FeatureIconBox from "./ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (cccdNumber: string, fullName?: string) => void;
};

// Chuẩn tỉ lệ thẻ CCCD quốc tế ID-1: 85.6mm x 53.98mm (~1.58)
const CARD_ASPECT_RATIO = 1.58;

export default function CCCDScannerModal({ visible, onClose, onScan }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);

  const [torchOn, setTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { height, width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 340);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT_RATIO);
  const frameLeft = Math.max(0, (width - cardWidth) / 2);
  const frameTop = Math.max(100, (height - cardHeight) / 2 - 40);
  const frameBottom = frameTop + cardHeight;

  useEffect(() => {
    if (!visible) {
      setIsProcessing(false);
      setStatusMessage("");
      setTorchOn(false);
      permissionRequestedRef.current = false;
      return;
    }

    if (!permission?.granted && permission?.canAskAgain && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
  }, [visible, permission?.canAskAgain, permission?.granted, requestPermission]);

  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Đang chụp & đọc 12 số CCCD qua AI...");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.base64 && !photo?.uri) {
        throw new Error("Không thể chụp ảnh từ Camera.");
      }

      const imageSource = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
      const result = await ocrService.recognizeCCCD(imageSource);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onScan(result.idCard, result.fullName);
      onClose();
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nhận diện CCCD",
        err?.message || "Không nhận diện rõ 12 số CCCD từ ảnh này. Vui lòng căn góc thẳng và chụp lại."
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
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
        setStatusMessage("Đang phân tích ảnh CCCD qua AI Vision...");
        const asset = pickerResult.assets[0];
        const imageSource = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        const result = await ocrService.recognizeCCCD(imageSource);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onScan(result.idCard, result.fullName);
        onClose();
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nhận diện CCCD",
        err?.message || "Không nhận diện rõ thông tin thẻ CCCD từ ảnh được chọn."
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const cameraReady = Boolean(permission?.granted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {cameraReady ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            autofocus="on"
          />
        ) : (
          <View style={styles.permission}>
            <AppText style={styles.message}>
              {permission ? t("mobile.camera.idPermission") : t("mobile.camera.initializing")}
            </AppText>
            {permission ? (
              <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}>
                <AppText style={styles.permissionText}>{t("mobile.camera.allow")}</AppText>
              </Pressable>
            ) : null}
          </View>
        )}

        {cameraReady ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* Scrim Overlay */}
            <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: frameTop }]} />
            <View style={[styles.scrim, { top: frameTop, left: 0, width: frameLeft, height: cardHeight }]} />
            <View style={[styles.scrim, { top: frameTop, left: frameLeft + cardWidth, right: 0, height: cardHeight }]} />
            <View style={[styles.scrim, { top: frameBottom, left: 0, right: 0, bottom: 0 }]} />

            {/* Khung ngắm Căn Cước Công Dân (Card Viewfinder) */}
            <View style={[styles.viewfinder, { top: frameTop, left: frameLeft, width: cardWidth, height: cardHeight }]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Laser / Grid watermark */}
              <View style={styles.cardWatermark}>
                <FeatureIconBox token={FEATURE_ICONS.scanCCCD} size={24} />
                <AppText style={styles.cardWatermarkText}>CĂN CƯỚC CÔNG DÂN</AppText>
              </View>
            </View>

            <AppText style={[styles.hint, { top: frameBottom + 18 }]}>
              Đặt mặt trước thẻ CCCD vừa vặn trong khung để AI đọc chính xác 12 số định danh
            </AppText>
          </View>
        ) : null}

        {/* Top Header Controls */}
        <View style={styles.header}>
          <AppText style={styles.title}>Quét CCCD (AI OCR)</AppText>
          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTorchOn((prev) => !prev)}
              style={[styles.headerBtn, torchOn && styles.headerBtnActive]}
            >
              <Ionicons name={torchOn ? "flash" : "flash-outline"} size={20} color={torchOn ? "#073e36" : "#ffffff"} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Bottom Shutter & Gallery Controls */}
        {cameraReady && !isProcessing ? (
          <View style={styles.bottomControls}>
            <Pressable accessibilityRole="button" onPress={handlePickGallery} style={styles.galleryBtn}>
              <Ionicons name="images-outline" size={24} color="#ffffff" />
              <AppText style={styles.controlLabel}>Chọn ảnh</AppText>
            </Pressable>

            {/* Circular Shutter Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chụp & Nhận diện CCCD"
              onPress={handleCapture}
              style={({ pressed }) => [styles.shutterOuter, pressed && styles.shutterPressed]}
            >
              <View style={styles.shutterInner}>
                <Ionicons name="scan" size={28} color="#073e36" />
              </View>
            </Pressable>

            <View style={{ width: 64, alignItems: "center" }}>
              <AppText style={[styles.controlLabel, { opacity: 0 }]}>Placeholder</AppText>
            </View>
          </View>
        ) : null}

        {/* Loading Overlay */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#10b981" />
              <AppText style={styles.loadingTitle}>Đang phân tích AI Vision...</AppText>
              <AppText style={styles.loadingSubtitle}>{statusMessage}</AppText>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07110e" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnActive: { backgroundColor: "#b8f5da" },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: {
    minHeight: 44,
    marginTop: 20,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#b8f5da",
    paddingHorizontal: 18,
  },
  permissionText: { color: "#073e36", fontWeight: "900" },
  scrim: { position: "absolute", backgroundColor: "rgba(0, 7, 5, 0.68)" },
  viewfinder: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184, 245, 218, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#10b981",
    shadowColor: "#10b981",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  cornerTopLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTopRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBottomRight: { bottom: -2, right: -2, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 16 },
  cardWatermark: { alignItems: "center", gap: 6 },
  cardWatermarkText: { color: "rgba(184, 245, 218, 0.3)", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  hint: {
    position: "absolute",
    left: 24,
    right: 24,
    color: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
  },
  galleryBtn: { width: 64, alignItems: "center", gap: 4 },
  controlLabel: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  shutterPressed: { transform: [{ scale: 0.92 }], opacity: 0.8 },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#b8f5da",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    padding: 24,
  },
  loadingBox: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#374151",
    width: "85%",
    maxWidth: 320,
  },
  loadingTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  loadingSubtitle: { color: "#9ca3af", fontSize: 13, textAlign: "center", lineHeight: 18 },
});
