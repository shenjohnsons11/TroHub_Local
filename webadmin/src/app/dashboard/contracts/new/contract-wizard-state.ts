import {
  defaultContractDates,
  validateContractDateRange,
} from "../../../../../../utils/contractDate";

export const CONTRACT_STEPS = [
  { id: 1, label: "Chọn phòng" },
  { id: 2, label: "Thông tin khách" },
  { id: 3, label: "Điện & nước" },
  { id: 4, label: "Ký & xác nhận" },
] as const;

export type ContractDraft = {
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  fixedRentPrice: string;
  fixedDeposit: string;
  initialElectricity: string;
  initialWater: string;
  services: Array<{ serviceId: string; fixedPrice: string }>;
};

export const EMPTY_CONTRACT_DRAFT: ContractDraft = {
  roomId: "",
  tenantId: "",
  startDate: "",
  endDate: "",
  fixedRentPrice: "",
  fixedDeposit: "",
  initialElectricity: "",
  initialWater: "",
  services: [],
};

export function createContractDraft(now = new Date()): ContractDraft {
  return {
    ...EMPTY_CONTRACT_DRAFT,
    ...defaultContractDates(now),
    services: [],
  };
}

export const buildContractDraftKey = (adminId: string) =>
  `trohub:contract-draft:${adminId}`;

export function validateContractStep(step: number, draft: ContractDraft) {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.roomId) errors.roomId = "Vui lòng chọn Phòng.";
    if (!draft.tenantId) errors.tenantId = "Vui lòng chọn Người thuê.";
  }
  if (step === 2) {
    Object.assign(
      errors,
      validateContractDateRange(draft.startDate, draft.endDate),
    );
    if (!(Number(draft.fixedRentPrice) > 0)) errors.fixedRentPrice = "Tiền thuê phải lớn hơn 0.";
    if (!(Number(draft.fixedDeposit) >= 0)) errors.fixedDeposit = "Tiền cọc không hợp lệ.";
  }
  return errors;
}
