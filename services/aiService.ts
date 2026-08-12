import { apiClient } from "./apiClient";
import { authService } from "./authService";

export type AIRole = "landlord" | "tenant";

export type AIPresentation = {
  title: string;
  greeting: string;
};

export type AIChatResponse = {
  success?: boolean;
  reply?: unknown;
  action?: unknown;
  role?: unknown;
  presentation?: unknown;
  denied?: unknown;
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
};
