import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Clipboard, Alert } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { aiService, type AIPresentation, type AIRole, type AIChatResponse } from "../services/aiService";
import { useAppTheme } from "../contexts/ThemeContext";
import { UserProfile } from "../types/UserProfile";

let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch (e) {
  ExpoSpeechRecognitionModule = null;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AIChatScreenProps {
  profile: UserProfile;
  onBack?: () => void;
  onAction?: (action: any) => void;
}

const ROLE_PRESENTATIONS: Record<AIRole, AIPresentation> = {
  landlord: {
    title: "TroHub AI — Trợ lý Chủ trọ",
    greeting: "Xin chào Chủ trọ! Tôi có thể giúp gì cho việc quản lý nhà trọ hôm nay?",
  },
  tenant: {
    title: "TroHub AI — Trợ lý Cư dân",
    greeting: "Xin chào Cư dân! Bạn cần tra cứu hóa đơn hay báo sửa chữa gì không?",
  },
};

const QUICK_PROMPTS: Record<AIRole, string[]> = {
  landlord: [
    "Thống kê doanh thu tháng này",
    "Soạn tin nhắn nhắc nợ",
    "Hướng dẫn tạo hợp đồng mới",
  ],
  tenant: [
    "Hóa đơn của tôi tháng này",
    "Báo hỏng thiết bị",
    "Xem lịch thanh toán",
  ],
};

function normalizeRole(value: unknown): AIRole | null {
  if (value === "landlord" || value === 1) return "landlord";
  if (value === "tenant" || value === 2) return "tenant";
  return null;
}

function getPresentation(role: AIRole, value: AIChatResponse["presentation"]): AIPresentation {
  if (!value || typeof value !== "object") return ROLE_PRESENTATIONS[role];
  const presentation = value as Record<string, unknown>;
  return {
    title: typeof presentation.title === "string" && presentation.title.trim()
      ? presentation.title
      : ROLE_PRESENTATIONS[role].title,
    greeting: typeof presentation.greeting === "string" && presentation.greeting.trim()
      ? presentation.greeting
      : ROLE_PRESENTATIONS[role].greeting,
  };
}

export default function AIChatScreen({ profile, onBack, onAction }: AIChatScreenProps) {
  const { theme } = useAppTheme();
  const initialRole = normalizeRole(profile.role) || "tenant";
  const [role, setRole] = useState<AIRole>(initialRole);
  const [presentation, setPresentation] = useState<AIPresentation>(ROLE_PRESENTATIONS[initialRole]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `${ROLE_PRESENTATIONS[initialRole].greeting} (powered by Gemini 2.5 Flash).`,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (!ExpoSpeechRecognitionModule?.addListener) return;
    try {
      const result = ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
        if (event.isFinal && event.results?.[0]?.transcript) setInputMessage((value) => `${value}${value ? " " : ""}${event.results[0].transcript}`);
      });
      const end = ExpoSpeechRecognitionModule.addListener("end", () => setListening(false));
      return () => { result?.remove(); end?.remove(); };
    } catch (e) {
      console.warn("Speech recognition setup failed:", e);
    }
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const response = await aiService.chat(query);
      const responseRole = normalizeRole(response.role);
      const displayRole = responseRole || role;
      if (responseRole && responseRole !== role) setRole(responseRole);
      const nextPresentation = getPresentation(displayRole, response.presentation);
      setPresentation(nextPresentation);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: typeof response.reply === "string" && response.reply
          ? response.reply
          : "Xin lỗi, tôi chưa thể trả lời câu hỏi này lúc này.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      const action = response.action
        && typeof response.action === "object"
        && (response.action as { requiresConfirmation?: unknown }).requiresConfirmation === false
        ? response.action
        : null;
      if (role === "landlord" && displayRole === "landlord" && response.denied !== true && action) onAction?.(action);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `⚠️ **Lỗi kết nối:** ${error.message || "Không thể tải phản hồi từ Gemini AI. Vui lòng thử lại."}`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (!ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
      return Alert.alert(
        "Yêu cầu Development Build",
        "Tính năng nhận diện giọng nói (Micro) chưa hỗ trợ trực tiếp trên Expo Go. Bạn cần tạo Development Build để sử dụng."
      );
    }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) return Alert.alert("Chưa có quyền micro", "Hãy cấp quyền micro và nhận diện giọng nói để nhập bằng giọng nói.");
      setListening(true);
      ExpoSpeechRecognitionModule.start({ lang: "vi-VN", interimResults: false, maxAlternatives: 1 });
    } catch (error: any) {
      Alert.alert("Lỗi giọng nói", error.message || "Không thể khởi động nhận diện giọng nói.");
    }
  };

  const speak = (text: string) => Speech.speak(text.replace(/\*\*/g, ""), { language: "vi-VN" });

  const handleCopyText = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Thông báo", "Đã sao chép nội dung vào khay nhớ tạm!");
  };

  const handleClearHistory = () => {
    Alert.alert("Xác nhận", "Bạn có muốn xóa toàn bộ lịch sử trò chuyện?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          setMessages([
            {
              id: "welcome",
              sender: "ai",
              text: `${presentation.greeting} Lịch sử trò chuyện đã được làm sạch. Bạn cần hỗ trợ thêm gì?`,
              timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        },
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <AppText key={lineIdx} style={styles.messageText}>
          {parts.map((part, partIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <AppText key={partIdx} style={styles.boldText}>
                  {part.slice(2, -2)}
                </AppText>
              );
            }
            return part;
          })}
          {lineIdx < lines.length - 1 ? "\n" : ""}
        </AppText>
      );
    });
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.avatarAi}>
            <Ionicons name="sparkles" size={16} color="#10B981" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {!isUser && (
            <View style={styles.aiHeader}>
              <AppText style={styles.aiTitle}>{presentation.title}</AppText>
              <TouchableOpacity onPress={() => handleCopyText(item.text)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={14} color="#A7F3D0" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => speak(item.text)} style={styles.copyBtn} accessibilityLabel="Đọc câu trả lời">
                <Ionicons name="volume-high-outline" size={14} color="#A7F3D0" />
              </TouchableOpacity>
            </View>
          )}

          {renderFormattedText(item.text)}

          <AppText style={[styles.timestamp, isUser ? styles.userTime : styles.aiTime]}>
            {item.timestamp}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#ECFDF5" />
            </TouchableOpacity>
          )}
          <View style={styles.headerIconContainer}>
            <Ionicons name="sparkles" size={20} color="#10B981" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <AppText style={styles.headerTitle}>{presentation.title}</AppText>
              <View style={styles.badge}>
                <View style={styles.dot} />
                <AppText style={styles.badgeText}>Gemini 2.5</AppText>
              </View>
            </View>
            <AppText style={styles.headerSubtitle}>Trợ lý quản lý nhà trọ thông minh</AppText>
          </View>
        </View>

        <TouchableOpacity onPress={handleClearHistory} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#6EE7B7" />
        </TouchableOpacity>
      </View>

      {/* Quick Prompts Chips */}
      <View style={styles.promptContainer}>
        <FlatList
          horizontal
          data={QUICK_PROMPTS[role]}
          keyExtractor={(item, idx) => idx.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.promptChip}
              onPress={() => handleSend(item)}
              disabled={loading}
            >
              <Ionicons name="flash-outline" size={12} color="#A7F3D0" style={{ marginRight: 4 }} />
              <AppText style={styles.promptText}>{item}</AppText>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#10B981" size="small" />
              <AppText style={styles.loadingText}>TroHub AI đang suy nghĩ...</AppText>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <AppTextInput
          style={styles.input}
          placeholder="Hỏi TroHub AI bất kỳ điều gì..."
          placeholderTextColor="#6EE7B7"
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity onPress={() => void handleVoiceInput()} disabled={loading || listening} style={styles.sendBtn} accessibilityLabel="Nhập bằng giọng nói">
          <Ionicons name="mic-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputMessage.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!inputMessage.trim() || loading}
        >
          <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#022C22",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#064E3B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.2)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#042F2E",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ECFDF5",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#A7F3D0",
    opacity: 0.8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#34D399",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(6, 95, 70, 0.4)",
  },
  promptContainer: {
    paddingVertical: 10,
    backgroundColor: "#042F2E",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.15)",
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#065F46",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  promptText: {
    fontSize: 12,
    color: "#ECFDF5",
    fontWeight: "500",
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  avatarAi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#064E3B",
    borderWidth: 1,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#047857",
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: "#065F46",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.2)",
    paddingBottom: 4,
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
  },
  copyBtn: {
    padding: 2,
  },
  messageText: {
    fontSize: 14,
    color: "#ECFDF5",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#34D399",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  userTime: {
    color: "rgba(236, 253, 245, 0.7)",
  },
  aiTime: {
    color: "rgba(167, 243, 208, 0.6)",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#065F46",
    borderRadius: 14,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 12,
    color: "#A7F3D0",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#064E3B",
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 185, 129, 0.2)",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#042F2E",
    color: "#ECFDF5",
    fontSize: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
});
