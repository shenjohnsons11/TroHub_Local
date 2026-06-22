import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  View,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import { COLORS } from "../constants/theme";
import {
  Priority,
  RepairRequest,
  RepairStatus,
} from "../types/RepairRequest";
import { repairService } from "../services/repairService";
import { contractService } from "../services/contractService";

export default function RepairScreen() {
  const [rooms, setRooms] = useState<string[]>([]);
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
    loadRequests();
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const contracts = await contractService.getMyContracts();
      // filter only active contracts
      const activeRooms = contracts
        .filter(c => c.status === "active")
        .map(c => c.room);
      
      // Remove duplicates
      const uniqueRooms = Array.from(new Set(activeRooms));
      
      if (uniqueRooms.length > 0) {
        setRooms(uniqueRooms);
        setSelectedRoom(uniqueRooms[0]);
      } else {
        const allRooms = contracts.map(c => c.room);
        const uniqueAllRooms = Array.from(new Set(allRooms));
        if (uniqueAllRooms.length > 0) {
          setRooms(uniqueAllRooms);
          setSelectedRoom(uniqueAllRooms[0]);
        } else {
          setRooms(["Chưa có phòng"]);
          setSelectedRoom("Chưa có phòng");
        }
      }
    } catch (error) {
      console.log("Lỗi load phòng từ hợp đồng:", error);
      setRooms(["A101"]);
      setSelectedRoom("A101");
    }
  };

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await repairService.getRequests();
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
      setTypeError("Vui lòng nhập loại sự cố");
      isValid = false;
    } else {
      setTypeError("");
    }

    if (!description.trim()) {
      setDescriptionError("Vui lòng nhập mô tả sự cố");
      isValid = false;
    } else if (description.trim().length < 10) {
      setDescriptionError("Mô tả phải có ít nhất 10 ký tự");
      isValid = false;
    } else {
      setDescriptionError("");
    }

    if (!isValid) return;

    try {
      const updatedRequests = await repairService.createRequest({
        room: selectedRoom,
        type: type.trim(),
        description: description.trim(),
        images,
      });

      setRequests(updatedRequests);

      Alert.alert("Thành công", "Yêu cầu sửa chữa đã được gửi");

      setType("");
      setDescription("");
      setImages([]);
    } catch (error) {
      console.log("Lỗi gửi yêu cầu:", error);
      Alert.alert("Lỗi", "Không thể gửi yêu cầu sửa chữa");
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh để tải ảnh lên.");
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
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa yêu cầu này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await repairService.deleteRequest(id);
              loadRequests();
            } catch (error) {
              console.log("Lỗi xóa yêu cầu:", error);
              Alert.alert("Lỗi", "Không thể xóa yêu cầu sửa chữa");
              setIsLoading(false);
            }
          }
        }
      ]
    );
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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} yêu cầu đã chọn không?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              const promises = selectedIds.map(id => repairService.deleteRequest(id));
              await Promise.all(promises);
              Alert.alert("Thành công", `Đã xóa ${selectedIds.length} yêu cầu!`);
              setSelectedIds([]);
              loadRequests();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa một số yêu cầu.");
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getPriorityStyle = (value?: Priority) => {
    if (value === "Cao") return styles.priorityHigh;
    if (value === "Trung bình") return styles.priorityMedium;
    if (value === "Thấp") return styles.priorityLow;
    return styles.priorityNone;
  };

  const getStatusText = (status: RepairStatus) => {
    if (status === "pending") return "Chờ tiếp nhận";
    if (status === "processing") return "Đang xử lý";
    return "Đã hoàn thành";
  };

  const getStatusStyle = (status: RepairStatus) => {
    if (status === "done") return styles.statusDone;
    if (status === "processing") return styles.statusProcessing;
    return styles.statusPending;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Yêu cầu sửa chữa</Text>
      <Text style={styles.subtitle}>
        Gửi thông tin sự cố để chủ trọ xử lý nhanh hơn.
      </Text>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Tạo yêu cầu mới</Text>

        <Text style={styles.label}>Phòng</Text>
        {rooms.length <= 1 ? (
          <TextInput style={styles.inputDisabled} value={selectedRoom} editable={false} />
        ) : (
          <View style={styles.roomSelectRow}>
            {rooms.map((roomCode) => {
              const active = selectedRoom === roomCode;

              return (
                <Pressable
                  key={roomCode}
                  style={[styles.roomButton, active && styles.roomActive]}
                  onPress={() => setSelectedRoom(roomCode)}
                >
                  <Text
                    style={[
                      styles.roomText,
                      active && styles.roomTextActive,
                    ]}
                  >
                    Phòng {roomCode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Loại sự cố</Text>
        <TextInput
          style={[styles.input, typeError ? styles.inputError : null]}
          value={type}
          onChangeText={(value) => {
            setType(value);
            if (typeError) setTypeError("");
          }}
          placeholder="Điện, nước, internet, máy lạnh..."
          placeholderTextColor={COLORS.muted}
        />
        {typeError ? <Text style={styles.errorText}>{typeError}</Text> : null}

        <Text style={styles.label}>Mô tả</Text>
        <TextInput
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
          placeholder="Ví dụ: Máy lạnh không hoạt động, nước chảy yếu..."
          placeholderTextColor={COLORS.muted}
          multiline
        />
        {descriptionError ? (
          <Text style={styles.errorText}>{descriptionError}</Text>
        ) : null}

        <Pressable style={styles.uploadBox} onPress={pickImage}>
          <Text style={styles.uploadIcon}>＋</Text>
          <Text style={styles.uploadText}>Upload ảnh sự cố</Text>
          <Text style={styles.uploadHint}>PNG, JPG hoặc JPEG ({images.length} ảnh đã chọn)</Text>
        </Pressable>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imagePreviewBox}>
                <Image source={{ uri: img }} style={styles.previewImage} />
                <Pressable style={styles.removeImageBtn} onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}>
                  <Text style={styles.removeImageText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Gửi yêu cầu</Text>
        </Pressable>
      </Card>

      <Text style={styles.historyTitle}>Yêu cầu đã gửi</Text>

      {/* Hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <View style={styles.bulkActionContainer}>
          <Text style={styles.bulkText}>Đã chọn {selectedIds.length}</Text>
          <Pressable style={styles.bulkDeleteButton} onPress={handleBulkDelete}>
            <Ionicons name="trash-outline" size={16} color="#FFF" />
            <Text style={styles.bulkDeleteText}>Xóa tất cả</Text>
          </Pressable>
        </View>
      )}

      {/* Tùy chọn chọn tất cả */}
      {requests.length > 0 && (
        <Pressable style={styles.selectAllContainer} onPress={toggleAll}>
          <Ionicons 
            name={selectedIds.length === requests.length ? "checkbox" : "square-outline"} 
            size={22} 
            color={selectedIds.length === requests.length ? COLORS.orange : COLORS.muted} 
          />
          <Text style={styles.selectAllText}>Chọn tất cả</Text>
        </Pressable>
      )}

      {requests.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có yêu cầu sửa chữa nào.</Text>
        </Card>
      ) : (
        requests.map((item) => (
          <Pressable key={item.id} onLongPress={() => toggleSelection(item.id)}>
            <Card style={[styles.requestCard, selectedIds.includes(item.id) && styles.requestCardSelected]}>
              <View style={styles.requestHeader}>
                <View style={styles.requestLeft}>
                  <Pressable onPress={() => toggleSelection(item.id)} style={styles.checkboxArea}>
                    <Ionicons 
                      name={selectedIds.includes(item.id) ? "checkbox" : "square-outline"} 
                      size={22} 
                      color={selectedIds.includes(item.id) ? COLORS.orange : COLORS.muted} 
                    />
                  </Pressable>
                  <View>
                    <Text style={styles.requestTitle}>{item.type}</Text>
                <Text style={styles.requestDate}>
                  Phòng {item.room} • {item.createdAt}
                </Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                <Text style={styles.statusText}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.requestDesc}>{item.description}</Text>

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
                <Text style={styles.priorityBadgeText}>{item.priority}</Text>
              </View>

              <Pressable onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Xóa</Text>
              </Pressable>
            </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
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
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  formCard: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    fontSize: 14,
    color: COLORS.text,
  },
  inputDisabled: {
    width: "100%",
    height: 48,
    backgroundColor: "#ECEEF2",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E1E3E8",
    fontSize: 14,
    color: COLORS.muted,
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF7F7",
  },
  errorText: {
    color: "#FF3B30",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
  },
  priorityTextActive: {
    color: "#FFFFFF",
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
    borderColor: "#FFD8C2",
    borderStyle: "dashed",
    backgroundColor: "#FFF7F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 16,
  },
  uploadIcon: {
    color: COLORS.orange,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 4,
  },
  uploadText: {
    color: COLORS.orange,
    fontWeight: "800",
    fontSize: 14,
  },
  uploadHint: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    height: 52,
    backgroundColor: COLORS.orange,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },
  bulkActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#FFF0F0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  bulkText: {
    color: COLORS.red,
    fontWeight: "700",
    fontSize: 14,
  },
  bulkDeleteButton: {
    backgroundColor: COLORS.red,
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
    color: COLORS.muted,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  requestCard: {
    marginBottom: 12,
    padding: 16,
  },
  requestCardSelected: {
    backgroundColor: "#FFF5ED",
    borderColor: COLORS.orange,
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
    color: COLORS.text,
  },
  requestDate: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: "#FFF4E5",
  },
  statusProcessing: {
    backgroundColor: "#E6FAFF",
  },
  statusDone: {
    backgroundColor: "#EAFBEF",
  },
  statusText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  requestDesc: {
    color: COLORS.muted,
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
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  deleteText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: "900",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roomActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  roomText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
  },
  roomTextActive: {
    color: "#FFFFFF",
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
    borderColor: "#E8E9ED",
  },
  removeImageBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: COLORS.red,
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
    borderColor: "#E8E9ED",
  },
});