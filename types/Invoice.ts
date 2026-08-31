export type InvoiceStatus = "unpaid" | "paid" | "settled";

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
    parking: string;
    internet: string;
    garbage: string;
    otherServices?: string;
  };
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  numericAmount?: number;
  type?: "deposit" | "monthly";
  depositAmount?: number;
  tenantName?: string;
  tenantPhone?: string;
};
