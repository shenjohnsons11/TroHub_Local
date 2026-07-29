import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import AppButton from "../ui/AppButton";
import { useAppTheme } from "../../contexts/ThemeContext";

type CheckoutModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { electricityNew: string; waterNew: string; deduction: string; note: string }) => void;
  loading?: boolean;
};

export default function CheckoutModal({ visible, onClose, onConfirm, loading }: CheckoutModalProps) {
  const { theme } = useAppTheme();
  const [electricityNew, setElectricityNew] = useState("");
  const [waterNew, setWaterNew] = useState("");
  const [deduction, setDeduction] = useState("0");
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    onConfirm({ electricityNew, waterNew, deduction, note });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <View style={styles.backdrop} />
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <ScrollView>
            <Text style={[styles.title, { color: theme.text }]}>Quyết toán Trả phòng</Text>
            
            <Text style={[styles.label, { color: theme.text }]}>Chỉ số điện cuối cùng</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              keyboardType="number-pad"
              value={electricityNew}
              onChangeText={setElectricityNew}
              placeholder="VD: 1542"
              placeholderTextColor={theme.muted}
            />

            <Text style={[styles.label, { color: theme.text }]}>Chỉ số nước cuối cùng</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              keyboardType="number-pad"
              value={waterNew}
              onChangeText={setWaterNew}
              placeholder="VD: 341"
              placeholderTextColor={theme.muted}
            />

            <Text style={[styles.label, { color: theme.text }]}>Khấu trừ tiền cọc (nếu có)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              keyboardType="number-pad"
              value={deduction}
              onChangeText={setDeduction}
              placeholder="0"
              placeholderTextColor={theme.muted}
            />

            <Text style={[styles.label, { color: theme.text }]}>Ghi chú trả phòng</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, height: 80 }]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="Tình trạng phòng, hư hỏng..."
              placeholderTextColor={theme.muted}
            />

            <View style={styles.actions}>
              <AppButton variant="secondary" onPress={onClose} style={styles.btn}>Hủy</AppButton>
              <AppButton loading={loading} onPress={handleConfirm} style={styles.btn}>Duyệt trả phòng</AppButton>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 400 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  actions: { flexDirection: "row", gap: 12, marginTop: 30, marginBottom: 20 },
  btn: { flex: 1 },
});
