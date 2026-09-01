"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  Minimize2,
  Maximize2,
  Mic,
  Volume2,
  Square,
  Compass,
  ArrowRight,
} from "lucide-react";
import { dispatchAIAction, isAIAction } from "@/lib/ai-actions";
import { safeJsonParse, type WebAdminUser } from "@/lib/client-storage";
import { useLanguage } from "@/components/language-provider";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  action?: any;
}

type AIRole = "landlord" | "tenant";

type AIPresentation = {
  title: string;
  greeting: string;
};

type AIChatResponse = {
  reply?: unknown;
  action?: unknown;
  role?: unknown;
  presentation?: unknown;
  denied?: unknown;
};

const TAB_TO_ROUTE: Record<string, string> = {
  home: "/dashboard",
  rooms: "/dashboard/rooms",
  contract: "/dashboard/contracts",
  contracts: "/dashboard/contracts",
  invoice: "/dashboard/invoices",
  invoices: "/dashboard/invoices",
  invoice_bulk: "/dashboard/invoices",
  utility: "/dashboard/utilities",
  utilities: "/dashboard/utilities",
  tenants: "/dashboard/tenants",
  repair: "/dashboard/repairs",
  repairs: "/dashboard/repairs",
  services: "/dashboard/services",
  settings: "/dashboard/settings",
};

