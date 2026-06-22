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
    electric: string;
    water: string;
    parking: string;
    internet: string;
  };
};