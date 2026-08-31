export type ContractStatus = "pending" | "active" | "reserved" | "expired" | "terminated" | "cancelled" | "awaiting_approval" | "requesting_termination";

export type Contract = {
  id: string;
  roomId?: string;
  room: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentFee: string;
  deposit: string;
  depositPayment?: {
    required: boolean;
    invoiceId: string | null;
    amount: number;
    status: "not_required" | "unpaid" | "paid";
  };
  status: ContractStatus;
  rawStatus: number; // 0: Nháp, 1: Hiệu lực, 2: Hết hạn, 3: Thanh lý, 4: Đã cọc/chờ bàn giao, 5: Chờ khách ký
  isAdvanceBooking?: boolean;
  handoverDate?: string;
  checkoutRequestedAt?: string;
  usedMonths: number;
  remainingMonths: number;
  progressPercent: string;
  serviceFees: {
    electric: string;
    water: string;
    parking: string;
    internet: string;
  };
  meterTerms: {
    electricityPrice: number;
    waterPrice: number;
    initialElectricity: number;
    initialWater: number;
  };
  note: string;
  docxUrl?: string;
  pdfUrl?: string;
  tenantSignature?: string;
};
