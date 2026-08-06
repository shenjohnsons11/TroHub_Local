import { CameraView, useCameraPermissions } from "expo-camera";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseCCCDQr, type CCCDQrData } from "../utils/cccdQr";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (result: CCCDQrData) => void;
};

export default function CCCDScannerModal({ visible, onClose, onScan }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const result = parseCCCDQr(data);
    if (result) {
      onScan(result);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={styles.message}>Cần quyền camera để quét mã QR trên CCCD.</Text>
            <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionText}>Cho phép dùng camera</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.title}>Quét mã QR CCCD</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng camera quét CCCD" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>
        {permission?.granted ? <Text style={styles.hint}>Đặt mã QR trên CCCD vào trong khung.</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1511" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 64 },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  close: { alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)" },
  hint: { position: "absolute", bottom: 72, left: 24, right: 24, color: "#ffffff", textAlign: "center", fontSize: 15, fontWeight: "700" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { color: "#ffffff", textAlign: "center", fontSize: 16, lineHeight: 24 },
  permissionButton: { minHeight: 44, marginTop: 20, justifyContent: "center", borderRadius: 12, backgroundColor: "#10b981", paddingHorizontal: 18 },
  permissionText: { color: "#ffffff", fontWeight: "800" },
});
