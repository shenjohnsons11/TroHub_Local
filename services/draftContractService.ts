import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DraftContract {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  fixedRentPrice: string;
  fixedDeposit: string;
  initialElectricity: string;
  initialWater: string;
  electricityPrice?: string;
  waterPrice?: string;
  services?: {
    electricity: { enabled: boolean; price: string };
    water: { enabled: boolean; price: string };
    trash: { enabled: boolean; price: string };
    internet: { enabled: boolean; price: string };
    management: { enabled: boolean; price: string };
  };
  step: number;
  lastSaved: string;
}

const DRAFT_KEY = "@trohub_draft_contracts";

export const draftContractService = {
  getDrafts: async (): Promise<DraftContract[]> => {
    try {
      const data = await AsyncStorage.getItem(DRAFT_KEY);
      if (data) return JSON.parse(data);
      return [];
    } catch {
      return [];
    }
  },

  saveDraft: async (draft: Omit<DraftContract, "id" | "lastSaved"> & { id?: string }): Promise<string> => {
    try {
      const drafts = await draftContractService.getDrafts();
      const now = new Date().toISOString();
      const existingIndex = drafts.findIndex((item) => draft.id ? item.id === draft.id : item.roomId === draft.roomId);
      const id = existingIndex > -1 ? drafts[existingIndex].id : (draft.id || Math.random().toString(36).substring(2, 9));
      if (existingIndex > -1) {
        drafts[existingIndex] = { ...drafts[existingIndex], ...draft, id, lastSaved: now };
      } else {
        drafts.push({ ...draft, id, lastSaved: now } as DraftContract);
      }
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      return id;
    } catch (e) {
      console.error("Lỗi lưu nháp:", e);
      return draft.id || "";
    }
  },

  deleteDraft: async (id: string): Promise<void> => {
    try {
      let drafts = await draftContractService.getDrafts();
      drafts = drafts.filter((d) => d.id !== id);
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    } catch {}
  },
};
