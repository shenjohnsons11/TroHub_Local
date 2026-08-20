"use client";

import { ReceiptText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatPaidAt,
  type SuccessfulPayment,
} from "@/lib/payment-history";
import { formatCurrency } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";

type Props = {
  payment: SuccessfulPayment | null;
  onOpenChange: (open: boolean) => void;
};

export function PaymentDetailDrawer({ payment, onOpenChange }: Props) {
  const { t } = useLanguage();
  const breakdown = payment?.invoiceBreakdown;
  const rows = breakdown
    ? [
        [t("invoices.roomFee"), breakdown.roomCharge],
        [t("utilities.oldElec"), breakdown.electricityCharge],
        [t("utilities.oldWater"), breakdown.waterCharge],
        [t("invoices.serviceFee"), breakdown.serviceCharge],
        [t("invoices.penalty"), breakdown.lateFee],
        [t("invoices.discount"), -breakdown.discount],
      ] as const
    : [];

  return (
    <Dialog open={Boolean(payment)} onOpenChange={onOpenChange}>
      <DialogContent className="!left-auto !right-0 !top-0 h-[100dvh] max-h-none w-full !max-w-[440px] !translate-x-0 !translate-y-0 content-start overflow-y-auto !rounded-none border-l border-border p-6 sm:p-8">
        {payment ? (
          <>
            <DialogHeader>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-[10px] bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black">
                {t("payments.title")}
              </DialogTitle>
              <DialogDescription>
                {t("invoices.period")}: {payment.period}
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-4 divide-y divide-border border-y border-border">
              {[
                [t("common.tenant"), payment.nguoiThue],
                [t("common.room"), payment.room],
                [t("invoices.period"), payment.period],
                [t("payments.paidAt"), formatPaidAt(payment.paidAt)],
                [t("invoices.code", { code: "" }), payment.transactionCode],
                [t("payments.gatewayRef"), payment.gatewayReference || "—"],
                [t("payments.method"), payment.method],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7">
              <h3 className="font-black">{t("invoices.title")}</h3>
              <div className="mt-3 divide-y divide-border">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-5 py-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={value < 0 ? "font-bold text-emerald-700" : "font-bold"}>
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-5 py-4 text-base">
                  <span className="font-black">{t("invoices.totalAmount")}</span>
                  <span className="font-black text-primary">
                    {formatCurrency(breakdown?.totalAmount || payment.amount)}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
