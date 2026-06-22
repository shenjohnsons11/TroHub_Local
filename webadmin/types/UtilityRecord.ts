export type UtilityRecord = {
  id: string;
  month: string;

  electricOld: number;
  electricNew: number;
  electricUsed: number;

  waterOld: number;
  waterNew: number;
  waterUsed: number;

  electricMoney: string;
  waterMoney: string;
};