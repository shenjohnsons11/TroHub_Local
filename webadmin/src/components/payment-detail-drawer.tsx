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
        [t("i18n.paymentDrawer.roomRent"), breakdown.roomCharge],
        [t("i18n.paymentDrawer.electricity"), breakdown.electricityCharge],
        [t("i18n.paymentDrawer.water"), breakdown.waterCharge],
        [t("i18n.paymentDrawer.services"), breakdown.serviceCharge],
        [t("i18n.paymentDrawer.lateFee"), breakdown.lateFee],
        [t("i18n.paymentDrawer.discount"), -breakdown.discount],
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
                {t("i18n.paymentDrawer.title")}
              </DialogTitle>
              <DialogDescription>
                {t("i18n.paymentDrawer.description", { period: payment.period })}
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-4 divide-y divide-border border-y border-border">
              {[
                [t("i18n.paymentDrawer.tenant"), payment.nguoiThue],
                [t("i18n.paymentDrawer.room"), payment.room],
                [t("i18n.paymentDrawer.period"), payment.period],
                [t("i18n.paymentDrawer.paidAt"), formatPaidAt(payment.paidAt)],
                [t("i18n.paymentDrawer.transactionCode"), payment.transactionCode],
                [t("i18n.paymentDrawer.gatewayReference"), payment.gatewayReference || t("i18n.paymentDrawer.notAvailable")],
                [t("i18n.paymentDrawer.method"), payment.method],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7">
              <h3 className="font-black">{t("i18n.paymentDrawer.invoiceDetail")}</h3>
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
                  <span className="font-black">{t("i18n.paymentDrawer.total")}</span>
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
