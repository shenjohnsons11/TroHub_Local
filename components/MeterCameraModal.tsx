import React, { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import TroHubIcon from "@/components/ui/icons/TroHubIcon";
import { ocrService } from "../services/ocrService";
import type { MeterType } from "../utils/meterReadingTarget";
import { useTranslation } from "../contexts/LanguageContext";
import { formatMeterReading, parseMeterReading } from "../utils/formatters";

type Props = {
  visible: boolean;
  roomCode: string;
  initialMeterType: MeterType;
  onClose: () => void;
  onRead: (meterType: MeterType, digits: string) => void;
};

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 100;

function getRoiCrop(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number) {
  const width = Math.max(1, Math.min(imageWidth, Math.round(imageWidth * FRAME_WIDTH / viewportWidth)));
  const height = Math.max(1, Math.min(imageHeight, Math.round(imageHeight * FRAME_HEIGHT / viewportHeight)));
  return {
    originX: Math.max(0, Math.round((imageWidth - width) / 2)),
    originY: Math.max(0, Math.round((imageHeight - height) / 2)),
    width,
    height,
  };
}

export default function MeterCameraModal({ visible, roomCode, initialMeterType, onClose, onRead }: Props) {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const laserAnim = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [meterType, setMeterType] = useState<MeterType>(initialMeterType);
  const [reading, setReading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState("");
  const [recognizedReading, setRecognizedReading] = useState("");
  const { width, height } = useWindowDimensions();
  const frameLeft = Math.max(0, (width - FRAME_WIDTH) / 2);
  const frameTop = Math.max(132, (height - FRAME_HEIGHT) / 2);
  const frameBottom = frameTop + FRAME_HEIGHT;
  const laserY = laserAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FRAME_HEIGHT - 3] });

  useEffect(() => {
    if (!visible) {
      setTorchOn(false);
      setRecognizedReading("");
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [laserAnim, visible]);

  useEffect(() => {
    if (visible) {
      setMeterType(initialMeterType);
      setError("");
      setRecognizedReading("");
    }
  }, [visible, initialMeterType]);

  const capture = async () => {
    if (!cameraRef.current || reading) return;
    try {
      setReading(true);
      setError("");
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri || !photo.width || !photo.height) throw new Error(t("mobile.camera.invalidImage"));

      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: getRoiCrop(photo.width, photo.height, width, height) }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      const result = await ocrService.recognizeMeterReading(cropped.uri, meterType);
      setRecognizedReading(result.digits);
    } catch {
      setError(t("mobile.camera.readError"));
    } finally {
      setReading(false);
    }
  };

  const confirmReading = () => {
    const parsed = parseMeterReading(recognizedReading);
    if (parsed === null) {
      setError("Vui lòng kiểm tra và nhập lại chỉ số hợp lệ.");
      return;
    }
    onRead(meterType, formatMeterReading(parsed));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!reading) onClose(); }} statusBarTranslucent>
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
            <AppText style={styles.message}>{permission ? t("mobile.camera.meterPermission") : t("mobile.camera.initializing")}</AppText>
            {permission ? <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}><AppText style={styles.permissionText}>{t("mobile.camera.allow")}</AppText></Pressable> : null}
          </View>
        )}

        {permission?.granted ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: frameTop }]} />
            <View style={[styles.scrim, { top: frameTop, left: 0, width: frameLeft, height: FRAME_HEIGHT }]} />
            <View style={[styles.scrim, { top: frameTop, left: frameLeft + FRAME_WIDTH, right: 0, height: FRAME_HEIGHT }]} />
            <View style={[styles.scrim, { top: frameBottom, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.viewfinder, { top: frameTop, left: frameLeft }]}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <Animated.View style={[styles.laser, { transform: [{ translateY: laserY }] }]} />
            </View>
            <AppText style={[styles.hint, { top: frameBottom + 18 }]}>{t("mobile.camera.meterHint")}</AppText>
          </View>
        ) : null}

        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TroHubIcon name="meter" size="sm" badge glow />
            <View>
              <AppText style={styles.title}>{t("mobile.camera.meterTitle", { roomCode })}</AppText>
              <AppText style={styles.subtitle}>{t("mobile.camera.meterSubtitle")}</AppText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(torchOn ? "mobile.camera.flashOff" : "mobile.camera.flashOn")}
              accessibilityState={{ selected: torchOn }}
              disabled={reading || Boolean(recognizedReading)}
              onPress={() => setTorchOn((current) => !current)}
              style={[styles.flash, torchOn && styles.flashActive]}
            >
              <Ionicons name={torchOn ? "flash" : "flash-outline"} size={19} color={torchOn ? "#07110e" : "#ffffff"} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.camera.meterClose")} disabled={reading} onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {permission?.granted && recognizedReading ? (
          <View style={styles.confirmation}>
            <AppText style={styles.confirmationTitle}>Xác nhận chỉ số {meterType === "electricity" ? "điện" : "nước"}</AppText>
            <AppText style={styles.confirmationHint}>OCR chỉ gợi ý kết quả. Bạn có thể chỉnh sửa trước khi áp dụng.</AppText>
            <AppTextInput
              accessibilityLabel="Chỉ số đồng hồ đã nhận diện"
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                const parsed = parseMeterReading(value);
                setRecognizedReading(parsed === null ? value : formatMeterReading(parsed));
              }}
              style={styles.confirmationInput}
              value={recognizedReading}
            />
            <View style={styles.confirmationActions}>
              <Pressable accessibilityRole="button" onPress={() => { setRecognizedReading(""); setError(""); }} style={styles.retakeButton}><AppText style={styles.retakeText}>Chụp lại</AppText></Pressable>
              <Pressable accessibilityRole="button" onPress={confirmReading} style={styles.confirmButton}><Ionicons name="checkmark" size={18} color="#073e36" /><AppText style={styles.confirmText}>Áp dụng chỉ số</AppText></Pressable>
            </View>
          </View>
        ) : permission?.granted ? (
          <View style={styles.controls}>
            {error ? <AppText accessibilityLiveRegion="polite" style={styles.error}>{error}</AppText> : null}
            <View style={styles.modeRow}>
              {(["electricity", "water"] as MeterType[]).map((type) => (
                <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: meterType === type }} disabled={reading} onPress={() => setMeterType(type)} style={[styles.mode, meterType === type && styles.modeActive]}>
                  <AppText style={[styles.modeText, meterType === type && styles.modeTextActive]}>{t(type === "electricity" ? "mobile.camera.electricity" : "mobile.camera.water")}</AppText>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.camera.captureLabel", { meterType: t(meterType === "electricity" ? "mobile.camera.electricity" : "mobile.camera.water"), roomCode })} disabled={reading} onPress={() => void capture()} style={styles.capture}>
              {reading ? <ActivityIndicator color="#073e36" /> : <><Ionicons name="camera" size={20} color="#073e36" /><AppText style={styles.captureText}>{t("mobile.camera.capture")}</AppText></>}
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07110e" },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 60 },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  subtitle: { color: "#d1e8dc", fontSize: 12, marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  flash: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" },
  flashActive: { backgroundColor: "#facc15" },
  close: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: { minHeight: 44, marginTop: 20, justifyContent: "center", borderRadius: 12, backgroundColor: "#b8f5da", paddingHorizontal: 18 },
  permissionText: { color: "#073e36", fontWeight: "900" },
  scrim: { position: "absolute", backgroundColor: "rgba(0, 7, 5, 0.62)" },
  viewfinder: { position: "absolute", width: FRAME_WIDTH, height: FRAME_HEIGHT },
  corner: { position: "absolute", width: 30, height: 26, borderColor: "#b8f5da", shadowColor: "#b8f5da", shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  bottomRight: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 10 },
  laser: { position: "absolute", left: 2, right: 2, top: 0, height: 3, backgroundColor: "#b8f5da", shadowColor: "#b8f5da", shadowOpacity: 1, shadowRadius: 7, elevation: 7 },
  hint: { position: "absolute", left: 24, right: 24, color: "#ffffff", textAlign: "center", fontSize: 14, fontWeight: "700", lineHeight: 21 },
  controls: { position: "absolute", left: 20, right: 20, bottom: 34, gap: 12 },
  error: { alignSelf: "center", maxWidth: "90%", color: "#fee2e2", textAlign: "center", fontSize: 12, fontWeight: "700" },
  modeRow: { flexDirection: "row", alignSelf: "center", gap: 8, padding: 5, borderRadius: 16, backgroundColor: "rgba(0,0,0,.52)" },
  mode: { minHeight: 44, borderRadius: 11, paddingHorizontal: 16, justifyContent: "center" },
  modeActive: { backgroundColor: "#b8f5da" },
  modeText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  modeTextActive: { color: "#073e36" },
  capture: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#b8f5da" },
  captureText: { color: "#073e36", fontSize: 15, fontWeight: "900" },
  confirmation: { position: "absolute", bottom: 28, left: 20, right: 20, gap: 10, borderRadius: 20, backgroundColor: "#f4f8f5", padding: 16 },
  confirmationTitle: { color: "#1a202c", fontSize: 16, fontWeight: "900" },
  confirmationHint: { color: "#52635c", fontSize: 12, lineHeight: 18 },
  confirmationInput: { minHeight: 50, borderRadius: 12, backgroundColor: "#ffffff", color: "#1a202c", fontSize: 20, fontWeight: "800", paddingHorizontal: 14 },
  confirmationActions: { flexDirection: "row", gap: 10 },
  retakeButton: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 48, borderRadius: 12, backgroundColor: "#dff1e7" },
  retakeText: { color: "#0f5247", fontWeight: "800" },
  confirmButton: { alignItems: "center", flex: 1.4, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 48, borderRadius: 12, backgroundColor: "#b8f5da" },
  confirmText: { color: "#073e36", fontWeight: "900" },
});
