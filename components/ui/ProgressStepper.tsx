import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Step = { label: string; icon: IconName; error?: boolean };

export default function ProgressStepper({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: number;
}) {
  const { theme } = useAppTheme();
  if (steps.length === 0) return null;

  const safeCurrentStep = Number.isFinite(currentStep) ? Math.trunc(currentStep) : 0;
  const progress = Math.max(0, Math.min(safeCurrentStep, steps.length - 1));
  const currentStatus = steps[progress].error ? "có lỗi" : "đang thực hiện";

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Tiến trình"
      accessibilityValue={{
        min: 1,
        max: steps.length,
        now: progress + 1,
        text: `${steps[progress].label}, ${currentStatus}`,
      }}
      style={styles.row}
    >
      {steps.map((step, index) => {
        const isComplete = index < progress;
        const isCurrent = index === progress;
        const isUpcoming = index > progress;
        const active = isComplete || isCurrent;
        const status = step.error
          ? "có lỗi"
          : isComplete
            ? "đã hoàn thành"
            : isCurrent
              ? "hiện tại"
              : "sắp tới";

        return (
          <View
            key={`${step.label}-${index}`}
            accessibilityLabel={`${step.label}, ${status}`}
            style={styles.step}
          >
            {index > 0 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: isComplete || isCurrent ? theme.primary : theme.border },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.node,
                {
                  backgroundColor: step.error
                    ? theme.warningSoft
                    : active
                      ? theme.primary
                      : theme.surfaceElevated,
                  borderColor: step.error
                    ? theme.danger
                    : active
                      ? theme.primary
                      : theme.border,
                },
              ]}
            >
              <Ionicons
                name={step.error ? "alert-circle" : isComplete ? "checkmark" : step.icon}
                size={18}
                color={step.error ? theme.danger : active ? theme.background : theme.muted}
              />
            </View>
            <Text
              numberOfLines={3}
              style={[
                styles.label,
                { color: step.error ? theme.danger : isUpcoming ? theme.muted : theme.text },
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, minWidth: 0, alignItems: "center" },
  node: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  line: { position: "absolute", top: 18, right: "50%", left: "-50%", height: 2 },
  label: { marginTop: 7, fontSize: 10, lineHeight: 13, fontWeight: "700", textAlign: "center" },
});