export default function AIChatWidget() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [role, setRole] = useState<AIRole | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const presentation: AIPresentation = {
    title: t("ai.assistantTitle"),
    greeting: t("ai.greeting"),
  };

  const quickPrompts = [
    t("dashboard.revenue"),
    t("invoices.sendReminder"),
    t("contracts.createContract"),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const storedUser = safeJsonParse<WebAdminUser | null>(
      localStorage.getItem("trohub_user"),
      null
    );
    if (storedUser) {
      setRole(storedUser.role === 1 ? "landlord" : "tenant");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "en" ? "en-US" : "vi-VN";
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInputMessage((prev) => `${prev} ${transcript}`.trim());
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    speechRecognitionRef.current = recognition;
  }, [language]);

  const handleVoiceInput = () => {
    if (!speechRecognitionRef.current) return;
    if (listening) {
      speechRecognitionRef.current.stop();
      setListening(false);
    } else {
      setListening(true);
      speechRecognitionRef.current.start();
    }
  };

  const handleSpeak = (text: string, id: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : "vi-VN";
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    speechUtteranceRef.current = utterance;
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleExecuteAction = (action: any) => {
    if (!action) return;
    dispatchAIAction(action);
    const targetKey = String(action.target || action.tab || (action.type === "FILL_CONTRACT_FORM" ? "contract" : action.type === "FILL_UTILITY_READING" ? "utility" : action.type === "CREATE_INVOICE" ? "invoice" : "home")).toLowerCase();
    const route = TAB_TO_ROUTE[targetKey] || "/dashboard";
    router.push(route);
  };

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
      const response = await fetchAPI("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage.text }),
      });

      const replyText = typeof response?.reply === "string" && response.reply.trim()
        ? response.reply
        : (typeof response?.data?.reply === "string" && response.data.reply.trim()
            ? response.data.reply
            : (t("ai.systemError") || t("common.error")));

      const action = response?.action || response?.data?.action;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (isAIAction(action)) {
        dispatchAIAction(action);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: err?.message || t("ai.systemError") || t("common.error"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-3 rounded-full shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all duration-300 transform hover:scale-105 active:scale-95 group border border-emerald-400/30 backdrop-blur-md"
          title={t("ai.assistantTitle")}
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-100 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="font-medium text-sm text-emerald-50 hidden sm:inline">{t("ai.assistantTitle")} 🤖</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/80 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-[64px]" : "h-[600px] max-h-[85vh]"
          }`}
        >
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-emerald-100">{presentation.title}</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gemini 3.5 Flash
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/70">{t("ai.assistantTitle")}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearHistory}
                className="p-1.5 hover:bg-emerald-900/40 hover:text-emerald-300 rounded-lg transition"
                title={t("common.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-emerald-900/40 hover:text-emerald-300 rounded-lg transition"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-red-950/40 hover:text-red-400 rounded-lg transition"
                title={t("common.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950/50 to-slate-900/50">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="bg-slate-900/90 border border-emerald-500/20 text-emerald-50 text-xs sm:text-sm p-3.5 rounded-2xl rounded-tl-none shadow-sm leading-relaxed max-w-[85%]">
                    {presentation.greeting}
                  </div>
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {msg.sender === "ai" && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    <div
                      className={`relative group text-xs sm:text-sm p-3.5 rounded-2xl leading-relaxed max-w-[85%] ${
                        msg.sender === "user"
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none shadow-md shadow-emerald-950/30"
                          : "bg-slate-900/90 border border-emerald-500/20 text-emerald-50 rounded-tl-none shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {msg.sender === "ai" && msg.action && (
                        <AutoNavigateActionCard
                          action={msg.action}
                          onExecute={() => handleExecuteAction(msg.action)}
                        />
                      )}
                      {msg.sender === "ai" && (
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-950/80 rounded-md p-1 border border-emerald-500/20">
                          <button
                            onClick={() => handleSpeak(msg.text, msg.id)}
                            className="text-emerald-400 hover:text-emerald-200"
                            title="Speak"
                          >
                            {speakingMessageId === msg.id ? <Square className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="text-emerald-400 hover:text-emerald-200"
                            title={t("common.edit")}
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                      <div
                        className={`text-[10px] mt-1.5 text-right ${
                          msg.sender === "user" ? "text-emerald-200/70" : "text-emerald-400/50"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start">
                    <div className="bg-slate-900/90 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                      <Bot className="w-4 h-4 animate-bounce text-emerald-400" />
                      <span className="text-xs">TroHub AI thinking...</span>
                      <div className="flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping delay-150" />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping delay-300" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-slate-950/80 px-3 py-2 border-t border-emerald-500/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-emerald-400/70 font-medium whitespace-nowrap flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Suggestions:
                </span>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="whitespace-nowrap px-2.5 py-1 text-[11px] bg-emerald-950/60 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-500/30 rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-slate-950 border-t border-emerald-500/20 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("ai.placeholder")}
                  disabled={loading}
                  className="flex-1 bg-slate-900/90 text-emerald-50 placeholder-emerald-500/50 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-emerald-500/20 focus:outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/50 transition disabled:opacity-50"
                />
                <button type="button" onClick={handleVoiceInput} disabled={loading || listening} aria-label="Voice" aria-pressed={listening} className="p-2.5 text-emerald-200 hover:bg-emerald-900/40 rounded-xl disabled:opacity-40" title="Voice">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  aria-label={t("common.send")}
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  title={t("common.send")}
                >
                  <Send className="w-4 h-4 text-emerald-100" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

function AutoNavigateActionCard({
  action,
  onExecute,
}: {
  action: any;
  onExecute: () => void;
}) {
  const [countdown, setCountdown] = useState(1.5);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (isCancelled || action.autoNavigate === false) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, +(prev - 0.5).toFixed(1)));
    }, 500);

    const timer = setTimeout(() => {
      onExecute();
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isCancelled]);

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
    <div className="mt-2.5 overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950/80 shadow-md">
      {!isCancelled && action.autoNavigate !== false && (
        <div className="h-1 w-full bg-slate-800">
          <div className="h-1 bg-emerald-400 transition-all duration-[1500ms] ease-linear w-full animate-[progress_1.5s_linear_forwards]" />
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <Compass className="size-5" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-bold text-emerald-100">{getActionTitle()}</p>
          <p className={`text-[11px] ${isCancelled ? "text-slate-400" : "text-emerald-400 font-semibold"}`}>
            {isCancelled ? "Đã dừng tự chuyển trang" : `Tự động chuyển trang sau ${countdown}s...`}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-emerald-500/20 bg-slate-900/60 px-3 py-2">
        {!isCancelled && action.autoNavigate !== false && (
          <button
            type="button"
            onClick={() => setIsCancelled(true)}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Hủy
          </button>
        )}
        <button
          type="button"
          onClick={onExecute}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition"
        >
          <span>Đi tới ngay</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
