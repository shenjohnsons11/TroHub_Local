import React, { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { parseCCCDQr, type CCCDQrData } from "../utils/cccdQr";
import { useTranslation } from "../contexts/LanguageContext";

type Props = { onBack: () => void; onScan?: (result: CCCDQrData) => void };

export default function CCCDScannerScreen({ onBack, onScan }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<CCCDQrData | null>(null);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const parsed = parseCCCDQr(data);
    if (!parsed) return;
    setResult(parsed);
    onScan?.(parsed);
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={result ? undefined : handleBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} /> : (
        <View style={styles.permission}><AppText style={styles.message}>Camera permission required for QR scan.</AppText><Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}><AppText style={styles.permissionText}>{t("common.confirm")}</AppText></Pressable></View>
      )}
      <View style={styles.header}><AppText style={styles.title}>QR Scan CCCD</AppText><Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onBack} style={styles.close}><Ionicons name="close" size={24} color="#ffffff" /></Pressable></View>
      {result ? <View style={styles.result}><AppText style={styles.resultTitle}>{t("common.success")}</AppText><AppText style={styles.resultText}>{result.fullName}</AppText><AppText style={styles.resultText}>{result.idCard}</AppText><Pressable accessibilityRole="button" onPress={() => setResult(null)} style={styles.retry}><AppText style={styles.retryText}>{t("invoices.ocrError")}</AppText></Pressable></View> : <AppText style={styles.hint}>Scan QR Code on CCCD</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1511" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 64 },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "rgba(0,0,0,.45)" },
  hint: { position: "absolute", bottom: 72, left: 24, right: 24, color: "#ffffff", textAlign: "center", fontSize: 15, fontWeight: "700" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: { minHeight: 44, marginTop: 20, justifyContent: "center", borderRadius: 12, backgroundColor: "#10b981", paddingHorizontal: 18 },
  permissionText: { color: "#ffffff", fontWeight: "800" },
  result: { position: "absolute", left: 20, right: 20, bottom: 32, padding: 18, borderRadius: 18, backgroundColor: "rgba(0,0,0,.7)" },
  resultTitle: { color: "#b8f5da", fontSize: 12, fontWeight: "900" },
  resultText: { color: "#ffffff", marginTop: 5, fontSize: 16, fontWeight: "800" },
  retry: { alignSelf: "flex-start", marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#b8f5da" },
  retryText: { color: "#073e36", fontWeight: "900" },
});
