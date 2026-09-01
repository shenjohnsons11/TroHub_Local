import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { useAppTheme } from "../contexts/ThemeContext";
import { UserProfile } from "../types/UserProfile";
import {
  aiService,
  type AIChatAction,
  type AIChatResponse,
  type AIRole,
} from "../services/aiService";
import BotIcon from "./BotIcon";

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
  action?: AIChatAction | null;
}

type Props = {
  visible: boolean;
  profile?: UserProfile | null;
  onClose: () => void;
  onNavigate?: (tab: string, params?: any) => void;
};

const LANDLORD_SUGGESTIONS = [
  "📊 Thống kê phòng trống hiện tại",
  "💰 Tổng doanh thu & công nợ",
  "📝 Tạo hợp đồng phòng A101",
  "⚡ Chốt số điện nước phòng 101",
  "🧾 Lập hóa đơn tiền trọ tháng này",
  "📷 Quét camera đồng hồ điện nước",
  "🪪 Quét CCCD khách thuê",
  "✉️ Soạn tin nhắn nhắc nợ lịch sự",
];

const TENANT_SUGGESTIONS = [
  "🧾 Xem hóa đơn của tôi",
  "📄 Xem hợp đồng thuê phòng",
  "🔧 Báo sửa chữa vòi nước bị rò",
  "⚡ Tra cứu chỉ số điện nước",
  "💳 Hướng dẫn thanh toán VietQR",
];

