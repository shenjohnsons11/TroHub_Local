import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
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
import { useTranslation } from "../contexts/LanguageContext";
import TenantRoomSwitcher from "../components/TenantRoomSwitcher";
import { Contract } from "../types/Contract";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

type Props = {
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
};

type RepairFilter =
  | "all"
  | "pending"
  | "processing"
  | "done";

export default function RepairScreen({
  selectedRoomId,
  onRoomSelect,
}: Props) {
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

  // Chỉ dùng selection cho các yêu cầu đã hoàn thành
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bộ lọc trạng thái
  const [statusFilter, setStatusFilter] =
    useState<RepairFilter>("all");

  useEffect(() => {
    void loadRooms();
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      const contractsData =
        await contractService.getMyContracts();

      setContracts(contractsData);

      // Chỉ phòng có hợp đồng ACTIVE mới được gửi yêu cầu sửa chữa
      const activeRooms = contractsData
        .filter((contract) => contract.status === "active")
        .map((contract) => contract.room);

      const uniqueRooms = Array.from(
        new Set(activeRooms),
      );

      if (uniqueRooms.length > 0) {
        setRooms(uniqueRooms);

        const selected =
          contractsData.find(
            (contract) =>
              contract.roomId === selectedRoomId &&
              contract.status === "active",
          ) ||
          contractsData.find(
            (contract) =>
              contract.status === "active",
          );

        setSelectedRoom(
          selected?.room || uniqueRooms[0],
        );

        if (
          !selectedRoomId &&
          selected?.roomId
        ) {
          onRoomSelect(selected.roomId);
        }
      } else {
        setRooms([]);
        setSelectedRoom("");
      }
    } catch (error) {
      console.log(
        "Lỗi load phòng từ hợp đồng:",
        error,
      );

      setRooms([]);
      setSelectedRoom("");
    }
  };

  const loadRequests = async () => {
    try {
      setIsLoading(true);

      const data =
        await repairService.getRequests(
          selectedRoomId,
        );

      setRequests(data);
      setSelectedIds([]);
    } catch (error) {
      console.log(
        "Lỗi load yêu cầu sửa chữa:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    let isValid = true;

    if (!type.trim()) {
      setTypeError(
        t("tenantRepair.typeRequired"),
      );

      isValid = false;
    } else {
      setTypeError("");
    }

    if (!description.trim()) {
      setDescriptionError(
        t("tenantRepair.descriptionRequired"),
      );

      isValid = false;
    } else if (
      description.trim().length < 10
    ) {
      setDescriptionError(
        t("tenantRepair.descriptionMin"),
      );

      isValid = false;
    } else {
      setDescriptionError("");
    }

    if (!isValid) return;

    try {
      const updatedRequests =
        await repairService.createRequest({
          roomId:
            selectedRoomId ||
            contracts.find(
              (contract) =>
                contract.room === selectedRoom,
            )?.roomId,

          room: selectedRoom,
          type: type.trim(),
          description: description.trim(),
          images,
        });

      setRequests(updatedRequests);

      notification.success(
        t("tenantRepair.submitted"),
      );

      setType("");
      setDescription("");
      setImages([]);
    } catch (error) {
      console.log(
        "Lỗi gửi yêu cầu:",
        error,
      );

      notification.error(
        getNotificationMessage(
          error,
          t("tenantRepair.submitFailed"),
        ),
      );
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        notification.info(
          t("tenantRepair.imagePermission"),
          {
            title: t(
              "tenantRepair.permission",
            ),
          },
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions
                .Images,
            allowsMultipleSelection: true,
            quality: 0.6,
            base64: true,
          },
        );

      if (!result.canceled) {
        const newImages =
          result.assets
            .map((asset) =>
              asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : asset.uri,
            )
            .filter(Boolean) as string[];

        setImages((prev) => [
          ...prev,
          ...newImages,
        ]);
      }
    } catch (error) {
      console.log(
        "Lỗi chọn ảnh:",
        error,
      );

      notification.error(
        getNotificationMessage(
          error,
          t("tenantRepair.imageFailed"),
        ),
      );
    }
  };

  // ============================
  // FILTER
  // ============================

  const statusCounts = useMemo(
    () => ({
      all: requests.length,

      pending: requests.filter(
        (item) =>
          item.status === "pending",
      ).length,

      processing: requests.filter(
        (item) =>
          item.status === "processing",
      ).length,

      done: requests.filter(
        (item) =>
          item.status === "done",
      ).length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") {
      return requests;
    }

    return requests.filter(
      (item) =>
        item.status === statusFilter,
    );
  }, [requests, statusFilter]);

  const visibleCompletedRequests =
    useMemo(
      () =>
        filteredRequests.filter(
          (item) =>
            item.status === "done",
        ),
      [filteredRequests],
    );

  const changeStatusFilter = (
    value: RepairFilter,
  ) => {
    setStatusFilter(value);

    // Không giữ checkbox khi đổi tab
    setSelectedIds([]);
  };

  // ============================
  // DELETE
  // ============================

  const handleDelete = async (
    id: string,
  ) => {
    const target =
      requests.find(
        (item) => item.id === id,
      );

    // Chỉ cho phép yêu cầu hoàn thành
    if (
      !target ||
      target.status !== "done"
    ) {
      notification.warning(
        "Chỉ có thể xóa yêu cầu đã hoàn thành.",
      );

      return;
    }

    const confirmed =
      await notification.confirm({
        title: t(
          "tenantRepair.deleteTitle",
        ),

        message: t(
          "tenantRepair.deleteMessage",
        ),

        confirmText: t(
          "common.delete",
        ),

        destructive: true,
      });

    if (!confirmed) return;

    try {
      setIsLoading(true);

      await repairService.deleteRequest(
        id,
      );

      await loadRequests();

      notification.success(
        t("tenantRepair.deleted"),
      );
    } catch (error) {
      console.log(
        "Lỗi xóa yêu cầu:",
        error,
      );

      notification.error(
        getNotificationMessage(
          error,
          t(
            "tenantRepair.deleteFailed",
          ),
        ),
      );

      setIsLoading(false);
    }
  };

  const toggleSelection = (
    id: string,
  ) => {
    const target =
      requests.find(
        (item) => item.id === id,
      );

    // Chỉ được chọn yêu cầu hoàn thành
    if (
      !target ||
      target.status !== "done"
    ) {
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter(
            (item) => item !== id,
          )
        : [...prev, id],
    );
  };

  const allVisibleCompletedSelected =
    visibleCompletedRequests.length >
      0 &&
    visibleCompletedRequests.every(
      (item) =>
        selectedIds.includes(item.id),
    );

  const toggleAll = () => {
    if (
      visibleCompletedRequests.length ===
      0
    ) {
      return;
    }

    if (
      allVisibleCompletedSelected
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        visibleCompletedRequests.map(
          (item) => item.id,
        ),
      );
    }
  };

  const handleBulkDelete =
    async () => {
      if (
        selectedIds.length === 0
      ) {
        return;
      }

      const validIds =
        selectedIds.filter((id) =>
          requests.some(
            (item) =>
              item.id === id &&
              item.status === "done",
          ),
        );

      if (validIds.length === 0) {
        return;
      }

      const count =
        validIds.length;

      const confirmed =
        await notification.confirm({
          title: t(
            "tenantRepair.deleteManyTitle",
          ),

          message: t(
            "tenantRepair.deleteManyMessage",
            {
              count,
            },
          ),

          confirmText: t(
            "common.delete",
          ),

          destructive: true,
        });

      if (!confirmed) return;

      try {
        setIsLoading(true);

        await Promise.all(
          validIds.map((id) =>
            repairService.deleteRequest(
              id,
            ),
          ),
        );

        setSelectedIds([]);

        await loadRequests();

        notification.success(
          t(
            "tenantRepair.deletedMany",
            {
              count,
            },
          ),
        );
      } catch (error) {
        notification.error(
          getNotificationMessage(
            error,
            t(
              "tenantRepair.deleteManyFailed",
            ),
          ),
        );

        setIsLoading(false);
      }
    };

  // ============================
  // STYLE HELPERS
  // ============================

  const getPriorityStyle = (
    value?: Priority,
  ) => {
    if (value === "Cao") {
      return styles.priorityHigh;
    }

    if (
      value === "Trung bình"
    ) {
      return styles.priorityMedium;
    }

    if (value === "Thấp") {
      return styles.priorityLow;
    }

    return styles.priorityNone;
  };

  const getStatusText = (
    status: RepairStatus,
  ) => {
    if (status === "pending") {
      return "Chờ tiếp nhận";
    }

    if (
      status === "processing"
    ) {
      return "Đang sửa";
    }

    return "Đã hoàn thành";
  };

  const getStatusStyle = (
    status: RepairStatus,
  ) => {
    if (status === "done") {
      return styles.statusDone;
    }

    if (
      status === "processing"
    ) {
      return styles.statusProcessing;
    }

    return styles.statusPending;
  };

  if (isLoading) {
    return (
      <View
        style={styles.loadingBox}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredRequests}
      keyExtractor={(item) =>
        item.id
      }
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <AppText
            style={styles.title}
          >
            {t("tenantRepair.title")}
          </AppText>

          <AppText
            style={styles.subtitle}
          >
            {t(
              "tenantRepair.subtitle",
            )}
          </AppText>

          <TenantRoomSwitcher
            contracts={contracts}
            selectedRoomId={
              selectedRoomId
            }
            onSelect={(roomId) => {
              onRoomSelect(roomId);

              const contract =
                contracts.find(
                  (item) =>
                    item.roomId ===
                    roomId,
                );

              if (contract) {
                setSelectedRoom(
                  contract.room,
                );
              }
            }}
          />

          <AnimatedEntry>
            <Card
              style={
                styles.formCard
              }
            >
              <View style={styles.sectionHeading}>
                <FeatureIconBox token={FEATURE_ICONS.repairs} size={20} accessibilityLabel={t("tenantRepair.new")} />
                <AppText style={styles.sectionTitle}>{t("tenantRepair.new")}</AppText>
              </View>

              <AppText
                style={styles.label}
              >
                {t(
                  "tenantRepair.room",
                )}
              </AppText>

              {rooms.length <= 1 ? (
                <AppTextInput
                  style={
                    styles.inputDisabled
                  }
                  value={selectedRoom}
                  editable={false}
                />
              ) : (
                <View
                  style={
                    styles.roomSelectRow
                  }
                >
                  {rooms.map(
                    (roomCode) => {
                      const active =
                        selectedRoom ===
                        roomCode;

                      return (
                        <Pressable
                          key={
                            roomCode
                          }
                          style={[
                            styles.roomButton,
                            active &&
                              styles.roomActive,
                          ]}
                          onPress={() => {
                            setSelectedRoom(
                              roomCode,
                            );

                            const contract =
                              contracts.find(
                                (
                                  item,
                                ) =>
                                  item.room ===
                                  roomCode,
                              );

                            if (
                              contract?.roomId
                            ) {
                              onRoomSelect(
                                contract.roomId,
                              );
                            }
                          }}
                        >
                          <AppText
                            style={[
                              styles.roomText,
                              active &&
                                styles.roomTextActive,
                            ]}
                          >
                            {t(
                              "tenantRepair.room",
                              {
                                roomCode,
                              },
                            )}
                          </AppText>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              )}

              <AppText
                style={styles.label}
              >
                {t(
                  "tenantRepair.type",
                )}
              </AppText>

              <AppTextInput
                style={[
                  styles.input,
                  typeError
                    ? styles.inputError
                    : null,
                ]}
                value={type}
                onChangeText={(
                  value,
                ) => {
                  setType(value);

                  if (
                    typeError
                  ) {
                    setTypeError(
                      "",
                    );
                  }
                }}
                placeholder={t(
                  "tenantRepair.typePlaceholder",
                )}
                placeholderTextColor={
                  theme.muted
                }
              />

              {typeError ? (
                <AppText
                  style={
                    styles.errorText
                  }
                >
                  {typeError}
                </AppText>
              ) : null}

              <AppText
                style={styles.label}
              >
                {t(
                  "tenantRepair.description",
                )}
              </AppText>

              <AppTextInput
                style={[
                  styles.input,
                  styles.textArea,
                  descriptionError
                    ? styles.inputError
                    : null,
                ]}
                value={description}
                onChangeText={(
                  value,
                ) => {
                  setDescription(
                    value,
                  );

                  if (
                    descriptionError
                  ) {
                    setDescriptionError(
                      "",
                    );
                  }
                }}
                placeholder={t(
                  "tenantRepair.descriptionPlaceholder",
                )}
                placeholderTextColor={
                  theme.muted
                }
                multiline
              />

              {descriptionError ? (
                <AppText
                  style={
                    styles.errorText
                  }
                >
                  {descriptionError}
                </AppText>
              ) : null}

              <Pressable
                style={
                  styles.uploadBox
                }
                onPress={
                  pickImage
                }
              >
                <View
                  style={
                    styles.uploadIcon
                  }
                >
                  <Ionicons
                    name="images-outline"
                    size={25}
                    color={
                      theme.primary
                    }
                  />
                </View>

                <AppText
                  style={
                    styles.uploadText
                  }
                >
                  {t(
                    "tenantRepair.upload",
                  )}
                </AppText>

                <AppText
                  style={
                    styles.uploadHint
                  }
                >
                  {t(
                    "tenantRepair.uploadHint",
                    {
                      count:
                        images.length,
                    },
                  )}
                </AppText>
              </Pressable>

              {images.length >
                0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  style={
                    styles.imagePreviewContainer
                  }
                >
                  {images.map(
                    (
                      img,
                      idx,
                    ) => (
                      <View
                        key={idx}
                        style={
                          styles.imagePreviewBox
                        }
                      >
                        <Image
                          source={{
                            uri: img,
                          }}
                          style={
                            styles.previewImage
                          }
                        />

                        <Pressable
                          accessibilityLabel={t(
                            "tenantRepair.removeImage",
                            {
                              index:
                                idx +
                                1,
                            },
                          )}
                          accessibilityRole="button"
                          style={
                            styles.removeImageBtn
                          }
                          onPress={() =>
                            setImages(
                              (
                                prev,
                              ) =>
                                prev.filter(
                                  (
                                    _,
                                    i,
                                  ) =>
                                    i !==
                                    idx,
                                ),
                            )
                          }
                        >
                          <AppText
                            style={
                              styles.removeImageText
                            }
                          >
                            ×
                          </AppText>
                        </Pressable>
                      </View>
                    ),
                  )}
                </ScrollView>
              )}

              <Pressable
                style={
                  styles.submitButton
                }
                onPress={
                  handleSubmit
                }
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color={
                    theme.background
                  }
                />

                <AppText
                  style={
                    styles.submitText
                  }
                >
                  {t(
                    "tenantRepair.submit",
                  )}
                </AppText>
              </Pressable>
            </Card>
          </AnimatedEntry>

          <View
            style={
              styles.historyHeader
            }
          >
            <AppText
              style={
                styles.historyTitle
              }
            >
              {t(
                "tenantRepair.history",
              )}
            </AppText>

            <AppText
              style={
                styles.historyCount
              }
            >
              {requests.length} yêu cầu
            </AppText>
          </View>

          {/* ========================= */}
          {/* FILTER TRẠNG THÁI */}
          {/* ========================= */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={
              styles.filterScroll
            }
            contentContainerStyle={
              styles.filterRow
            }
          >
            <Pressable
              style={[
                styles.filterChip,
                statusFilter ===
                  "all" &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                changeStatusFilter(
                  "all",
                )
              }
            >
              <AppText
                style={[
                  styles.filterChipText,
                  statusFilter ===
                    "all" &&
                    styles.filterChipTextActive,
                ]}
              >
                Tất cả
              </AppText>

              <View
                style={[
                  styles.filterCount,
                  statusFilter ===
                    "all" &&
                    styles.filterCountActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterCountText,
                    statusFilter ===
                      "all" &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {
                    statusCounts.all
                  }
                </AppText>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                statusFilter ===
                  "pending" &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                changeStatusFilter(
                  "pending",
                )
              }
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor:
                      "#F59E0B",
                  },
                ]}
              />

              <AppText
                style={[
                  styles.filterChipText,
                  statusFilter ===
                    "pending" &&
                    styles.filterChipTextActive,
                ]}
              >
                Chờ tiếp nhận
              </AppText>

              <View
                style={[
                  styles.filterCount,
                  statusFilter ===
                    "pending" &&
                    styles.filterCountActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterCountText,
                    statusFilter ===
                      "pending" &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {
                    statusCounts.pending
                  }
                </AppText>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                statusFilter ===
                  "processing" &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                changeStatusFilter(
                  "processing",
                )
              }
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor:
                      theme.primary,
                  },
                ]}
              />

              <AppText
                style={[
                  styles.filterChipText,
                  statusFilter ===
                    "processing" &&
                    styles.filterChipTextActive,
                ]}
              >
                Đang sửa
              </AppText>

              <View
                style={[
                  styles.filterCount,
                  statusFilter ===
                    "processing" &&
                    styles.filterCountActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterCountText,
                    statusFilter ===
                      "processing" &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {
                    statusCounts.processing
                  }
                </AppText>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                statusFilter ===
                  "done" &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                changeStatusFilter(
                  "done",
                )
              }
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor:
                      theme.positive,
                  },
                ]}
              />

              <AppText
                style={[
                  styles.filterChipText,
                  statusFilter ===
                    "done" &&
                    styles.filterChipTextActive,
                ]}
              >
                Hoàn thành
              </AppText>

              <View
                style={[
                  styles.filterCount,
                  statusFilter ===
                    "done" &&
                    styles.filterCountActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterCountText,
                    statusFilter ===
                      "done" &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {
                    statusCounts.done
                  }
                </AppText>
              </View>
            </Pressable>
          </ScrollView>

          {/* ========================= */}
          {/* XÓA HÀNG LOẠT */}
          {/* chỉ hiện cho yêu cầu hoàn thành */}
          {/* ========================= */}

          {selectedIds.length >
            0 && (
            <View
              style={
                styles.bulkActionContainer
              }
            >
              <AppText
                style={
                  styles.bulkText
                }
              >
                {t(
                  "tenantRepair.selected",
                  {
                    count:
                      selectedIds.length,
                  },
                )}
              </AppText>

              <Pressable
                style={
                  styles.bulkDeleteButton
                }
                onPress={
                  handleBulkDelete
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color="#FFF"
                />

                <AppText
                  style={
                    styles.bulkDeleteText
                  }
                >
                  {t(
                    "tenantRepair.deleteAll",
                  )}
                </AppText>
              </Pressable>
            </View>
          )}

          {/* Chọn tất cả chỉ áp dụng cho các yêu cầu đã hoàn thành */}

          {visibleCompletedRequests.length >
            0 && (
            <Pressable
              accessibilityLabel="Chọn tất cả yêu cầu đã hoàn thành"
              accessibilityRole="checkbox"
              accessibilityState={{
                checked:
                  allVisibleCompletedSelected,
              }}
              style={
                styles.selectAllContainer
              }
              onPress={toggleAll}
            >
              <Ionicons
                name={
                  allVisibleCompletedSelected
                    ? "checkbox"
                    : "square-outline"
                }
                size={22}
                color={
                  allVisibleCompletedSelected
                    ? theme.primary
                    : theme.muted
                }
              />

              <AppText
                style={
                  styles.selectAllText
                }
              >
                Chọn tất cả yêu cầu đã hoàn thành
              </AppText>
            </Pressable>
          )}
        </>
      }
      ListEmptyComponent={
        <IllustratedEmptyState
          description={
            requests.length === 0
              ? t(
                  "tenantRepair.emptyDescription",
                )
              : "Không có yêu cầu sửa chữa thuộc trạng thái này."
          }
          kind="repair"
          title={
            requests.length === 0
              ? t(
                  "tenantRepair.empty",
                )
              : "Không có yêu cầu"
          }
        />
      }
      renderItem={({
        item,
        index,
      }) => (
        <AnimatedEntry
          delay={
            Math.min(
              index,
              5,
            ) * 40
          }
        >
          <View
            style={
              styles.timelineRow
            }
          >
            <View
              style={
                styles.timelineRail
              }
            >
              {index <
              filteredRequests.length -
                1 ? (
                <View
                  style={
                    styles.timelineLine
                  }
                />
              ) : null}

              <View
                style={[
                  styles.timelineNode,
                  getStatusStyle(
                    item.status,
                  ),
                ]}
              >
                <Ionicons
                  name={
                    item.status ===
                    "done"
                      ? "checkmark"
                      : item.priority ===
                          "Cao"
                        ? "alert"
                        : "construct-outline"
                  }
                  size={14}
                  color={
                    theme.text
                  }
                />
              </View>
            </View>

            <Pressable
              onLongPress={() => {
                if (
                  item.status ===
                  "done"
                ) {
                  toggleSelection(
                    item.id,
                  );
                }
              }}
              style={
                styles.timelineContent
              }
            >
              <Card
                style={[
                  styles.requestCard,
                  selectedIds.includes(
                    item.id,
                  ) &&
                    styles.requestCardSelected,
                ]}
              >
                <View
                  style={
                    styles.requestHeader
                  }
                >
                  <View
                    style={
                      styles.requestLeft
                    }
                  >
                    {/* Checkbox chỉ có ở yêu cầu hoàn thành */}

                    {item.status ===
                      "done" && (
                      <Pressable
                        accessibilityLabel={`Chọn yêu cầu ${item.type}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked:
                            selectedIds.includes(
                              item.id,
                            ),
                        }}
                        onPress={() =>
                          toggleSelection(
                            item.id,
                          )
                        }
                        style={
                          styles.checkboxArea
                        }
                      >
                        <Ionicons
                          name={
                            selectedIds.includes(
                              item.id,
                            )
                              ? "checkbox"
                              : "square-outline"
                          }
                          size={22}
                          color={
                            selectedIds.includes(
                              item.id,
                            )
                              ? theme.primary
                              : theme.muted
                          }
                        />
                      </Pressable>
                    )}

                    <View
                      style={
                        styles.requestTitleBox
                      }
                    >
                      <AppText
                        style={
                          styles.requestTitle
                        }
                      >
                        {item.type}
                      </AppText>

                      <AppText
                        style={
                          styles.requestDate
                        }
                      >
                        {t(
                          "tenantRepair.roomDate",
                          {
                            room:
                              item.room,

                            date:
                              item.createdAt,
                          },
                        )}
                      </AppText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        item.status,
                      ),
                    ]}
                  >
                    <Ionicons
                      name="ellipse"
                      size={8}
                      color={
                        item.status ===
                        "pending"
                          ? "#F59E0B"
                          : item.status ===
                              "done"
                            ? theme.positive
                            : theme.primary
                      }
                    />

                    <AppText
                      style={
                        styles.statusText
                      }
                    >
                      {getStatusText(
                        item.status,
                      )}
                    </AppText>
                  </View>
                </View>

                <AppText
                  style={
                    styles.requestDesc
                  }
                >
                  {item.description}
                </AppText>

                {item.images &&
                  item.images
                    .length >
                    0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      style={
                        styles.historyImagesContainer
                      }
                    >
                      {item.images.map(
                        (
                          imgUrl,
                          idx,
                        ) => (
                          <Image
                            key={
                              idx
                            }
                            source={{
                              uri: imgUrl,
                            }}
                            style={
                              styles.historyImage
                            }
                          />
                        ),
                      )}
                    </ScrollView>
                  )}

                <View
                  style={
                    styles.requestFooter
                  }
                >
                  <View
                    style={[
                      styles.priorityBadge,
                      getPriorityStyle(
                        item.priority,
                      ),
                    ]}
                  >
                    <AppText
                      style={
                        styles.priorityBadgeText
                      }
                    >
                      {item.priority}
                    </AppText>
                  </View>

                  {/* XÓA CHỈ HIỆN KHI ĐÃ HOÀN THÀNH */}

                  {item.status ===
                    "done" && (
                    <Pressable
                      onPress={() =>
                        handleDelete(
                          item.id,
                        )
                      }
                      style={
                        styles.deleteButton
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={
                          theme.danger
                        }
                      />

                      <AppText
                        style={
                          styles.deleteText
                        }
                      >
                        {t(
                          "common.delete",
                        )}
                      </AppText>
                    </Pressable>
                  )}
                </View>
              </Card>
            </Pressable>
          </View>
        </AnimatedEntry>
      )}
    />
  );
}

const createStyles = (
  theme: ReturnType<
    typeof useAppTheme
  >["theme"],
) =>
  StyleSheet.create({
    loadingBox: {
      flex: 1,
      backgroundColor:
        theme.background,
      alignItems: "center",
      justifyContent:
        "center",
    },

    container: {
      flex: 1,
      backgroundColor:
        theme.background,
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
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      color: theme.muted,
      marginTop: 6,
      marginBottom: 20,
    },

    formCard: {
      marginBottom: 22,
      backgroundColor:
        theme.primarySoft,
      borderColor:
        "transparent",
      borderRadius: 24,
    },

    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 4,
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
      backgroundColor:
        theme.surfaceElevated,
      borderRadius: 16,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        theme.border,
      fontSize: 14,
      color: theme.text,
    },

    inputDisabled: {
      width: "100%",
      height: 48,
      backgroundColor:
        theme.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        theme.border,
      fontSize: 14,
      color: theme.muted,
    },

    inputError: {
      borderColor:
        theme.danger,
      backgroundColor:
        theme.warningSoft,
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
      backgroundColor:
        theme.surface,
      borderWidth: 1,
      borderColor:
        theme.border,
      alignItems: "center",
      justifyContent:
        "center",
    },

    priorityActive: {
      backgroundColor:
        theme.primary,
      borderColor:
        theme.primary,
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
      borderColor:
        theme.primary,
      borderStyle: "dashed",
      backgroundColor:
        theme.surface,
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 18,
      marginBottom: 16,
    },

    uploadIcon: {
      alignItems: "center",
      backgroundColor:
        theme.primarySoft,
      borderRadius: 16,
      height: 44,
      justifyContent:
        "center",
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
      backgroundColor:
        theme.primary,
      borderRadius: 16,
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent:
        "center",
    },

    submitText: {
      color: theme.background,
      fontSize: 15,
      fontWeight: "900",
    },

    historyHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 10,
    },

    historyTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.text,
    },

    historyCount: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "700",
    },

    // ======================
    // FILTER
    // ======================

    filterScroll: {
      marginBottom: 14,
    },

    filterRow: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 16,
    },

    filterChip: {
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        theme.border,
      backgroundColor:
        theme.surface,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    filterChipActive: {
      backgroundColor:
        theme.primary,
      borderColor:
        theme.primary,
    },

    filterChipText: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "800",
    },

    filterChipTextActive: {
      color: theme.background,
    },

    filterDot: {
      width: 7,
      height: 7,
      borderRadius: 99,
    },

    filterCount: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor:
        theme.surfaceElevated,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 6,
    },

    filterCountActive: {
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    filterCountText: {
      fontSize: 10,
      fontWeight: "900",
      color: theme.muted,
    },

    filterCountTextActive: {
      color: theme.background,
    },

    bulkActionContainer: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 8,
      backgroundColor:
        theme.warningSoft,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
    },

    bulkText: {
      color: theme.danger,
      fontWeight: "700",
      fontSize: 14,
    },

    bulkDeleteButton: {
      backgroundColor:
        theme.danger,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
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
      marginBottom: 12,
      paddingHorizontal: 4,
      minHeight: 40,
    },

    selectAllText: {
      fontSize: 13,
      color: theme.muted,
      fontWeight: "700",
    },

    requestCard: {
      marginBottom: 12,
      padding: 16,
      backgroundColor:
        theme.surface,
      borderColor:
        "transparent",
      borderRadius: 20,
    },

    timelineRow: {
      flexDirection: "row",
      gap: 10,
    },

    timelineContent: {
      flex: 1,
    },

    timelineRail: {
      alignItems: "center",
      width: 28,
    },

    timelineLine: {
      backgroundColor:
        theme.border,
      bottom: -12,
      position: "absolute",
      top: 30,
      width: 2,
    },

    timelineNode: {
      alignItems: "center",
      borderRadius: 999,
      height: 28,
      justifyContent:
        "center",
      width: 28,
    },

    requestCardSelected: {
      backgroundColor:
        theme.primarySoft,
      borderColor:
        theme.primary,
      borderWidth: 1,
    },

    requestHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      gap: 12,
    },

    requestLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 8,
    },

    requestTitleBox: {
      flex: 1,
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
      alignSelf:
        "flex-start",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
    },

    statusPending: {
      backgroundColor:
        theme.warningSoft,
    },

    statusProcessing: {
      backgroundColor:
        theme.primarySoft,
    },

    statusDone: {
      backgroundColor:
        theme.positiveSoft,
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
      justifyContent:
        "space-between",
      marginTop: 14,
      alignItems: "center",
    },

    priorityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },

    priorityHigh: {
      backgroundColor:
        "#FFE8E8",
    },

    priorityMedium: {
      backgroundColor:
        "rgba(245, 158, 11, 0.15)",
    },

    priorityLow: {
      backgroundColor:
        "rgba(16, 185, 129, 0.15)",
    },

    priorityNone: {
      backgroundColor:
        "rgba(100, 116, 139, 0.15)",
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

    deleteButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      minHeight: 40,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor:
        theme.warningSoft,
    },

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
      backgroundColor:
        theme.surface,
      borderWidth: 1,
      borderColor:
        theme.border,
      alignItems: "center",
      justifyContent:
        "center",
    },

    roomActive: {
      backgroundColor:
        theme.primary,
      borderColor:
        theme.primary,
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
      borderColor:
        theme.border,
    },

    removeImageBtn: {
      position: "absolute",
      top: -5,
      right: -5,
      backgroundColor:
        theme.danger,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent:
        "center",
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
      borderColor:
        theme.border,
    },
  });