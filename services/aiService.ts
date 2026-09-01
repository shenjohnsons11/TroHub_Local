import { apiClient } from "./apiClient";
import { authService } from "./authService";

export type AIRole = "landlord" | "tenant";

export type AIPresentation = {
  title: string;
  greeting: string;
};

export type AIChatAction = {
  type: "FILL_CONTRACT_FORM" | "FILL_UTILITY_READING";
  requiresConfirmation?: boolean;
  [key: string]: unknown;
};

export type AIChatResponse = {
  success?: boolean;
  reply: string;
  action: AIChatAction | null;
  role: AIRole;
  presentation: AIPresentation;
  denied?: boolean;
  timestamp?: string;
};

export const aiService = {
  async chat(message: string): Promise<AIChatResponse> {
    const token = await authService.getToken();
    return apiClient.post<AIChatResponse>(
      "/ai/chat",
      { message },
      token
    );
  },
  async sendMessage(message: string): Promise<AIChatResponse> {
    return this.chat(message);
  },
  async chatWithAI(message: string, _role?: string): Promise<AIChatResponse> {
    return this.chat(message);
  },
};

