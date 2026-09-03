export type ContractStatus =
  | "pending"
  | "active"
  | "reserved"
  | "expired"
  | "terminated"
  | "cancelled"
  | "awaiting_approval"
  | "requesting_termination";

/**
 * Dịch vụ đi kèm đã được chủ trọ chọn khi tạo hợp đồng.
 */
export type ContractService = {
  serviceId?: string;

  name: string;

  unit?: string;

  fixedPrice: number;
};

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

    status:
      | "not_required"
      | "unpaid"
      | "paid";
  };

  status: ContractStatus;

  // 0: Nháp
  // 1: Hiệu lực
  // 2: Hết hạn
  // 3: Thanh lý
  // 4: Đã cọc/chờ bàn giao
  // 5: Chờ khách ký
  rawStatus: number;

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

  /**
   * Danh sách dịch vụ động của hợp đồng.
   *
   * Ví dụ:
   * [
   *   {
   *     serviceId: "...",
   *     name: "Giữ xe",
   *     unit: "month",
   *     fixedPrice: 100000
   *   },
   *   {
   *     serviceId: "...",
   *     name: "Internet",
   *     unit: "month",
   *     fixedPrice: 100000
   *   }
   * ]
   */
  services?: ContractService[];

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