import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Clipboard, Alert } from "react-native";
import { AppText, AppTextInput } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { aiService, type AIPresentation, type AIRole, type AIChatAction, type AIChatResponse } from "../services/aiService";
import { useAppTheme } from "../contexts/ThemeContext";
import { UserProfile } from "../types/UserProfile";
import { useTranslation } from "../contexts/LanguageContext";

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
  profile?: UserProfile | null;
  onBack?: () => void;
  onAction?: (action: AIChatAction) => void;
}

function normalizeRole(value: unknown): AIRole | null {
  if (value === "landlord" || value === 1) return "landlord";
  if (value === "tenant" || value === 2) return "tenant";
  return null;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function sanitizeAIAction(action: unknown): AIChatAction | null {
  if (!action || typeof action !== "object") return null;
  const candidate = action as Record<string, unknown>;
  const type = candidate.type;

  if (type === "NAVIGATE_TAB" && typeof candidate.tab === "string" && candidate.tab.trim()) {
    return {
      type: "NAVIGATE_TAB",
      tab: candidate.tab.trim(),
      params: candidate.params && typeof candidate.params === "object" ? (candidate.params as Record<string, unknown>) : undefined,
    };
  }

  if (type === "CREATE_INVOICE" && typeof candidate.roomCode === "string" && candidate.roomCode.trim()) {
    const rawMonth = typeof candidate.month === "string" ? candidate.month.trim() : "";
    const validMonth = /^(0?[1-9]|1[0-2])\/\d{4}$/.test(rawMonth)
      ? rawMonth
      : `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

    return {
      type: "CREATE_INVOICE",
      roomCode: candidate.roomCode.trim(),
      month: validMonth,
      newElectricity: isNonNegativeNumber(candidate.newElectricity) ? candidate.newElectricity : undefined,
      newWater: isNonNegativeNumber(candidate.newWater) ? candidate.newWater : undefined,
    };
  }

  if (
    type === "FILL_UTILITY_READING" &&
    typeof candidate.roomCode === "string" &&
    candidate.roomCode.trim() &&
    isNonNegativeNumber(candidate.newElec) &&
    isNonNegativeNumber(candidate.newWater)
  ) {
    return {
      type: "FILL_UTILITY_READING",
      roomCode: candidate.roomCode.trim(),
      newElec: candidate.newElec,
      newWater: candidate.newWater,
    };
  }

  return null;
}

export default function AIChatScreen({ profile, onBack, onAction }: AIChatScreenProps) {
  const { theme } = useAppTheme();
  const { t, language } = useTranslation();
  const [role, setRole] = useState<AIRole>("landlord");
  const [presentation, setPresentation] = useState<AIPresentation>({
    title: t("ai.assistantTitle"),
    greeting: t("ai.greeting"),
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickPrompts: Record<AIRole, string[]> = {
    landlord: [
      t("dashboard.revenue"),
      t("invoices.sendReminder"),
      t("contracts.createContract"),
    ],
    tenant: [
      t("invoices.title"),
      t("repairs.title"),
      t("payments.title"),
    ],
  };

  useEffect(() => {
    let resolvedRole: AIRole = "landlord";
    if (profile?.role !== undefined) {
      const normalized = normalizeRole(profile.role);
      if (normalized) resolvedRole = normalized;
    }
    setRole(resolvedRole);

    setPresentation({
      title: t("ai.assistantTitle"),
      greeting: t("ai.greeting"),
    });

    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: t("ai.greeting"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [profile, t]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customMessage) setInputMessage("");
    setLoading(true);

    try {
      const data: AIChatResponse = await aiService.sendMessage(userMessage.text);
      
      const replyText = typeof data.reply === "string" ? data.reply : t("common.error");
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);

      const safeAction = sanitizeAIAction(data.action);
      if (safeAction) {
        onAction?.(safeAction);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: t("common.error"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(t("common.error"), "Speech recognition not available on this device.");
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert(t("common.error"), "Microphone permission required.");
        return;
      }
      if (listening) {
        ExpoSpeechRecognitionModule.stop();
        setListening(false);
      } else {
        setListening(true);
        ExpoSpeechRecognitionModule.start({
          lang: language === "en" ? "en-US" : "vi-VN",
          interimResults: false,
          maxAlternatives: 1,
        });
      }
    } catch (error: any) {
      setListening(false);
      Alert.alert(t("common.error"), error.message || t("common.error"));
    }
  };

  const speak = (text: string) => Speech.speak(text.replace(/\*\*/g, ""), { language: language === "en" ? "en-US" : "vi-VN" });

  const handleCopyText = (text: string) => {
    Clipboard.setString(text);
    Alert.alert(t("common.success"), "Copied to clipboard!");
  };

  const handleClearHistory = () => {
    Alert.alert(t("common.confirm"), "Clear conversation history?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          setMessages([
            {
              id: "welcome",
              sender: "ai",
              text: `${presentation.greeting}`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
              <TouchableOpacity onPress={() => speak(item.text)} style={styles.copyBtn} accessibilityLabel="Speak">
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
            <AppText style={styles.headerSubtitle}>{t("ai.assistantTitle")}</AppText>
          </View>
        </View>

        <TouchableOpacity onPress={handleClearHistory} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#6EE7B7" />
        </TouchableOpacity>
      </View>

      <View style={styles.promptContainer}>
        <FlatList
          horizontal
          data={quickPrompts[role]}
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
              <AppText style={styles.loadingText}>TroHub AI thinking...</AppText>
            </View>
          ) : null
        }
      />

      <View style={styles.inputBar}>
        <AppTextInput
          style={styles.input}
          placeholder={t("ai.placeholder")}
          placeholderTextColor="#6EE7B7"
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity onPress={() => void handleVoiceInput()} disabled={loading || listening} style={styles.sendBtn} accessibilityLabel="Voice">
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
    color: "#A7F3D0",
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(4, 47, 46, 0.6)",
  },
  promptContainer: {
    paddingVertical: 8,
    backgroundColor: "#064E3B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.15)",
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(4, 47, 46, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  promptText: {
    color: "#ECFDF5",
    fontSize: 12,
    fontWeight: "500",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
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
    borderRadius: 10,
    backgroundColor: "#042F2E",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#059669",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#064E3B",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.15)",
    paddingBottom: 4,
  },
  aiTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6EE7B7",
    flex: 1,
  },
  copyBtn: {
    padding: 2,
    marginLeft: 6,
  },
  messageText: {
    color: "#ECFDF5",
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#34D399",
  },
  timestamp: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTime: {
    color: "#A7F3D0",
  },
  aiTime: {
    color: "#6EE7B7",
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    alignSelf: "flex-start",
    marginLeft: 36,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  loadingText: {
    color: "#A7F3D0",
    fontSize: 12,
    fontStyle: "italic",
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
    backgroundColor: "#022C22",
    color: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#042F2E",
    opacity: 0.5,
  },
});
