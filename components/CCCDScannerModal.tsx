import { useEffect, useRef } from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (cccdNumber: string) => void;
};

const VIEWFINDER_SIZE = 260;

function isBarcodeInsideViewfinder(
  result: BarcodeScanningResult,
  frame: { left: number; top: number; size: number },
) {
  const { origin, size } = result.bounds;
  if (!origin || !size || size.width <= 0 || size.height <= 0) return false;
  const centerX = origin.x + size.width / 2;
  const centerY = origin.y + size.height / 2;
  const inset = 10;
  return (
    centerX >= frame.left + inset &&
    centerX <= frame.left + frame.size - inset &&
    centerY >= frame.top + inset &&
    centerY <= frame.top + frame.size - inset
  );
}

export default function CCCDScannerModal({ visible, onClose, onScan }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scanningRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  const { height, width } = useWindowDimensions();
  const frameLeft = Math.max(0, (width - VIEWFINDER_SIZE) / 2);
  const frameTop = Math.max(128, (height - VIEWFINDER_SIZE) / 2);
  const frameBottom = frameTop + VIEWFINDER_SIZE;

  useEffect(() => {
    if (!visible) {
      scanningRef.current = false;
      permissionRequestedRef.current = false;
      return;
    }

    if (!permission?.granted && permission?.canAskAgain && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
  }, [visible, permission?.canAskAgain, permission?.granted, requestPermission]);

  const frame = { left: frameLeft, top: frameTop, size: VIEWFINDER_SIZE };

  const handleBarcodeScanned = (event: BarcodeScanningResult) => {
    if (scanningRef.current) return;
    if (!isBarcodeInsideViewfinder(event, frame)) return;

    const rawText = event.data;
    const parts = rawText.split("|");
    const cccdNumber = (parts[0] || rawText).replace(/\D/g, "").slice(0, 12);
    if (cccdNumber.length !== 12) return;

    scanningRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScan(cccdNumber);
    onClose();
  };

  const cameraReady = Boolean(permission?.granted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {cameraReady ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            autofocus="on"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={styles.message}>
              {permission ? t("mobile.camera.idPermission") : t("mobile.camera.initializing")}
            </Text>
            {permission ? (
              <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionText}>{t("mobile.camera.allow")}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {cameraReady ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: frameTop }]} />
            <View style={[styles.scrim, { top: frameTop, left: 0, width: frameLeft, height: VIEWFINDER_SIZE }]} />
            <View style={[styles.scrim, { top: frameTop, left: frameLeft + VIEWFINDER_SIZE, right: 0, height: VIEWFINDER_SIZE }]} />
            <View style={[styles.scrim, { top: frameBottom, left: 0, right: 0, bottom: 0 }]} />

            <View style={[styles.viewfinder, { top: frameTop, left: frameLeft }]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <Text style={[styles.hint, { top: frameBottom + 20 }]}>
              {t("mobile.camera.idHint")}
            </Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.title}>{t("mobile.camera.idTitle")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.camera.idClose")} onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={20} color="#ffffff" />
            <Text style={styles.closeText}>{t("common.close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07110e" },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60 },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  close: { minWidth: 74, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10 },
  closeText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: { minHeight: 44, marginTop: 20, justifyContent: "center", borderRadius: 12, backgroundColor: "#b8f5da", paddingHorizontal: 18 },
  permissionText: { color: "#073e36", fontWeight: "900" },
  scrim: { position: "absolute", backgroundColor: "rgba(0, 7, 5, 0.62)" },
  viewfinder: { position: "absolute", width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE },
  corner: { position: "absolute", width: 36, height: 36, borderColor: "#b8f5da", shadowColor: "#b8f5da", shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 12 },
  hint: { position: "absolute", left: 24, right: 24, color: "#ffffff", textAlign: "center", fontSize: 15, fontWeight: "700", lineHeight: 22 },
});
