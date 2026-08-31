import {
  defaultContractDates,
  validateContractDateRange,
} from "../../../../../../utils/contractDate";
import { formatNumberInput, unformatNumber } from "@/lib/formatters";

export const CONTRACT_STEPS = [
  { id: 1, label: "Chọn phòng" },
  { id: 2, label: "Thông tin khách" },
  { id: 3, label: "Điện & nước" },
  { id: 4, label: "Ký & xác nhận" },
] as const;

export type ContractDraft = {
  step?: number;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  fixedRentPrice: string;
  fixedDeposit: string;
  electricityPrice: string;
  waterPrice: string;
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
  electricityPrice: formatNumberInput(3500),
  waterPrice: formatNumberInput(15000),
  initialElectricity: "",
  initialWater: "",
  services: [],
};

export function createContractDraft(now = new Date()): ContractDraft {
  return {
    ...EMPTY_CONTRACT_DRAFT,
    ...defaultContractDates(now),
    electricityPrice: formatNumberInput(3500),
    waterPrice: formatNumberInput(15000),
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
    if (!(unformatNumber(draft.fixedRentPrice) > 0)) errors.fixedRentPrice = "Tiền thuê phải lớn hơn 0.";
    if (!(unformatNumber(draft.fixedDeposit) >= 0)) errors.fixedDeposit = "Tiền cọc không hợp lệ.";
  }
  if (step === 3) {
    if (draft.electricityPrice !== undefined && draft.electricityPrice !== "" && !(unformatNumber(draft.electricityPrice) >= 0)) {
      errors.electricityPrice = "Giá tiền điện không hợp lệ.";
    }
    if (draft.waterPrice !== undefined && draft.waterPrice !== "" && !(unformatNumber(draft.waterPrice) >= 0)) {
      errors.waterPrice = "Giá tiền nước không hợp lệ.";
    }
  }
  return errors;
}
