import { apiClient } from "./apiClient";
import { authService } from "./authService";

export type Invite = {
  id: string;
  landlordName: string;
  phone: string;
};

type InviteListResponse = {
  success: boolean;
  data: Invite[];
  message?: string;
};

type InviteActionResponse = {
  success: boolean;
  message?: string;
};

export const inviteService = {
  async getInvites(): Promise<Invite[]> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const data = await apiClient.get<InviteListResponse>(
        "/me/invites",
        token,
      );

      if (!data.success) {
        throw new Error(data.message || "Không thể tải lời mời");
      }

      return data.data ?? [];
    } catch (error) {
      console.log("Error getting invites", error);
      return [];
    }
  },

  async acceptInvite(landlordId: string): Promise<boolean> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const data = await apiClient.put<InviteActionResponse>(
        `/me/invites/${landlordId}/accept`,
        undefined,
        token,
      );

      return data.success;
    } catch (error) {
      console.log("Error accepting invite", error);
      return false;
    }
  },

  async rejectInvite(landlordId: string): Promise<boolean> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Chưa đăng nhập");
      }

      const data = await apiClient.put<InviteActionResponse>(
        `/me/invites/${landlordId}/reject`,
        undefined,
        token,
      );

      return data.success;
    } catch (error) {
      console.log("Error rejecting invite", error);
      return false;
    }
  },
};