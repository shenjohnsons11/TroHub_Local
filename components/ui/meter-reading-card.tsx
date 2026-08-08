import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/ThemeContext";
import { formatCurrency, formatMeterReading, parseMeterReading } from "@/utils/formatters";
import { getMeterPreview } from "@/utils/meter-reading";
import { AppText, AppTextInput } from "./typography";

type MeterReadingCardProps = {
  icon: "flash-outline" | "water-outline";
  label: string;
  unit: "kWh" | "m³";
  previous: number;
  current: number;
  unitPrice: number;
  editable?: boolean;
  currentInput?: string;
  onChangeCurrent?: (value: string) => void;
};

export function MeterReadingCard({
  icon,
  label,
  unit,
  previous,
  current,
  unitPrice,
  editable = false,
  currentInput,
  onChangeCurrent,
}: MeterReadingCardProps) {
  const { theme } = useAppTheme();
  const parsedCurrent = editable ? parseMeterReading(currentInput) : current;
  const preview = parsedCurrent === null ? null : getMeterPreview(previous, parsedCurrent, unitPrice);
  const displayCurrent = editable ? currentInput ?? "" : formatMeterReading(current);

  const handleChange = (value: string) => {
    if (!onChangeCurrent) return;
    const parsed = parseMeterReading(value);
    onChangeCurrent(parsed === null ? value : formatMeterReading(parsed));
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name={icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.headingCopy}>
          <AppText style={[styles.label, { color: theme.text }]}>{label}</AppText>
          <AppText style={[styles.unit, { color: theme.muted }]}>{unit}</AppText>
        </View>
      </View>

      <View style={styles.readings}>
        <Reading label="Chỉ số kỳ trước" value={`${formatMeterReading(previous)} ${unit}`} color={theme.muted} />
        <View style={styles.reading}>
          <AppText style={[styles.caption, { color: theme.muted }]}>Chỉ số kỳ này</AppText>
          {editable ? (
            <AppTextInput
              accessibilityLabel={`${label} chỉ số kỳ này`}
              keyboardType="decimal-pad"
              onChangeText={handleChange}
              placeholder="0"
              placeholderTextColor={theme.muted}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              value={displayCurrent}
            />
          ) : (
            <AppText style={[styles.value, { color: theme.text }]}>{displayCurrent} {unit}</AppText>
          )}
        </View>
      </View>

      <View style={[styles.summary, { backgroundColor: theme.primarySoft }]}>
        <Reading label="Tiêu thụ kỳ này" value={preview ? `${formatMeterReading(preview.usage)} ${unit}` : "Kiểm tra chỉ số"} color={theme.text} />
        <Reading label="Đơn giá" value={formatCurrency(unitPrice)} color={theme.text} />
        <Reading label="Thành tiền" value={preview ? formatCurrency(preview.amount) : "—"} color={theme.primary} strong />
      </View>
      {parsedCurrent !== null && parsedCurrent < previous ? <AppText style={[styles.error, { color: theme.danger }]}>Chỉ số kỳ này không được nhỏ hơn kỳ trước.</AppText> : null}
    </View>
  );
}

function Reading({ label, value, color, strong = false }: { label: string; value: string; color: string; strong?: boolean }) {
  return <View style={styles.reading}><AppText style={[styles.caption, { color }]}>{label}</AppText><AppText style={[styles.value, strong && styles.strong, { color }]}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 14 },
  heading: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  headingCopy: { flex: 1 },
  label: { fontSize: 15, fontWeight: "800" },
  unit: { fontSize: 12, marginTop: 1 },
  readings: { flexDirection: "row", gap: 12 },
  reading: { flex: 1, gap: 4 },
  caption: { fontSize: 11, lineHeight: 16 },
  value: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  strong: { fontWeight: "900" },
  input: { borderRadius: 10, borderWidth: 1, fontSize: 14, fontWeight: "700", minHeight: 42, paddingHorizontal: 10, paddingVertical: 8 },
  summary: { borderRadius: 12, flexDirection: "row", gap: 10, padding: 10 },
  error: { fontSize: 12, fontWeight: "700", lineHeight: 18 },
});
