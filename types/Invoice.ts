export type InvoiceStatus = "unpaid" | "paid" | "settled";

export type InvoiceServiceLine = {
  serviceId?: string;
  name: string;
  unit?: string;
  amount: number;
  quantity?: number;
  appliedPrice?: number;
};

export type Invoice = {
  id: string;

  contractId?: string;

  roomId?: string;

  month: string;

  room: string;

  amount: string;

  status: InvoiceStatus;

  statusText: string;

  dueDate: string;

  details: {
    roomFee: string;

    electric: {
      amount: string;

      oldIndex: number | null;

      newIndex: number | null;
    };

    water: {
      amount: string;

      oldIndex: number | null;

      newIndex: number | null;
    };

    /**
     * Giữ lại các field legacy để không ảnh hưởng
     * các màn hình cũ đang dùng.
     */
    parking: string;

    internet: string;

    garbage: string;

    otherServices?: string;
  };

  /**
   * Danh sách dịch vụ động thực tế của hóa đơn.
   *
   * Ví dụ:
   * [
   *   { name: "Bảo vệ", amount: 200000 },
   *   { name: "Internet", amount: 100000 },
   *   { name: "Rác", amount: 45000 },
   *   { name: "Gửi xe", amount: 100000 }
   * ]
   */
  services?: InvoiceServiceLine[];

  bankId?: string;

  bankAccountNo?: string;

  bankAccountName?: string;

  numericAmount?: number;

  type?: "deposit" | "monthly";

  depositAmount?: number;

  tenantName?: string;

  tenantPhone?: string;
};