export default function AIAssistantModal({
  visible,
  profile,
  onClose,
  onNavigate,
}: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";
  const isLandlord = profile?.role === 1;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const pulseDotAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the Gemini 3.5 Flash dot in header
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDotAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseDotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseDotAnim]);

  // Initial greeting
  useEffect(() => {
    if (visible && messages.length === 0) {
      const greeting: Message = {
        id: "greet_1",
        sender: "ai",
        text: isLandlord
          ? `Xin chào Chủ trọ ${profile?.fullName || "Quản trị viên"}! Tôi là TroHub AI Co-pilot. Tôi có thể giúp bạn kiểm tra doanh thu, tra cứu phòng trống, soạn tin nhắn nhắc nợ hoặc tự động mở và điền biểu mẫu nhanh.`
          : `Xin chào Cư dân ${profile?.fullName || ""}! Tôi là TroHub AI Co-pilot. Bạn cần tra cứu hóa đơn, xem hợp đồng hay gửi báo sửa chữa gì không?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([greeting]);
    }
  }, [visible, isLandlord, profile]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res: AIChatResponse = await aiService.sendMessage(query);

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: res.reply || "Tôi đã nhận được yêu cầu của bạn.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: res.action,
      };

      setMessages((prev) => [...prev, aiMsg]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: err.message || "Xin lỗi, đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
    Speech.stop();
    setIsSpeakingId(null);
  };

  const handleSpeak = (msg: Message) => {
    if (isSpeakingId === msg.id) {
      Speech.stop();
      setIsSpeakingId(null);
      return;
    }

    Speech.stop();
    setIsSpeakingId(msg.id);
    Speech.speak(msg.text, {
      language: "vi-VN",
      rate: 1.0,
      onDone: () => setIsSpeakingId(null),
      onError: () => setIsSpeakingId(null),
    });
  };

  const handleToggleVoice = async () => {
    if (listening) {
      if (ExpoSpeechRecognitionModule?.stop) {
        ExpoSpeechRecognitionModule.stop();
      }
      setListening(false);
      return;
    }

    if (!ExpoSpeechRecognitionModule) {
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: "vi-VN",
        interimResults: true,
        onResult: (event: any) => {
          const text = event.results?.[0]?.transcript || "";
          if (text) setInputText(text);
        },
        onEnd: () => setListening(false),
        onError: () => setListening(false),
      });
    } catch {
      setListening(false);
    }
  };

  const handleExecuteAction = (action: any) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();

    const targetTab = action.target || action.tab || "home";
    const params = {
      ...(action.params || {}),
      ...(action.type === "FILL_CONTRACT_FORM"
        ? { action: "create", roomCode: action.roomCode, tenantName: action.tenantName, rentPrice: action.rentPrice, startDate: action.startDate }
        : {}),
      ...(action.type === "FILL_UTILITY_READING"
        ? { action: "record", roomCode: action.roomCode, newElec: action.newElec, newWater: action.newWater }
        : {}),
      ...(action.type === "CREATE_INVOICE"
        ? { action: "create", roomCode: action.roomCode, month: action.month }
        : {}),
      ...(action.type === "CREATE_REPAIR_REQUEST"
        ? { action: "create", title: action.title }
        : {}),
    };

    onNavigate?.(targetTab, params);
  };

  const suggestions = isLandlord ? LANDLORD_SUGGESTIONS : TENANT_SUGGESTIONS;

  // Colors based on Dark / Light Mode
  const bgMain = isDark ? "#020B0A" : theme.background;
  const bgHeader = isDark ? "#041713" : theme.surface;
  const borderHeader = isDark ? "#083329" : theme.border;
  const bgAIBubble = isDark ? "#082922" : theme.surfaceElevated;
  const borderAIBubble = isDark ? "rgba(52, 211, 153, 0.25)" : "rgba(5, 150, 105, 0.18)";
  const textAICopy = isDark ? "#E6FAF2" : theme.text;
  const bgChip = isDark ? "#06221C" : theme.surfaceElevated;
  const borderChip = isDark ? "rgba(52, 211, 153, 0.25)" : theme.border;
  const textChip = isDark ? "#A7F3D0" : theme.text;
  const bgInputBar = isDark ? "#041713" : theme.surface;
  const bgInputBox = isDark ? "#082B23" : theme.background;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgMain }]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Header - Perfectly Matched to Web (Images 4 & 5) */}
          <View style={[styles.header, { backgroundColor: bgHeader, borderBottomColor: borderHeader }]}>
            <View style={styles.headerLeft}>
              {/* Squircle Avatar with Robot Icon */}
              <LinearGradient
                colors={["#10B981", "#0D9488"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradientBorder}
              >
                <View style={[styles.avatarInner, { backgroundColor: isDark ? "#031410" : "#064E3B" }]}>
                  <BotIcon size={20} color="#34D399" />
                </View>
              </LinearGradient>

              {/* Title & Gemini 3.5 Flash Badge */}
              <View>
                <View style={styles.titleRow}>
                  <AppText style={[styles.headerTitle, { color: isDark ? "#ECFDF5" : theme.text }]}>
                    TroHub AI Co-pilot
                  </AppText>

                  {/* Gemini 3.5 Flash Model Badge */}
                  <View
                    style={[
                      styles.modelBadge,
                      {
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.12)",
                        borderColor: isDark ? "rgba(52, 211, 153, 0.35)" : "rgba(5, 150, 105, 0.3)",
                      },
                    ]}
                  >
                    <Animated.View style={[styles.modelPulseDot, { opacity: pulseDotAnim }]} />
                    <AppText style={[styles.modelBadgeText, { color: isDark ? "#34D399" : "#059669" }]}>
                      Gemini 3.5 Flash
                    </AppText>
                  </View>
                </View>

                <AppText style={[styles.headerSubtitle, { color: isDark ? "rgba(110, 231, 183, 0.7)" : theme.muted }]}>
                  {isLandlord ? "Hỗ trợ Quản trị viên" : "Hỗ trợ Cư dân"}
                </AppText>
              </View>
            </View>

            <View style={styles.headerRight}>
              {messages.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa lịch sử trò chuyện"
                  onPress={handleClearChat}
                  style={[styles.iconButton, { backgroundColor: isDark ? "#082B23" : theme.surfaceElevated }]}
                >
                  <Ionicons name="trash-outline" size={17} color={isDark ? "#A7F3D0" : theme.muted} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={onClose}
                style={[styles.iconButton, { backgroundColor: isDark ? "#082B23" : theme.surfaceElevated }]}
              >
                <Ionicons name="close" size={19} color={isDark ? "#ECFDF5" : theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Quick Prompts Suggestions */}
          <View style={[styles.suggestionsContainer, { borderBottomColor: borderHeader }]}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.suggestionsList}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleSend(item)}
                  style={[styles.suggestionChip, { backgroundColor: bgChip, borderColor: borderChip }]}
                >
                  <AppText style={[styles.suggestionText, { color: textChip }]}>{item}</AppText>
                </Pressable>
              )}
            />
          </View>

          {/* Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isUser = item.sender === "user";
              const isSpeaking = isSpeakingId === item.id;

              return (
                <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
                  {!isUser && (
                    <View
                      style={[
                        styles.avatarMini,
                        {
                          backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.12)",
                          borderColor: isDark ? "rgba(52, 211, 153, 0.35)" : "rgba(5, 150, 105, 0.25)",
                        },
                      ]}
                    >
                      <BotIcon size={15} color={isDark ? "#34D399" : "#059669"} />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: "#059669" }]
                        : [styles.aiBubble, { backgroundColor: bgAIBubble, borderColor: borderAIBubble }],
                    ]}
                  >
                    <AppText
                      style={[
                        styles.messageText,
                        { color: isUser ? "#FFFFFF" : textAICopy },
                      ]}
                      selectable
                    >
                      {item.text}
                    </AppText>

                    {/* Action Card Button with Auto-Navigate Countdown */}
                    {!isUser && item.action && (
                      <AutoNavigateActionCard
                        action={item.action}
                        theme={theme}
                        isDark={isDark}
                        onExecute={() => handleExecuteAction(item.action!)}
                      />
                    )}

                    <View style={styles.bubbleFooter}>
                      <AppText
                        style={[
                          styles.timestamp,
                          { color: isUser ? "rgba(255,255,255,0.7)" : isDark ? "rgba(52, 211, 153, 0.6)" : theme.muted },
                        ]}
                      >
                        {item.timestamp}
                      </AppText>
                      {!isUser && (
                        <Pressable
                          hitSlop={8}
                          onPress={() => handleSpeak(item)}
                          style={styles.speakButton}
                        >
                          <Ionicons
                            name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                            size={15}
                            color={isSpeaking ? (isDark ? "#34D399" : theme.primary) : (isDark ? "#6EE7B7" : theme.muted)}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingRow}>
                  <View
                    style={[
                      styles.avatarMini,
                      {
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.12)",
                        borderColor: isDark ? "rgba(52, 211, 153, 0.35)" : "rgba(5, 150, 105, 0.25)",
                      },
                    ]}
                  >
                    <BotIcon size={15} color={isDark ? "#34D399" : "#059669"} />
                  </View>
                  <View style={[styles.loadingBubble, { backgroundColor: bgAIBubble, borderColor: borderAIBubble }]}>
                    <ActivityIndicator size="small" color={isDark ? "#34D399" : theme.primary} />
                    <AppText style={[styles.loadingText, { color: isDark ? "#A7F3D0" : theme.muted }]}>
                      TroHub AI đang xử lý...
                    </AppText>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Input Bar */}
          <View style={[styles.inputContainer, { borderTopColor: borderHeader, backgroundColor: bgInputBar }]}>
            {ExpoSpeechRecognitionModule && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={listening ? "Dừng ghi âm" : "Ghi âm giọng nói"}
                onPress={handleToggleVoice}
                style={[
                  styles.voiceButton,
                  listening && { backgroundColor: theme.danger },
                ]}
              >
                <Ionicons
                  name={listening ? "mic" : "mic-outline"}
                  size={20}
                  color={listening ? "#FFFFFF" : isDark ? "#A7F3D0" : theme.text}
                />
              </Pressable>
            )}

            <AppTextInput
              style={[
                styles.input,
                {
                  backgroundColor: bgInputBox,
                  borderColor: borderHeader,
                  color: isDark ? "#ECFDF5" : theme.text,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập câu hỏi hoặc yêu cầu cho AI..."
              placeholderTextColor={isDark ? "rgba(110, 231, 183, 0.45)" : theme.muted}
              multiline
              maxLength={500}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi tin nhắn"
              disabled={!inputText.trim() || loading}
              onPress={() => void handleSend()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() && !loading ? "#059669" : (isDark ? "#082B23" : theme.border),
                },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={inputText.trim() && !loading ? "#FFFFFF" : (isDark ? "rgba(110, 231, 183, 0.4)" : theme.muted)}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function AutoNavigateActionCard({
  action,
  theme,
  isDark,
  onExecute,
}: {
  action: any;
  theme: any;
  isDark: boolean;
  onExecute: () => void;
}) {
  const [countdown, setCountdown] = useState<number>(1.5);
  const [isCancelled, setIsCancelled] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCancelled || action.autoNavigate === false) return;

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = Math.max(0, +(prev - 0.5).toFixed(1));
        return next;
      });
    }, 500);

    const timer = setTimeout(() => {
      onExecute();
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isCancelled]);

  const handleCancel = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCancelled(true);
    progressAnim.stopAnimation();
  };

  const getActionTitle = () => {
    if (action.label) return action.label;
    if (action.type === "NAVIGATE_TAB") return `Mở ${action.target || action.tab}`;
    if (action.type === "FILL_CONTRACT_FORM") return `Tạo HĐ phòng ${action.roomCode || ""}`;
    if (action.type === "FILL_UTILITY_READING") return `Chốt điện nước phòng ${action.roomCode || ""}`;
    if (action.type === "CREATE_INVOICE") return `Lập hóa đơn phòng ${action.roomCode || ""}`;
    if (action.type === "CREATE_REPAIR_REQUEST") return "Gửi yêu cầu sửa chữa";
    return "Thực thi hành động";
  };

  return (
    <View
      style={[
        styles.actionCardContainer,
        {
          borderColor: isDark ? "rgba(52, 211, 153, 0.4)" : theme.primary,
          backgroundColor: isDark ? "#041C16" : theme.surfaceElevated,
        },
      ]}
    >
      {!isCancelled && action.autoNavigate !== false && (
        <View style={[styles.countdownTrack, { backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)" }]}>
          <Animated.View
            style={[
              styles.countdownBar,
              {
                backgroundColor: isDark ? "#34D399" : theme.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}

      <View style={styles.actionCardContent}>
        <View style={[styles.actionIconBox, { backgroundColor: isDark ? "rgba(52, 211, 153, 0.2)" : theme.primarySoft }]}>
          <Ionicons name="compass" size={18} color={isDark ? "#34D399" : theme.primary} />
        </View>

        <View style={styles.actionDetails}>
          <AppText style={[styles.actionCardTitle, { color: isDark ? "#ECFDF5" : theme.text }]}>
            {getActionTitle()}
          </AppText>
          <AppText
            style={[
              styles.actionCardSubtitle,
              { color: isCancelled ? (isDark ? "rgba(110, 231, 183, 0.6)" : theme.muted) : (isDark ? "#34D399" : theme.primary) },
            ]}
          >
            {isCancelled
              ? "Đã dừng tự chuyển trang"
              : `Tự động chuyển trang sau ${countdown}s...`}
          </AppText>
        </View>
      </View>

      <View style={[styles.actionCardButtons, { borderTopColor: isDark ? "rgba(52, 211, 153, 0.15)" : theme.border }]}>
        {!isCancelled && action.autoNavigate !== false && (
          <Pressable
            accessibilityRole="button"
            onPress={handleCancel}
            style={[styles.actionCancelBtn, { borderColor: isDark ? "rgba(52, 211, 153, 0.25)" : theme.border }]}
          >
            <AppText style={[styles.actionCancelText, { color: isDark ? "rgba(110, 231, 183, 0.7)" : theme.muted }]}>
              Hủy
            </AppText>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onExecute();
          }}
          style={[styles.actionGoBtn, { backgroundColor: "#059669" }]}
        >
          <AppText style={styles.actionGoText}>Đi tới ngay</AppText>
          <Ionicons name="arrow-forward" size={13} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarGradientBorder: {
    width: 40,
    height: 40,
    borderRadius: 14,
    padding: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12.5,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: "900" },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  modelPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#34D399",
  },
  modelBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  headerSubtitle: { fontSize: 11, marginTop: 1, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsContainer: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionsList: { paddingHorizontal: 16, gap: 8 },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 12, fontWeight: "700" },
  messageList: { padding: 16, paddingBottom: 24, gap: 14 },
  messageRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bubble: {
    maxWidth: "84%",
    padding: 13,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  timestamp: { fontSize: 10, fontWeight: "600" },
  speakButton: { padding: 2 },
  actionCardContainer: {
    borderRadius: 14,
    borderWidth: 1.2,
    marginTop: 10,
    overflow: "hidden",
  },
  countdownTrack: {
    height: 3,
    width: "100%",
  },
  countdownBar: {
    height: 3,
  },
  actionCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingBottom: 8,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDetails: { flex: 1 },
  actionCardTitle: { fontSize: 13, fontWeight: "800" },
  actionCardSubtitle: { fontSize: 11, marginTop: 2, fontWeight: "700" },
  actionCardButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionCancelText: { fontSize: 11, fontWeight: "700" },
  actionGoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionGoText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingText: { fontSize: 12, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
