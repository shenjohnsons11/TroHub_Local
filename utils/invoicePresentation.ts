import type { Invoice } from "../types/Invoice";

export function calculateUnpaidTotal(invoices: Pick<Invoice, "amount" | "numericAmount" | "status">[]) {
  return invoices.reduce(
    (total, invoice) =>
      invoice.status === "unpaid"
        ? total + ((invoice.numericAmount ?? Number(invoice.amount.replace(/\D/g, ""))) || 0)
        : total,
    0,
  );
}
