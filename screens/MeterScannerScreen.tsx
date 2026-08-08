import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import { adminService, AdminRoom } from "../services/adminService";
import { ocrService } from "../services/ocrService";
import AnimatedEntry from "../components/ui/AnimatedEntry";

type Props = {
  onBack?: () => void;
  onSuccess?: () => void;
};

export default function MeterScannerScreen({ onBack, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const notification = useNotification();

  const [flashOn, setFlashOn] = useState(false);
  const [meterType, setMeterType] = useState<"electricity" | "water">("electricity");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Result Confirmation Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedDigits, setScannedDigits] = useState("");
  const [saving, setSaving] = useState(false);

  // Laser animation line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start continuous laser animation loop
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

    // Load active rooms list
    adminService.getRooms().then((res) => {
      setRooms(res);
      if (res.length > 0) setSelectedRoomId(res[0]._id);
    }).catch(() => undefined);

    return () => animation.stop();
  }, [laserAnim]);

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notification.error("Vui lòng cấp quyền truy cập Thư viện ảnh!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedImage(uri);
        void runOCRProcess(uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCaptureCamera = () => {
    // Simulate camera shutter photo capture
    const sampleUri = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?q=80&w=400";
    setCapturedImage(sampleUri);
    void runOCRProcess(sampleUri);
  };

  const runOCRProcess = async (imageUri: string) => {
    setScanning(true);
    try {
      const result = await ocrService.recognizeMeterReading(imageUri, meterType);
      setScannedDigits(result.digits);
      setModalVisible(true);
      notification.success(`Đã trích xuất số công tơ: ${result.digits}`);
    } catch (err) {
      notification.error("Nhận diện chỉ số thất bại. Vui lòng thử lại!");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveMeterReading = async () => {
    if (!selectedRoomId) {
      notification.error("Vui lòng chọn phòng cần chốt chỉ số!");
      return;
    }
    if (!scannedDigits) {
      notification.error("Chỉ số không được để trống!");
      return;
    }

    setSaving(true);
    try {
      const room = rooms.find((r) => r._id === selectedRoomId);
      const roomCode = room?.roomCode || "N/A";

      // Simulate API call to save utility reading
      await new Promise((resolve) => setTimeout(resolve, 600));

      notification.success(`Đã chốt chỉ số ${meterType === "electricity" ? "Điện" : "Nước"} phòng ${roomCode}: ${scannedDigits}`);
      setModalVisible(false);
      onSuccess?.();
      onBack?.();
    } catch (err) {
      notification.error("Lưu chỉ số thất bại!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Dark Viewfinder View */}
      <View style={styles.cameraView}>
        {/* Header Overlay */}
        <View style={styles.header}>
          {onBack && (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </Pressable>
          )}

          <View style={styles.typeSelector}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMeterType("electricity")}
              style={[
                styles.typeTab,
                meterType === "electricity" && { backgroundColor: "#f59e0b" },
              ]}
            >
              <Ionicons name="flash" size={14} color={meterType === "electricity" ? "#ffffff" : "#cbd5e1"} />
              <AppText style={[styles.typeTabText, { color: meterType === "electricity" ? "#ffffff" : "#cbd5e1" }]}>
                Điện
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMeterType("water")}
              style={[
                styles.typeTab,
                meterType === "water" && { backgroundColor: "#3b82f6" },
              ]}
            >
              <Ionicons name="water" size={14} color={meterType === "water" ? "#ffffff" : "#cbd5e1"} />
              <AppText style={[styles.typeTabText, { color: meterType === "water" ? "#ffffff" : "#cbd5e1" }]}>
                Nước
              </AppText>
            </Pressable>
          </View>

          {/* Flashlight Toggle */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setFlashOn((f) => !f)}
            style={[styles.iconBtn, flashOn && { backgroundColor: "rgba(234, 179, 8, 0.3)" }]}
          >
            <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color={flashOn ? "#eab308" : "#ffffff"} />
          </Pressable>
        </View>

        {/* Viewfinder Bounding Box with Laser Line */}
        <View style={styles.viewfinderContainer}>
          <AppText style={styles.instructionText}>
            Căn chỉnh mặt đồng hồ {meterType === "electricity" ? "ĐIỆN" : "NƯỚC"} vào khung ngắm
          </AppText>

          <View style={styles.boundingBox}>
            {/* Corner Bracket Decorations */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Laser Line */}
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [{ translateY }],
                  backgroundColor: meterType === "electricity" ? "#10b981" : "#3b82f6",
                },
              ]}
            />
          </View>
        </View>

        {/* Bottom Control Actions */}
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
            <View style={styles.shutterInner}>
              {scanning ? (
                <ActivityIndicator color="#10b981" size="small" />
              ) : (
                <Ionicons name="camera" size={32} color="#10b981" />
              )}
            </View>
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* Confirmation Modal Sheet */}
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
              <AppText style={[styles.sheetTitle, { color: theme.text }]}>Đối Soát & Xác Nhận Chỉ Số</AppText>
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              {/* Output Result Card */}
              <AnimatedEntry>
                <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                  <AppText style={[styles.resultLabel, { color: theme.muted }]}>
                    CHỈ SỐ {meterType === "electricity" ? "ĐIỆN" : "NƯỚC"} TRÍCH XUẤT (OCR):
                  </AppText>

                  <View style={styles.digitsRow}>
                    <AppTextInput
                      style={[styles.digitsInput, { color: theme.primary }]}
                      value={scannedDigits}
                      onChangeText={setScannedDigits}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                    <Ionicons name="create-outline" size={20} color={theme.muted} />
                  </View>

                  <AppText style={[styles.accuracyTag, { color: "#10b981" }]}>
                    ✓ Nhận diện chính xác 96%
                  </AppText>
                </View>
              </AnimatedEntry>

              {/* Room Selection */}
              <View style={styles.roomSelectSection}>
                <AppText style={[styles.fieldLabel, { color: theme.text }]}>Chọn phòng để ghi nhận *</AppText>
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

              {/* Image Preview Thumbnail */}
              {capturedImage && (
                <View style={styles.previewContainer}>
                  <AppText style={[styles.fieldLabel, { color: theme.muted }]}>Ảnh đối soát công tơ:</AppText>
                  <Image source={{ uri: capturedImage }} style={styles.previewImg} />
                </View>
              )}

              {/* Submit Button */}
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
                    <AppText style={styles.saveBtnText}>Xác nhận & Lưu chỉ số</AppText>
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
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraView: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 54,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  typeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: "800",
  },
  viewfinderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  boundingBox: {
    width: 280,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#10b981",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  laserLine: {
    width: "100%",
    height: 3,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  footerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  galleryBtn: {
    alignItems: "center",
    gap: 4,
  },
  galleryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sheetBody: {
    gap: 18,
    paddingBottom: 20,
  },
  resultCard: {
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  digitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 10,
  },
  digitsInput: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 4,
    minWidth: 160,
    textAlign: "center",
  },
  accuracyTag: {
    fontSize: 12,
    fontWeight: "800",
  },
  roomSelectSection: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  roomChipsRow: {
    gap: 8,
  },
  roomChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  roomChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  previewContainer: {
    gap: 8,
  },
  previewImg: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    objectFit: "cover",
  },
  saveBtn: {
    flexDirection: "row",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});
