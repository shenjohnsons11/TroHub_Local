import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { getFormattedDateWidget } from "../utils/dateHelpers";
import { useLanguage } from "../contexts/LanguageContext";

const DAYS_OF_WEEK = { vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], en: ["M", "T", "W", "T", "F", "S", "S"] };

export default function MiniCalendarPopover() {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Monday-start calculations
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const locale = language === "en" ? "en-US" : "vi-VN";
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewDate);

  // Hardcoded operational event days for demonstration/reminder
  const eventDays: { [day: number]: "invoice" | "contract" | "both" } = {
    5: "invoice",
    15: "invoice",
    30: "contract",
  };

  return (
    <View>
      {/* Trigger Pill */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setModalVisible(true)}
        style={[
          styles.pill,
          {
            backgroundColor: theme.primarySoft,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={13} color={theme.primary} />
        <AppText style={[styles.pillText, { color: theme.primary }]}>
          {getFormattedDateWidget(locale)}
        </AppText>
      </Pressable>

      {/* Modal Dropdown */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[
              styles.popoverContainer,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <AppText style={[styles.monthLabel, { color: theme.text }]}>
                {monthLabel}
              </AppText>
              <View style={styles.navRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={prevMonth}
                  style={[styles.navBtn, { backgroundColor: theme.surface }]}
                >
                  <Ionicons name="chevron-back" size={16} color={theme.text} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={nextMonth}
                  style={[styles.navBtn, { backgroundColor: theme.surface }]}
                >
                  <Ionicons name="chevron-forward" size={16} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekRow}>
              {DAYS_OF_WEEK[language].map((d, idx) => (
                <AppText
                  key={d}
                  style={[
                    styles.weekCell,
                    { color: idx >= 5 ? theme.primary : theme.muted },
                  ]}
                >
                  {d}
                </AppText>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.grid}>
              {/* Empty slots */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}

              {/* Days 1..N */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isToday =
                  dayNum === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();
                const eventType = eventDays[dayNum];

                return (
                  <View key={dayNum} style={styles.dayCell}>
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && { backgroundColor: theme.primary },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.dayText,
                          { color: isToday ? "#ffffff" : theme.text },
                        ]}
                      >
                        {dayNum}
                      </AppText>
                    </View>

                    {/* Dot Indicator */}
                    {eventType && (
                      <View style={styles.dotRow}>
                        {(eventType === "invoice" || eventType === "both") && (
                          <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                        )}
                        {(eventType === "contract" || eventType === "both") && (
                          <View style={[styles.dot, { backgroundColor: "#6366f1" }]} />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Footer Legend */}
            <View style={[styles.legendRow, { borderTopColor: theme.border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                <AppText style={[styles.legendText, { color: theme.muted }]}>{language === "en" ? "Today" : "Hôm nay"}</AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
                <AppText style={[styles.legendText, { color: theme.muted }]}>{language === "en" ? "Invoice due" : "Hạn hóa đơn"}</AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#6366f1" }]} />
                <AppText style={[styles.legendText, { color: theme.muted }]}>{language === "en" ? "Contract due" : "Hạn hợp đồng"}</AppText>
              </View>
            </View>

            {/* Close Button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setModalVisible(false)}
              style={[styles.closeBtn, { backgroundColor: theme.surface }]}
            >
              <AppText style={[styles.closeBtnText, { color: theme.text }]}>{language === "en" ? "Close calendar" : "Đóng lịch"}</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popoverContainer: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  navRow: {
    flexDirection: "row",
    gap: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  weekCell: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "800",
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    position: "absolute",
    bottom: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 14,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
