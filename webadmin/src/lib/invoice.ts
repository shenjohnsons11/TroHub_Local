export type InvoiceStatusCode = 0 | 1 | 2 | 3;

export type SemanticInvoice = {
  _id?: string;
  id: string;
  invoiceCode: string;
  period: string;
  roomCode: string;
  nguoiThue: string;
  totalAmount: number;
  dueDate: string | null;
  status?: number;
  statusCode: InvoiceStatusCode;
  statusLabel: string;
  type?: "deposit" | "monthly";
  depositAmount?: number;
  rent?: number;
  tenantName?: string;
  tenantPhone?: string;
  roomName?: string;
  roomAmount?: number;
  electricityOld?: number;
  electricityNew?: number;
  electricity?: number;
  waterOld?: number;
  waterNew?: number;
  water?: number;
  services?: number;
  parking?: number;
  internet?: number;
  garbage?: number;
  discount?: number;
  penalty?: number;
  details?: Array<{
    _id?: string;
    serviceName?: string;
    serviceCode?: string;
    billingMode?: "FIXED" | "QUANTITY" | "METER";
    unit?: string;
    oldIndex?: number | null;
    newIndex?: number | null;
    quantity?: number;
    appliedPrice?: number;
    amount?: number;
    serviceId?: { name?: string; unit?: string };
  }>;
};

export const invoiceCurrency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const formatInvoiceDate = (value: string | null) => {
  if (!value) return "Chưa xác định";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa xác định" : date.toLocaleDateString("vi-VN");
};
