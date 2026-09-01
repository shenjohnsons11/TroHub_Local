import React, { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Pressable, View, ActivityIndicator, Image } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import {
  Priority,
  RepairRequest,
  RepairStatus,
} from "../types/RepairRequest";
import { repairService } from "../services/repairService";
import { contractService } from "../services/contractService";
import { useNotification } from "../hooks/useNotification";
import { getNotificationMessage } from "../utils/notificationMessages";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import AppLoadingScreen from "../components/AppLoadingScreen";
import { useTranslation } from "../contexts/LanguageContext";
import TenantRoomSwitcher from "../components/TenantRoomSwitcher";
import { Contract } from "../types/Contract";

type Props = { selectedRoomId?: string; onRoomSelect: (roomId: string) => void };

export default function RepairScreen({ selectedRoomId, onRoomSelect }: Props) {
  const notification = useNotification();
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [rooms, setRooms] = useState<string[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const [typeError, setTypeError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      const contracts = await contractService.getMyContracts();
      setContracts(contracts);
      // Chỉ phòng có hợp đồng ACTIVE mới được gửi yêu cầu sửa chữa.
      const activeRooms = contracts
        .filter(c => c.status === "active")
        .map(c => c.room);
      
      // Remove duplicates
      const uniqueRooms = Array.from(new Set(activeRooms));
      
      if (uniqueRooms.length > 0) {
        setRooms(uniqueRooms);
        const selected = contracts.find((contract) => contract.roomId === selectedRoomId && contract.status === "active") || contracts.find((contract) => contract.status === "active");
        setSelectedRoom(selected?.room || uniqueRooms[0]);
        if (!selectedRoomId && selected?.roomId) onRoomSelect(selected.roomId);
      } else {
        setRooms([]);
        setSelectedRoom("");
      }
    } catch (error) {
      console.log("Lỗi load phòng từ hợp đồng:", error);
      setRooms([]);
      setSelectedRoom("");
    }
  };

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await repairService.getRequests(selectedRoomId);
      setRequests(data);
    } catch (error) {
      console.log("Lỗi load yêu cầu sửa chữa:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    let isValid = true;

    if (!type.trim()) {
      setTypeError(t("tenantRepair.typeRequired"));
      isValid = false;
    } else {
      setTypeError("");
    }

    if (!description.trim()) {
      setDescriptionError(t("tenantRepair.descriptionRequired"));
      isValid = false;
    } else if (description.trim().length < 10) {
      setDescriptionError(t("tenantRepair.descriptionMin"));
      isValid = false;
    } else {
      setDescriptionError("");
    }

    if (!isValid) return;

    try {
      const updatedRequests = await repairService.createRequest({
        roomId: selectedRoomId || contracts.find((contract) => contract.room === selectedRoom)?.roomId,
        room: selectedRoom,
        type: type.trim(),
        description: description.trim(),
        images,
      });

      setRequests(updatedRequests);

      notification.success(t("tenantRepair.submitted"));

      setType("");
      setDescription("");
      setImages([]);
    } catch (error) {
      console.log("Lỗi gửi yêu cầu:", error);
      notification.error(getNotificationMessage(error, t("tenantRepair.submitFailed")));
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        notification.info(t("tenantRepair.imagePermission"), {
          title: t("tenantRepair.permission"),
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled) {
        const newImages = result.assets
          .map((asset) => asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri)
          .filter(Boolean) as string[];
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.log("Lỗi chọn ảnh:", error);
      notification.error(getNotificationMessage(error, t("tenantRepair.imageFailed")));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notification.confirm({
      title: t("tenantRepair.deleteTitle"), message: t("tenantRepair.deleteMessage"), confirmText: t("common.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await repairService.deleteRequest(id);
      await loadRequests();
      notification.success(t("tenantRepair.deleted"));
    } catch (error) {
      console.log("Lỗi xóa yêu cầu:", error);
      notification.error(getNotificationMessage(error, t("tenantRepair.deleteFailed")));
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === requests.length && requests.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const confirmed = await notification.confirm({
      title: t("tenantRepair.deleteManyTitle"), message: t("tenantRepair.deleteManyMessage", { count }), confirmText: t("common.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await Promise.all(selectedIds.map(id => repairService.deleteRequest(id)));
      setSelectedIds([]);
      await loadRequests();
      notification.success(t("tenantRepair.deletedMany", { count }));
    } catch (error) {
      notification.error(getNotificationMessage(error, t("tenantRepair.deleteManyFailed")));
      setIsLoading(false);
    }
  };

  const getPriorityStyle = (value?: Priority) => {
    if (value === "Cao") return styles.priorityHigh;
    if (value === "Trung bình") return styles.priorityMedium;
    if (value === "Thấp") return styles.priorityLow;
    return styles.priorityNone;
  };

  const getStatusText = (status: RepairStatus) => {
    if (status === "pending") return t("tenantRepair.pending");
    if (status === "processing") return t("tenantRepair.processing");
    return t("tenantRepair.done");
  };

  const getStatusStyle = (status: RepairStatus) => {
    if (status === "done") return styles.statusDone;
    if (status === "processing") return styles.statusProcessing;
    return styles.statusPending;
  };

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
      <>
      <AppText style={styles.title}>{t("tenantRepair.title")}</AppText>
      <AppText style={styles.subtitle}>
        {t("tenantRepair.subtitle")}
      </AppText>
      <TenantRoomSwitcher contracts={contracts} selectedRoomId={selectedRoomId} onSelect={(roomId) => {
        onRoomSelect(roomId);
        const contract = contracts.find((item) => item.roomId === roomId);
        if (contract) setSelectedRoom(contract.room);
      }} />

      <AnimatedEntry>
      <Card style={styles.formCard}>
        <AppText style={styles.sectionTitle}>{t("tenantRepair.new")}</AppText>

        <AppText style={styles.label}>{t("tenantRepair.room")}</AppText>
        {rooms.length <= 1 ? (
          <AppTextInput style={styles.inputDisabled} value={selectedRoom} editable={false} />
        ) : (
          <View style={styles.roomSelectRow}>
            {rooms.map((roomCode) => {
              const active = selectedRoom === roomCode;

              return (
                <Pressable
                  key={roomCode}
                  style={[styles.roomButton, active && styles.roomActive]}
              onPress={() => {
                setSelectedRoom(roomCode);
                const contract = contracts.find((item) => item.room === roomCode);
                if (contract?.roomId) onRoomSelect(contract.roomId);
              }}
                >
                  <AppText
                    style={[
                      styles.roomText,
                      active && styles.roomTextActive,
                    ]}
                  >
                    {t("tenantRepair.room", { roomCode })}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}

        <AppText style={styles.label}>{t("tenantRepair.type")}</AppText>
        <AppTextInput
          style={[styles.input, typeError ? styles.inputError : null]}
          value={type}
          onChangeText={(value) => {
            setType(value);
            if (typeError) setTypeError("");
          }}
          placeholder={t("tenantRepair.typePlaceholder")}
          placeholderTextColor={theme.muted}
        />
        {typeError ? <AppText style={styles.errorText}>{typeError}</AppText> : null}

        <AppText style={styles.label}>{t("tenantRepair.description")}</AppText>
        <AppTextInput
          style={[
            styles.input,
            styles.textArea,
            descriptionError ? styles.inputError : null,
          ]}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (descriptionError) setDescriptionError("");
          }}
          placeholder={t("tenantRepair.descriptionPlaceholder")}
          placeholderTextColor={theme.muted}
          multiline
        />
        {descriptionError ? (
          <AppText style={styles.errorText}>{descriptionError}</AppText>
        ) : null}

        <Pressable style={styles.uploadBox} onPress={pickImage}>
          <View style={styles.uploadIcon}><Ionicons name="images-outline" size={25} color={theme.primary} /></View>
          <AppText style={styles.uploadText}>{t("tenantRepair.upload")}</AppText>
          <AppText style={styles.uploadHint}>{t("tenantRepair.uploadHint", { count: images.length })}</AppText>
        </Pressable>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imagePreviewBox}>
                <Image source={{ uri: img }} style={styles.previewImage} />
                <Pressable
                  accessibilityLabel={t("tenantRepair.removeImage", { index: idx + 1 })}
                  accessibilityRole="button"
                  style={styles.removeImageBtn}
                  onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                >
                  <AppText style={styles.removeImageText}>×</AppText>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="paper-plane-outline" size={18} color={theme.background} />
          <AppText style={styles.submitText}>{t("tenantRepair.submit")}</AppText>
        </Pressable>
      </Card>
      </AnimatedEntry>

      <AppText style={styles.historyTitle}>{t("tenantRepair.history")}</AppText>

      {/* Hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <AppText style={styles.bulkText}>{t("tenantRepair.selected", { count: selectedIds.length })}</AppText>
          <Pressable style={styles.bulkDeleteButton} onPress={handleBulkDelete}>
            <Ionicons name="trash-outline" size={16} color="#FFF" />
            <AppText style={styles.bulkDeleteText}>{t("tenantRepair.deleteAll")}</AppText>
          </Pressable>
        </View>
      )}

      {/* Tùy chọn chọn tất cả */}
      {requests.length > 0 && (
        <Pressable
          accessibilityLabel={t("tenantRepair.selectAll")}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selectedIds.length === requests.length }}
          style={styles.selectAllContainer}
          onPress={toggleAll}
        >
          <Ionicons 
            name={selectedIds.length === requests.length ? "checkbox" : "square-outline"} 
            size={22} 
            color={selectedIds.length === requests.length ? theme.primary : theme.muted}
          />
          <AppText style={styles.selectAllText}>{t("tenantRepair.selectAll")}</AppText>
        </Pressable>
      )}
      </>
      }
      ListEmptyComponent={
        <IllustratedEmptyState
          description={t("tenantRepair.emptyDescription")}
          kind="repair"
          title={t("tenantRepair.empty")}
        />
      }
      renderItem={({ item, index }) => (
          <AnimatedEntry delay={Math.min(index, 5) * 40}>
          <View style={styles.timelineRow}>
          <View style={styles.timelineRail}>
            {index < requests.length - 1 ? <View style={styles.timelineLine} /> : null}
            <View style={[styles.timelineNode, getStatusStyle(item.status)]}>
              <Ionicons
                name={item.status === "done" ? "checkmark" : item.priority === "Cao" ? "alert" : "construct-outline"}
                size={14}
                color={theme.text}
              />
            </View>
          </View>
          <Pressable onLongPress={() => toggleSelection(item.id)} style={styles.timelineContent}>
            <Card style={[styles.requestCard, selectedIds.includes(item.id) && styles.requestCardSelected]}>
              <View style={styles.requestHeader}>
                <View style={styles.requestLeft}>
                  <Pressable
                    accessibilityLabel={t("tenantRepair.select", { type: item.type })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedIds.includes(item.id) }}
                    onPress={() => toggleSelection(item.id)}
                    style={styles.checkboxArea}
                  >
                    <Ionicons 
                      name={selectedIds.includes(item.id) ? "checkbox" : "square-outline"} 
                      size={22} 
                      color={selectedIds.includes(item.id) ? theme.primary : theme.muted}
                    />
                  </Pressable>
                  <View>
                    <AppText style={styles.requestTitle}>{item.type}</AppText>
                <AppText style={styles.requestDate}>
                  {t("tenantRepair.roomDate", { room: item.room, date: item.createdAt })}
                </AppText>
                  </View>
                </View>

              <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                <Ionicons name="ellipse" size={8} color={theme.primary} />
                <AppText style={styles.statusText}>
                  {getStatusText(item.status)}
                </AppText>
              </View>
            </View>

            <AppText style={styles.requestDesc}>{item.description}</AppText>

            {item.images && item.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyImagesContainer}>
                {item.images.map((imgUrl, idx) => (
                  <Image key={idx} source={{ uri: imgUrl }} style={styles.historyImage} />
                ))}
              </ScrollView>
            )}

            <View style={styles.requestFooter}>
              <View
                style={[styles.priorityBadge, getPriorityStyle(item.priority)]}
              >
                <AppText style={styles.priorityBadgeText}>{item.priority}</AppText>
              </View>

              <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={17} color={theme.danger} />
                <AppText style={styles.deleteText}>{t("common.delete")}</AppText>
              </Pressable>
            </View>
            </Card>
          </Pressable>
          </View>
          </AnimatedEntry>
      )}
    />
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) => StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  formCard: {
    marginBottom: 22,
    backgroundColor: theme.primarySoft,
    borderColor: "transparent",
    borderRadius: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    minHeight: 48,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 14,
    color: theme.text,
  },
  inputDisabled: {
    width: "100%",
    height: 48,
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 14,
    color: theme.muted,
  },
  inputError: {
    borderColor: theme.danger,
    backgroundColor: theme.warningSoft,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  priorityButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.muted,
  },
  priorityTextActive: {
    color: theme.background,
  },
  textArea: {
    height: 105,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  uploadBox: {
    height: 116,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.primary,
    borderStyle: "dashed",
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 16,
  },
  uploadIcon: {
    alignItems: "center",
    backgroundColor: theme.primarySoft,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    marginBottom: 4,
    width: 44,
  },
  uploadText: {
    color: theme.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  uploadHint: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  submitText: {
    color: theme.background,
    fontSize: 15,
    fontWeight: "900",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.text,
    marginBottom: 12,
  },
  bulkActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: theme.warningSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  bulkText: {
    color: theme.danger,
    fontWeight: "700",
    fontSize: 14,
  },
  bulkDeleteButton: {
    backgroundColor: theme.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkDeleteText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  selectAllText: {
    fontSize: 14,
    color: theme.muted,
    fontWeight: "600",
  },
  requestCard: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: theme.surface,
    borderColor: "transparent",
    borderRadius: 20,
  },
  timelineRow: { flexDirection: "row", gap: 10 },
  timelineContent: { flex: 1 },
  timelineRail: { alignItems: "center", width: 28 },
  timelineLine: {
    backgroundColor: theme.border,
    bottom: -12,
    position: "absolute",
    top: 30,
    width: 2,
  },
  timelineNode: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  requestCardSelected: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  requestLeft: {
    gap: 8,
  },
  checkboxArea: {
    padding: 2,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.text,
  },
  requestDate: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 5,
  },
  statusBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: theme.warningSoft,
  },
  statusProcessing: {
    backgroundColor: theme.primarySoft,
  },
  statusDone: {
    backgroundColor: theme.positiveSoft,
  },
  statusText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900",
  },
  requestDesc: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityHigh: {
    backgroundColor: "#FFE8E8",
  },
  priorityMedium: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  priorityLow: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  priorityNone: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
  },
  priorityBadgeText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "900",
  },
  deleteText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  deleteButton: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 44 },
  roomSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 2,
  },
  roomButton: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roomActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  roomText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.muted,
  },
  roomTextActive: {
    color: theme.background,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 10,
  },
  imagePreviewBox: {
    position: "relative",
    marginRight: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  removeImageBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: theme.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  historyImagesContainer: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 2,
  },
  historyImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
});
