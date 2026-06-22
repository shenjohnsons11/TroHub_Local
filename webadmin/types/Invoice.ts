export type InvoiceStatus = "unpaid" | "paid";

export type Invoice = {
  id: string;
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
  };
};