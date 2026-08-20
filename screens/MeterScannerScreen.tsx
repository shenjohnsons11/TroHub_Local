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
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  onBack?: () => void;
  onSuccess?: () => void;
};

export default function MeterScannerScreen({ onBack, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();

  const [flashOn, setFlashOn] = useState(false);
  const [meterType, setMeterType] = useState<"electricity" | "water">("electricity");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [scannedDigits, setScannedDigits] = useState("");
  const [saving, setSaving] = useState(false);

  const laserAnim = useRef(new Animated.Value(0)).current;

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
    outputRange: [0, 180],
  });

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notification.error(t("common.error"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
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

  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        notification.error(t("common.error"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
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

  const processOCR = async (base64Data: string) => {
    setScanning(true);
    try {
      const res = await ocrService.recognizeMeterReading(base64Data, meterType);
      if (res && res.digits) {
        setScannedDigits(res.digits);
        setModalVisible(true);
      } else {
        notification.error(t("invoices.ocrError"));
      }
    } catch (err: any) {
      notification.error(err?.message || t("invoices.ocrError"));
    } finally {
      setScanning(false);
    }
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
      <View style={styles.cameraView}>
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
                {t("nav.utilities")}
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
                {t("nav.utilities")}
              </AppText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setFlashOn((f) => !f)}
            style={[styles.iconBtn, flashOn && { backgroundColor: "rgba(234, 179, 8, 0.3)" }]}
          >
            <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color={flashOn ? "#eab308" : "#ffffff"} />
          </Pressable>
        </View>

        <View style={styles.viewfinderContainer}>
          <AppText style={styles.instructionText}>
            {t("utilities.scanCamera")}
          </AppText>

          <View style={styles.boundingBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

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

        <View style={styles.footerControls}>
          <Pressable accessibilityRole="button" onPress={handlePickFromGallery} style={styles.galleryBtn}>
            <Ionicons name="images-outline" size={24} color="#ffffff" />
            <AppText style={styles.galleryBtnText}>Gallery</AppText>
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
              <AppText style={[styles.sheetTitle, { color: theme.text }]}>{t("invoices.recordMeter")}</AppText>
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <AnimatedEntry>
                <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                  <AppText style={[styles.resultLabel, { color: theme.muted }]}>
                    {t("invoices.recordMeter")} (OCR):
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
                    ✓ OCR Engine
                  </AppText>
                </View>
              </AnimatedEntry>

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
                          {t("common.room")} {rm.roomCode}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {capturedImage && (
                <View style={styles.previewContainer}>
                  <AppText style={[styles.fieldLabel, { color: theme.muted }]}>{t("common.details")}:</AppText>
                  <Image source={{ uri: capturedImage }} style={styles.previewImg} />
                </View>
              )}

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
                    <AppText style={styles.saveBtnText}>{t("common.save")}</AppText>
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
  cameraView: { flex: 1, justifyContent: "space-between" },
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  viewfinderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    textAlign: "center",
  },
  boundingBox: {
    width: 280,
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#ffffff",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  laserLine: {
    width: "100%",
    height: 2,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  footerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  galleryBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  galleryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sheetBody: {
    gap: 16,
  },
  resultCard: {
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  digitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  digitsInput: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    minWidth: 140,
  },
  accuracyTag: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  roomSelectSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  roomChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  roomChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  previewContainer: {
    gap: 8,
  },
  previewImg: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
