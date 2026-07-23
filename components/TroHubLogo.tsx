import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  compact?: boolean;
  inverted?: boolean;
  size?: "small" | "medium" | "large";
};

export default function TroHubLogo({ compact = false, inverted = false, size = "medium" }: Props) {
  const scale = size === "small" ? 0.78 : size === "large" ? 1.35 : 1;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="TRO HUB"
      style={styles.row}
    >
      <View style={[styles.mark, { transform: [{ skewX: "-9deg" }, { scale }] }]}> 
        <View style={[styles.block, styles.orange]}><Text style={styles.letter}>T</Text></View>
        <View style={[styles.block, styles.green]}><Text style={styles.letter}>H</Text></View>
      </View>
      {!compact && (
        <View style={styles.wordmark}>
          <Text style={[styles.name, inverted && styles.inverted]}>TRO HUB</Text>
          <Text style={[styles.tagline, inverted && styles.taglineInverted]}>QUẢN LÝ NHÀ TRỌ</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13 },
  mark: { width: 58, height: 40, flexDirection: "row", gap: 3 },
  block: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 3 },
  orange: { backgroundColor: "#EF6A22" },
  green: { backgroundColor: "#17834A" },
  letter: { color: "#F8F8F6", fontSize: 18, fontWeight: "900" },
  wordmark: { gap: 2 },
  name: { color: "#25292D", fontSize: 20, fontWeight: "900", letterSpacing: 0 },
  inverted: { color: "#F4F5F3" },
  tagline: { color: "#697178", fontSize: 8, fontWeight: "800", letterSpacing: 1.4 },
  taglineInverted: { color: "#B6BCC0" },
});
