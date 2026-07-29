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

  saveDraft: async (draft: Omit<DraftContract, "id" | "lastSaved"> & { id?: string }): Promise<void> => {
    try {
      const drafts = await draftContractService.getDrafts();
      const now = new Date().toISOString();
      if (draft.id) {
        const index = drafts.findIndex((d) => d.id === draft.id);
        if (index > -1) {
          drafts[index] = { ...drafts[index], ...draft, lastSaved: now };
        } else {
          drafts.push({ ...draft, id: draft.id, lastSaved: now } as DraftContract);
        }
      } else {
        drafts.push({ ...draft, id: Math.random().toString(36).substring(2, 9), lastSaved: now } as DraftContract);
      }
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error("Lỗi lưu nháp:", e);
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
