import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "./Card";
import { AppText } from "./ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Contract } from "../types/Contract";
import { Invoice } from "../types/Invoice";
import { RepairRequest } from "../types/RepairRequest";
import { buildTenantTimeline, daysFromToday } from "../utils/tenantTimeline";

type Props = {
  myInvoices: Invoice[];
  activeContract: Contract | null;
  activeRepairs: RepairRequest[];
  onNavigate: (screen: "invoice" | "contract") => void;
};

export default function TenantPersonalTimeline({ myInvoices, activeContract, activeRepairs, onNavigate }: Props) {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const { invoice, contract, repair } = buildTenantTimeline({
    invoices: myInvoices,
    contract: activeContract,
    repairs: activeRepairs,
  });

  const deadline = (date: string) => {
    const days = daysFromToday(date);
    if (days === null) return date;
    if (days < 0) return t("tenantTimeline.overdue", { days: Math.abs(days) });
    if (days === 0) return t("tenantTimeline.today");
    return t("tenantTimeline.daysLeft", { days });
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="calendar-outline" size={19} color={theme.primary} />
        </View>
        <AppText style={[styles.title, { color: theme.text }]}>{t("tenantTimeline.title")}</AppText>
      </View>

      {!invoice && !contract && !repair ? <AppText style={[styles.empty, { color: theme.muted }]}>{t("tenantTimeline.allDone")}</AppText> : null}

      {invoice ? (
        <TimelineRow
          icon="card-outline"
          iconColor="#C2410C"
          iconBackground="#FFF1E8"
          title={t("tenantTimeline.dueInvoice", { period: invoice.month })}
          detail={`${invoice.dueDate} · ${deadline(invoice.dueDate)}`}
          onPress={() => onNavigate("invoice")}
          text={theme.text}
          muted={theme.muted}
        />
      ) : null}
      {contract ? (
        <TimelineRow
          icon="flag-outline"
          iconColor="#0F766E"
          iconBackground="#E6FAF5"
          title={t("tenantTimeline.contractEnd", { room: contract.room })}
          detail={`${contract.endDate} · ${deadline(contract.endDate)}`}
          onPress={() => onNavigate("contract")}
          text={theme.text}
          muted={theme.muted}
        />
      ) : null}
      {repair?.appointmentDate ? (
        <TimelineRow
          icon="construct-outline"
          iconColor="#2563EB"
          iconBackground="#EFF6FF"
          title={t("tenantTimeline.repairSchedule", { title: repair.type || repair.description || "" })}
          detail={repair.appointmentDate}
          text={theme.text}
          muted={theme.muted}
        />
      ) : null}
    </Card>
  );
}

function TimelineRow({ icon, iconColor, iconBackground, title, detail, onPress, text, muted }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBackground: string;
  title: string;
  detail: string;
  onPress?: () => void;
  text: string;
  muted: string;
}) {
  const content = <View style={styles.row}><View style={[styles.icon, { backgroundColor: iconBackground }]}><Ionicons name={icon} size={18} color={iconColor} /></View><View style={styles.copy}><AppText style={[styles.rowTitle, { color: text }]}>{title}</AppText><AppText style={[styles.rowDetail, { color: muted }]}>{detail}</AppText></View>{onPress ? <Ionicons name="chevron-forward" size={18} color={muted} /> : null}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  card: { marginBottom: 18, borderWidth: 1, borderRadius: 20, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
  headerIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "900" },
  empty: { fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D7E5DC" },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  rowDetail: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
