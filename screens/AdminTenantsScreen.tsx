import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Linking } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { adminService, AdminTenant, AdminRoom } from "../services/adminService";
import { useAppTheme } from "../contexts/ThemeContext";
import { useNotification } from "../hooks/useNotification";
import AppLoadingScreen from "../components/AppLoadingScreen";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import GradientHero from "../components/ui/GradientHero";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import AddTenantModal from "../components/AddTenantModal";
import { formatCCCD, formatPhone, unformatDigits } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

export default function AdminTenantsScreen() {
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const notification = useNotification();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const handleSendInvite = async (tenant: AdminTenant) => {
    const rawPhone = unformatDigits(tenant.phone);
    const useZalo = await notification.confirm({
      title: t("mobile.tenants.inviteTitle"),
      message: t("mobile.tenants.inviteMessage", { name: tenant.fullName, phone: rawPhone }),
      confirmText: "Zalo",
      cancelText: "SMS",
    });
    if (useZalo) {
      const url = `https://zalo.me/${rawPhone}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else notification.info(t("mobile.tenants.openZalo", { phone: rawPhone }));
      return;
    }
    const msg = encodeURIComponent(t("mobile.tenants.smsMessage", { name: tenant.fullName }));
    await Linking.openURL(`sms:${rawPhone}?body=${msg}`).catch(() => {
      notification.info(t("mobile.tenants.openSms", { phone: rawPhone }));
    });
  };

  const loadData = async () => {
    try {
      const [tenantsData, roomsData] = await Promise.all([adminService.getTenants(), adminService.getRooms()]);
      setTenants(tenantsData); setRooms(roomsData);
    } catch (error) { console.log("Lỗi tải dữ liệu người thuê:", error); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  const openCreateModal = () => setModalVisible(true);
  if (loading) return <AppLoadingScreen />;
  const vacantRooms = rooms.filter((room) => room.status === 0);

  const filteredTenants = tenants.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.fullName && t.fullName.toLowerCase().includes(q)) ||
      (t.phone && String(t.phone).includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GradientHero
              icon="people-outline"
              label={t("mobile.tenants.heroLabel")}
              value={t("mobile.tenants.heroValue", { count: tenants.length })}
              detail={t("mobile.tenants.heroDetail", { count: vacantRooms.length })}
            />

            <View style={styles.headingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={[styles.title, { color: theme.text }]}>{t("mobile.tenants.title")}</AppText>
                <AppText style={[styles.subtitle, { color: theme.muted }]}>{t("mobile.tenants.subtitle")}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("mobile.tenants.add")}
                onPress={openCreateModal}
                style={[styles.addButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="person-add-outline" size={18} color={theme.background} />
                <AppText style={[styles.addButtonText, { color: theme.background }]}>{t("mobile.tenants.add") || "Thêm khách"}</AppText>
              </Pressable>
            </View>

            {/* Ô Tìm Kiếm Người Thuê */}
            <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.muted} />
              <AppTextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={t("mobile.tenants.search")}
                placeholderTextColor={theme.muted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <Pressable accessibilityRole="button" onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={18} color={theme.muted} />
                </Pressable>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            kind="contract"
            title={t("mobile.tenants.emptyTitle")}
            description={t("mobile.tenants.emptyDescription")}
            actionLabel={t("mobile.tenants.add")}
            actionIcon="person-add-outline"
            onAction={openCreateModal}
          />
        }
        renderItem={({ item, index }) => {
          const isLinked = item.mustChangePassword === false;
          const formattedPhone = formatPhone(item.phone) || "-";

          return (
            <AnimatedEntry delay={Math.min(index, 6) * 45}>
              <View style={[styles.card, { backgroundColor: theme.surfaceElevated, shadowColor: theme.text }]}>
                <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                  <AppText style={[styles.avatarText, { color: theme.primary }]}>
                    {item.fullName ? item.fullName.slice(0, 2).toUpperCase() : "KT"}
                  </AppText>
                </View>

                <View style={styles.info}>
                  <AppText style={[styles.name, { color: theme.text }]}>{item.fullName}</AppText>
                  <AppText style={[styles.sub, { color: theme.muted }]}>
                    <Ionicons name="call-outline" size={12} /> {formattedPhone}
                  </AppText>
                  {item.email ? (
                    <AppText style={[styles.sub, { color: theme.muted }]}>
                      <Ionicons name="mail-outline" size={12} /> {item.email}
                    </AppText>
                  ) : null}
                  {item.idCard ? (
                    <AppText style={[styles.sub, { color: theme.muted }]}>
                      <Ionicons name="card-outline" size={12} /> {t("mobile.tenants.idCard")}: {formatCCCD(item.idCard)}
                    </AppText>
                  ) : null}

                  {/* App Link Status Badge */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: isLinked ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name={isLinked ? "checkmark-circle" : "alert-circle"}
                        size={12}
                        color={isLinked ? "#10b981" : "#f59e0b"}
                      />
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: isLinked ? "#10b981" : "#f59e0b",
                        }}
                      >
                        {isLinked ? t("mobile.tenants.linked") : t("mobile.tenants.notLinked")}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Nút Gửi lời mời cho khách chưa liên kết */}
                {!isLinked && (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.inviteBtn}
                    onPress={() => handleSendInvite(item)}
                  >
                    <Ionicons name="paper-plane-outline" size={14} color="#ffffff" />
                    <AppText style={styles.inviteBtnText}>{t("mobile.tenants.invite")}</AppText>
                  </Pressable>
                )}
              </View>
            </AnimatedEntry>
          );
        }}
      />

      <AddTenantModal visible={modalVisible} rooms={rooms} onClose={() => setModalVisible(false)} onSuccess={() => { void loadData(); }} />
    </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1 }, list: { padding: 18, paddingBottom: 130, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14, elevation: 3, shadowOpacity: .09, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: "900" }, info: { flex: 1 }, name: { fontSize: 16, fontWeight: "900" }, sub: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  overlay: { flex: 1, justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, modalTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  form: { paddingTop: 4, paddingBottom: 8 }, formHint: { fontSize: 12, lineHeight: 18, marginBottom: 16 }, field: { marginBottom: 14 }, label: { fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 14 }, error: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 }, fieldInput: { flex: 1 }, scanButton: { minHeight: 44, justifyContent: "center", borderRadius: 12, paddingHorizontal: 10 }, scanButtonText: { fontSize: 11, fontWeight: "800" },
  lookupBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, padding: 12, marginBottom: 16 }, lookupText: { flex: 1, fontSize: 12, lineHeight: 17 }, resetLookup: { fontSize: 12, fontWeight: "800" },
  roomChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }, roomChip: { minHeight: 44, minWidth: 68, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, roomChipText: { fontSize: 13, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 }, action: { flex: 1 },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 22,
    marginBottom: 12,
  },
  title: { fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 3 },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: { fontSize: 14, fontWeight: "800" },
  searchBox: { flexDirection: "row", alignItems: "center", minHeight: 44, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "600", height: "100%" },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#10b981", marginLeft: 10 },
  inviteBtnText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
});
