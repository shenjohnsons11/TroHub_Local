"use client";

import React, { useState, useRef, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  MessageSquare,
  ChevronDown,
  Minimize2,
  Maximize2,
  Mic,
  Volume2,
  Square,
} from "lucide-react";
import { dispatchAIAction } from "@/lib/ai-actions";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Thống kê doanh thu tháng này",
  "Soạn tin nhắn nhắc nợ",
  "Hướng dẫn tạo hợp đồng mới",
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Xin chào! Tôi là **Trợ lý TroHub AI** (powered by Gemini 2.5 Flash). Tôi có thể giúp gì cho bạn hôm nay?",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const data = await fetchAPI("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: query }),
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply || "Xin lỗi, tôi không thể phản hồi câu hỏi này lúc này.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (dispatchAIAction(data.action)) {
        window.location.assign(data.action.type === "FILL_CONTRACT_FORM" ? "/dashboard/contracts/new" : "/dashboard/utilities");
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `⚠️ **Lỗi kết nối:** ${err.message || "Không thể phản hồi. Vui lòng thử lại sau."}`,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Xin chào! Tôi là **Trợ lý TroHub AI**. Lịch sử trò chuyện đã được làm sạch. Bạn cần hỗ trợ thêm gì?",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleVoiceInput = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "ai", text: "⚠️ Trình duyệt này chưa hỗ trợ nhập giọng nói.", timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => setInputMessage((value) => `${value}${value ? " " : ""}${event.results[0][0].transcript}`);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  const toggleSpeech = (message: Message) => {
    if (speakingId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text.replace(/\*\*/g, ""));
    utterance.lang = "vi-VN";
    utterance.onend = () => setSpeakingId(null);
    setSpeakingId(message.id);
    window.speechSynthesis.speak(utterance);
  };

  // Helper render formatted markdown line breaks & bold
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Bold parser **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-emerald-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <React.Fragment key={idx}>
          {renderedParts}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-4 py-3.5 rounded-full shadow-2xl shadow-emerald-900/50 border border-emerald-400/30 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Mở Trợ lý TroHub AI"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-100 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="font-medium text-sm text-emerald-50 hidden sm:inline">Trợ lý AI 🤖</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/80 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-[64px]" : "h-[600px] max-h-[85vh]"
          }`}
        >
          {/* Top Bar Header */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-emerald-100">TroHub AI Assistant</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gemini 2.5
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/70">Trợ lý thông minh quản lý nhà trọ</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearHistory}
                className="p-1.5 hover:bg-emerald-900/40 hover:text-emerald-300 rounded-lg transition"
                title="Xóa lịch sử trò chuyện"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-emerald-900/40 hover:text-emerald-300 rounded-lg transition"
                title={isMinimized ? "Phóng to" : "Thu nhỏ"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-red-950/40 hover:text-red-400 rounded-lg transition"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm bg-gradient-to-b from-slate-950 via-emerald-950/30 to-slate-950 scrollbar-thin scrollbar-thumb-emerald-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`group relative max-w-[85%] p-3.5 rounded-2xl shadow-md ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-none"
                          : "bg-slate-900/90 text-emerald-100 border border-emerald-500/20 rounded-bl-none shadow-emerald-950/30"
                      }`}
                    >
                      {msg.sender === "ai" && (
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-emerald-500/10">
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            TroHub AI
                          </span>
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="opacity-60 hover:opacity-100 text-emerald-300 hover:text-emerald-100 transition p-1"
                            title="Sao chép câu trả lời"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button onClick={() => toggleSpeech(msg)} className="opacity-60 hover:opacity-100 text-emerald-300 hover:text-emerald-100 transition p-1" title={speakingId === msg.id ? "Dừng đọc" : "Đọc câu trả lời"}>
                            {speakingId === msg.id ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      <div className="leading-relaxed text-emerald-50 whitespace-pre-wrap">
                        {renderFormattedText(msg.text)}
                      </div>

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
                      <span className="text-xs">TroHub AI đang suy nghĩ...</span>
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

              {/* Quick Suggestions Chips */}
              <div className="bg-slate-950/80 px-3 py-2 border-t border-emerald-500/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-emerald-400/70 font-medium whitespace-nowrap flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Gợi ý:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
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

              {/* Input Area */}
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
                  placeholder="Hỏi TroHub AI bất cứ điều gì..."
                  disabled={loading}
                  className="flex-1 bg-slate-900/90 text-emerald-50 placeholder-emerald-500/50 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-emerald-500/20 focus:outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/50 transition disabled:opacity-50"
                />
                <button type="button" onClick={handleVoiceInput} disabled={loading || listening} aria-pressed={listening} className="p-2.5 text-emerald-200 hover:bg-emerald-900/40 rounded-xl disabled:opacity-40" title="Nhập bằng giọng nói">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  title="Gửi câu hỏi"
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
