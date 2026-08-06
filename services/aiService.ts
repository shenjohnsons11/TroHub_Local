import { apiClient } from "./apiClient";
import { authService } from "./authService";

export const aiService = {
  async chat(message: string): Promise<{ reply: string; action?: unknown }> {
    const token = await authService.getToken();
    return apiClient.post<{ success: boolean; reply: string; action?: unknown }>(
      "/ai/chat",
      { message },
      token
    );
  },
};
