import React, { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ocrService } from "../services/ocrService";
import type { MeterType } from "../utils/meterReadingTarget";

type Props = {
  visible: boolean;
  roomCode: string;
  initialMeterType: MeterType;
  onClose: () => void;
  onRead: (meterType: MeterType, digits: string) => void;
};

export default function MeterCameraModal({ visible, roomCode, initialMeterType, onClose, onRead }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [meterType, setMeterType] = useState<MeterType>(initialMeterType);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (visible) { setMeterType(initialMeterType); setError(""); } }, [visible, initialMeterType]);

  const capture = async () => {
    if (!cameraRef.current || reading) return;
    try {
      setReading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const result = await ocrService.recognizeMeterReading(photo?.uri, meterType);
      onRead(meterType, result.digits);
      onClose();
    } catch {
      setError("Không đọc được chỉ số. Hãy chụp rõ hơn hoặc nhập tay.");
    } finally {
      setReading(false);
    }
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!reading) onClose(); }}>
    <View style={styles.container}>
      {permission?.granted ? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" /> : <View style={styles.permission}><Text style={styles.message}>Cần quyền camera để đọc chỉ số đồng hồ.</Text><Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}><Text style={styles.permissionText}>Cho phép dùng camera</Text></Pressable></View>}
      <View style={styles.header}><View><Text style={styles.title}>Quét đồng hồ · Phòng {roomCode}</Text><Text style={styles.subtitle}>Chỉ số sẽ được điền vào đúng phòng này.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng camera quét đồng hồ" disabled={reading} onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color="#ffffff" /></Pressable></View>
      {permission?.granted ? <View style={styles.controls}>{error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}<View style={styles.modeRow}>{(["electricity", "water"] as MeterType[]).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: meterType === type }} disabled={reading} onPress={() => setMeterType(type)} style={[styles.mode, meterType === type && styles.modeActive]}><Text style={[styles.modeText, meterType === type && styles.modeTextActive]}>{type === "electricity" ? "⚡ Điện" : "💧 Nước"}</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel={`Chụp chỉ số ${meterType === "electricity" ? "điện" : "nước"} phòng ${roomCode}`} disabled={reading} onPress={() => void capture()} style={styles.capture}>{reading ? <ActivityIndicator color="#073e36" /> : <><Ionicons name="camera" size={20} color="#073e36" /><Text style={styles.captureText}>Chụp & đọc số</Text></>}</Pressable></View> : null}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07110e" }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 64 }, title: { color: "#ffffff", fontSize: 18, fontWeight: "900" }, subtitle: { color: "#d1e8dc", fontSize: 12, marginTop: 4 }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" }, permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 }, permissionButton: { minHeight: 44, marginTop: 20, justifyContent: "center", borderRadius: 12, backgroundColor: "#b8f5da", paddingHorizontal: 18 }, permissionText: { color: "#073e36", fontWeight: "900" }, controls: { position: "absolute", left: 20, right: 20, bottom: 34, gap: 12 }, error: { alignSelf: "center", maxWidth: "90%", color: "#fee2e2", textAlign: "center", fontSize: 12, fontWeight: "700" }, modeRow: { flexDirection: "row", alignSelf: "center", gap: 8, padding: 5, borderRadius: 16, backgroundColor: "rgba(0,0,0,.52)" }, mode: { minHeight: 44, borderRadius: 11, paddingHorizontal: 16, justifyContent: "center" }, modeActive: { backgroundColor: "#b8f5da" }, modeText: { color: "#ffffff", fontSize: 13, fontWeight: "800" }, modeTextActive: { color: "#073e36" }, capture: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#b8f5da" }, captureText: { color: "#073e36", fontSize: 15, fontWeight: "900" },
});
