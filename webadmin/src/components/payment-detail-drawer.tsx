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
  formatCurrency,
  formatPaidAt,
  type SuccessfulPayment,
} from "@/lib/payment-history";

type Props = {
  payment: SuccessfulPayment | null;
  onOpenChange: (open: boolean) => void;
};

export function PaymentDetailDrawer({ payment, onOpenChange }: Props) {
  const breakdown = payment?.invoiceBreakdown;
  const rows = breakdown
    ? [
        ["Tiền phòng", breakdown.roomCharge],
        ["Tiền điện", breakdown.electricityCharge],
        ["Tiền nước", breakdown.waterCharge],
        ["Dịch vụ cộng thêm", breakdown.serviceCharge],
        ["Tiền phạt quá hạn", breakdown.lateFee],
        ["Giảm trừ", -breakdown.discount],
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
                Chi tiết thanh toán
              </DialogTitle>
              <DialogDescription>
                Đối soát hóa đơn {payment.period} của Người thuê.
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-4 divide-y divide-border border-y border-border">
              {[
                ["Người thuê", payment.nguoiThue],
                ["Phòng", payment.room],
                ["Kỳ hóa đơn", payment.period],
                ["Ngày thanh toán", formatPaidAt(payment.paidAt)],
                ["Mã TroHub", payment.transactionCode],
                ["Mã đối soát", payment.gatewayReference || "Không có"],
                ["Phương thức", payment.method],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7">
              <h3 className="font-black">Chi tiết hóa đơn</h3>
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
                  <span className="font-black">Tổng thanh toán</span>
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
