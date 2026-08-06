export type InvoiceBreakdown = {
  roomCharge: number;
  electricityCharge: number;
  waterCharge: number;
  serviceCharge: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
};

export type SuccessfulPayment = {
  id: string;
  transactionCode: string;
  gatewayReference: string | null;
  invoiceId: string;
  nguoiThueId: string;
  nguoiThue: string;
  room: string;
  period: string;
  method: string;
  amount: number;
  paidAt: string;
  invoiceBreakdown: InvoiceBreakdown;
};

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatPaidAt(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function paidDateKey(value: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatCurrency(value: number): string {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}
