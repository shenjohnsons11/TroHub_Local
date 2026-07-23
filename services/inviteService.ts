import { apiClient } from "./apiClient";

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
      const data = await apiClient.get<InviteListResponse>("/me/invites");
      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.log("Error getting invites", error);
      return [];
    }
  },

  async acceptInvite(landlordId: string): Promise<boolean> {
    try {
      const data = await apiClient.put<InviteActionResponse>(`/me/invites/${landlordId}/accept`);
      return data.success;
    } catch (error) {
      console.log("Error accepting invite", error);
      return false;
    }
  },

  async rejectInvite(landlordId: string): Promise<boolean> {
    try {
      const data = await apiClient.put<InviteActionResponse>(`/me/invites/${landlordId}/reject`);
      return data.success;
    } catch (error) {
      console.log("Error rejecting invite", error);
      return false;
    }
  }
};
