export type ContractStatus = "pending" | "active" | "expired" | "cancelled" | "awaiting_approval" | "requesting_termination";

export type Contract = {
  id: string;
  room: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentFee: string;
  deposit: string;
  status: ContractStatus;
  rawStatus: number; // 0: Chờ ký, 1: Hiệu lực, 2: Hết hạn, 3: Hủy, 4: Chờ chủ duyệt
  usedMonths: number;
  remainingMonths: number;
  progressPercent: string;
  serviceFees: {
    electric: string;
    water: string;
    parking: string;
    internet: string;
  };
  note: string;
};