import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { adminService, AdminRoom } from "../services/adminService";
import { ocrService } from "../services/ocrService";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  onBack?: () => void;
  onSuccess?: () => void;
};

export default function MeterScannerScreen({ onBack, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const { width } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);

  const [flashOn, setFlashOn] = useState(false);
  const [meterType, setMeterType] = useState<"electricity" | "water">("electricity");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [scannedDigits, setScannedDigits] = useState("");
  const [redDigits, setRedDigits] = useState("");
  const [scannedNote, setScannedNote] = useState("");
  const [saving, setSaving] = useState(false);

  const laserAnim = useRef(new Animated.Value(0)).current;

  // Frame dimension calculations
  const frameWidth = Math.min(width - 48, 320);
  const frameHeight = 160;

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
  }, [permission?.canAskAgain, permission?.granted, requestPermission]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    adminService.getRooms().then((res) => {
      setRooms(res);
      if (res.length > 0) setSelectedRoomId(res[0]._id);
    }).catch(() => undefined);

    return () => animation.stop();
  }, []);

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameHeight - 4],
  });

  const processOCR = async (base64Data: string) => {
    setScanning(true);
    setStatusMessage(
      meterType === "electricity"
        ? "Gemini Vision AI đang đọc số ĐEN & bỏ qua số ĐỎ (kWh)..."
        : "Gemini Vision AI đang đọc số ĐEN & bỏ qua số ĐỎ (m³)..."
    );
    try {
      const res = await ocrService.recognizeMeterReading(base64Data, meterType);
      if (res && res.digits) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScannedDigits(res.digits);
        setRedDigits(res.redDigits || "");
        setScannedNote(res.note || "✓ Đã tự động lọc bỏ số phụ màu đỏ");
        setModalVisible(true);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        notification.error(t("invoices.ocrError"));
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      notification.error(err?.message || t("invoices.ocrError"));
    } finally {
      setScanning(false);
      setStatusMessage("");
    }
  };

  const handleCaptureCamera = async () => {
    if (scanning || !cameraRef.current) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setScanning(true);
      setStatusMessage("Đang chụp ảnh đồng hồ...");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64 && !photo?.uri) {
        throw new Error("Không thể chụp ảnh từ Camera.");
      }

      setCapturedImage(photo.uri);
      const base64Img = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
      await processOCR(base64Img);
    } catch (e: any) {
      notification.error(e?.message || "Không thể chụp ảnh");
      setScanning(false);
      setStatusMessage("");
    }
  };

  const handlePickFromGallery = async () => {
    if (scanning) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notification.error("Cần quyền truy cập Thư viện ảnh");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setCapturedImage(result.assets[0].uri);
        await processOCR(base64Img);
      }
    } catch (e) {
      notification.error(t("common.error"));
    }
  };

  const handleAdjustDigits = (delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentNum = parseInt(scannedDigits.replace(/\D/g, "") || "0", 10);
    const nextNum = Math.max(0, currentNum + delta);
    setScannedDigits(String(nextNum));
  };

  const handleSaveMeterReading = async () => {
    if (!selectedRoomId) {
      notification.error(t("contracts.selectRoom"));
      return;
    }
    if (!scannedDigits.trim()) {
      notification.error(t("common.error"));
      return;
    }

    setSaving(true);
    try {
      const digitsNumber = Number(scannedDigits.replace(",", "."));
      await adminService.reportUtilityReading({
        roomId: selectedRoomId,
        electricity: meterType === "electricity" ? digitsNumber : undefined,
        water: meterType === "water" ? digitsNumber : undefined,
      });

      notification.success(t("common.success"));
      setModalVisible(false);
      onSuccess?.();
      onBack?.();
    } catch (err) {
      notification.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Camera View or Permission Prompt */}
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
        />
      ) : (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#10B981" />
          <AppText style={styles.permissionTitle}>Quyền truy cập Camera</AppText>
          <AppText style={styles.permissionDesc}>
            Ứng dụng cần quyền Camera để chụp và nhận diện mặt đồng hồ điện nước qua AI Vision.
          </AppText>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <AppText style={styles.permissionBtnText}>Cho phép dùng Camera</AppText>
          </Pressable>
        </View>
      )}

      {/* 2. Top Header Navigation & Type Selector */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}

        <View style={styles.typeSelector}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMeterType("electricity")}
            style={[
              styles.typeTab,
              meterType === "electricity" && { backgroundColor: "#F59E0B" },
            ]}
          >
            <Ionicons name="flash" size={14} color={meterType === "electricity" ? "#ffffff" : "#cbd5e1"} />
            <AppText style={[styles.typeTabText, { color: meterType === "electricity" ? "#ffffff" : "#cbd5e1" }]}>
              ⚡ Điện (kWh)
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setMeterType("water")}
            style={[
              styles.typeTab,
              meterType === "water" && { backgroundColor: "#3B82F6" },
            ]}
          >
            <Ionicons name="water" size={14} color={meterType === "water" ? "#ffffff" : "#cbd5e1"} />
            <AppText style={[styles.typeTabText, { color: meterType === "water" ? "#ffffff" : "#cbd5e1" }]}>
              💧 Nước (m³)
            </AppText>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setFlashOn((f) => !f)}
          style={[styles.iconBtn, flashOn && { backgroundColor: "rgba(234, 179, 8, 0.4)" }]}
        >
          <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color={flashOn ? "#F59E0B" : "#ffffff"} />
        </Pressable>
      </View>

      {/* 3. Center Viewfinder Frame & Laser */}
      <View style={styles.viewfinderContainer}>
        <AppText style={styles.instructionText}>
          {meterType === "electricity"
            ? "Hướng camera vào dãy số ĐEN đồng hồ Điện (kWh)"
            : "Hướng camera vào dãy số ĐEN đồng hồ Nước (m³)"}
        </AppText>

        <View style={[styles.boundingBox, { width: frameWidth, height: frameHeight }]}>
          <View style={[styles.corner, styles.topLeft, { borderColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]} />

          <Animated.View
            style={[
              styles.laserLine,
              {
                width: frameWidth - 16,
                transform: [{ translateY }],
                backgroundColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6",
                shadowColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6",
              },
            ]}
          />
        </View>
      </View>

      {/* 4. Scanning AI Status Overlay */}
      {scanning ? (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <AppText style={styles.processingText}>{statusMessage || "Đang phân tích ảnh..."}</AppText>
          </View>
        </View>
      ) : null}

      {/* 5. Footer Shutter & Gallery Controls */}
      <View style={styles.footerControls}>
        <Pressable accessibilityRole="button" onPress={handlePickFromGallery} style={styles.galleryBtn}>
          <Ionicons name="images-outline" size={24} color="#ffffff" />
          <AppText style={styles.galleryBtnText}>Thư viện</AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleCaptureCamera}
          disabled={scanning}
          style={styles.shutterBtn}
        >
          <View style={[styles.shutterInner, { backgroundColor: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]}>
            <Ionicons name="camera" size={30} color="#ffffff" />
          </View>
        </Pressable>

        <View style={{ width: 64 }} />
      </View>

      {/* 6. Modal Confirmation & Stepper Adjust */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />

          <View style={[styles.sheetContent, { backgroundColor: theme.surfaceElevated }]}>
            <View style={styles.sheetHeader}>
              <View style={{ gap: 2 }}>
                <AppText style={[styles.sheetTitle, { color: theme.text }]}>
                  {meterType === "electricity" ? "⚡ Xác nhận chỉ số Điện" : "💧 Xác nhận chỉ số Nước"}
                </AppText>
                <AppText style={[styles.sheetSubtitle, { color: theme.muted }]}>
                  Chỉ số nguyên tiêu thụ ({meterType === "electricity" ? "kWh" : "m³"})
                </AppText>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <AnimatedEntry>
                <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <AppText style={[styles.resultLabel, { color: theme.muted }]}>
                    DÃY SỐ MÀU ĐEN (PHẦN NGUYÊN):
                  </AppText>

                  {/* Stepper + Big Input Row */}
                  <View style={styles.stepperInputRow}>
                    <Pressable
                      style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                      onPress={() => handleAdjustDigits(-1)}
                    >
                      <Ionicons name="remove" size={24} color={theme.text} />
                    </Pressable>

                    <AppTextInput
                      style={[styles.digitsInput, { color: meterType === "electricity" ? "#F59E0B" : "#3B82F6" }]}
                      value={scannedDigits}
                      onChangeText={setScannedDigits}
                      keyboardType="numeric"
                      maxLength={8}
                    />

                    <Pressable
                      style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                      onPress={() => handleAdjustDigits(1)}
                    >
                      <Ionicons name="add" size={24} color={theme.text} />
                    </Pressable>
                  </View>

                  {/* Badges: AI Filter & Red Digits info */}
                  <View style={styles.badgesRow}>
                    <View style={styles.greenBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <AppText style={styles.greenBadgeText}>
                        {scannedNote || "✓ Đã tự động lọc bỏ số phụ màu đỏ"}
                      </AppText>
                    </View>

                    {redDigits ? (
                      <View style={styles.redBadge}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <AppText style={styles.redBadgeText}>
                          Số đỏ bỏ qua: <AppText style={{ fontWeight: "900" }}>{redDigits}</AppText>
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </AnimatedEntry>

              {/* Room Chip Selection */}
              <View style={styles.roomSelectSection}>
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>{t("contracts.selectRoom")}</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChipsRow}>
                  {rooms.map((rm) => {
                    const selected = rm._id === selectedRoomId;
                    return (
                      <Pressable
                        key={rm._id}
                        accessibilityRole="button"
                        onPress={() => setSelectedRoomId(rm._id)}
                        style={[
                          styles.roomChip,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                      >
                        <AppText style={[styles.roomChipText, { color: selected ? "#ffffff" : theme.text }]}>
                          Phòng {rm.roomCode}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Image Preview */}
              {capturedImage ? (
                <View style={styles.previewContainer}>
                  <AppText style={[styles.fieldLabel, { color: theme.muted }]}>Ảnh chụp đối chiếu:</AppText>
                  <Image source={{ uri: capturedImage }} style={styles.previewImg} />
                </View>
              ) : null}

              {/* Save Button */}
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleSaveMeterReading}
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                    <AppText style={styles.saveBtnText}>Lưu chỉ số nháp</AppText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  permissionContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  permissionTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  permissionDesc: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  permissionBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  permissionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 54,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  typeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: "800",
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  boundingBox: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  laserLine: {
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  processingCard: {
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  processingText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  footerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingBottom: 44,
    zIndex: 10,
  },
  galleryBtn: {
    alignItems: "center",
    gap: 4,
    width: 64,
  },
  galleryBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  shutterInner: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "900" },
  sheetSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  sheetBody: { gap: 16 },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  resultLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  stepperInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  digitsInput: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    flex: 1,
  },
  badgesRow: {
    flexDirection: "column",
    gap: 6,
    marginTop: 4,
  },
  greenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  greenBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "800",
  },
  redBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  redBadgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
  },
  roomSelectSection: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "800" },
  roomChipsRow: { gap: 8, paddingVertical: 4 },
  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  roomChipText: { fontSize: 13, fontWeight: "800" },
  previewContainer: { gap: 6 },
  previewImg: { width: "100%", height: 130, borderRadius: 14 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
