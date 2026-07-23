"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInvoiceDate, invoiceCurrency, SemanticInvoice } from "@/lib/invoice";

type Props = {
  invoice: SemanticInvoice | null;
  onClose: () => void;
};

export function InvoiceDetailDrawer({ invoice, onClose }: Props) {
  if (!invoice) return null;
  const serviceLines = invoice.details || [];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
        className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-card p-5 text-card-foreground shadow-[-8px_0_8px_rgba(37,41,45,0.08)] sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-sm font-semibold text-primary">{invoice.invoiceCode}</p>
            <h2 id="invoice-detail-title" className="mt-1 text-2xl font-black tracking-[-0.025em]">
              Chi tiết hóa đơn
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Phòng {invoice.roomCode} · {invoice.nguoiThue}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng chi tiết hóa đơn">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-border py-5 text-sm">
          <div><dt className="text-muted-foreground">Kỳ thanh toán</dt><dd className="mt-1 font-bold">{invoice.period}</dd></div>
          <div><dt className="text-muted-foreground">Hạn thanh toán</dt><dd className="mt-1 font-bold">{formatInvoiceDate(invoice.dueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Trạng thái</dt><dd className="mt-1 font-bold">{invoice.statusLabel}</dd></div>
          <div><dt className="text-muted-foreground">Tổng thanh toán</dt><dd className="mt-1 font-black text-primary">{invoiceCurrency.format(invoice.totalAmount)}</dd></div>
        </dl>

        <section className="py-5">
          <h3 className="font-black">Chi tiết khoản thu</h3>
          <div className="mt-3 divide-y divide-border">
            <Line label="Tiền phòng" amount={invoice.roomAmount} />
            {serviceLines.length > 0 ? serviceLines.map((line, index) => (
              <Line
                key={line._id || `${line.serviceCode || line.serviceName}-${index}`}
                label={line.serviceName || line.serviceId?.name || "Dịch vụ"}
                detail={line.billingMode === "METER"
                  ? `${line.oldIndex ?? 0} → ${line.newIndex ?? 0} ${line.unit || ""}`
                  : line.billingMode === "QUANTITY"
                    ? `${line.quantity ?? 0} ${line.unit || ""}`
                    : line.unit}
                amount={line.amount}
              />
            )) : (
              <>
                <Line label="Điện" detail={`${invoice.electricityOld ?? 0} → ${invoice.electricityNew ?? 0}`} amount={invoice.electricity} />
                <Line label="Nước" detail={`${invoice.waterOld ?? 0} → ${invoice.waterNew ?? 0}`} amount={invoice.water} />
                <Line label="Dịch vụ khác" amount={(invoice.services || 0) + (invoice.parking || 0) + (invoice.internet || 0) + (invoice.garbage || 0)} />
              </>
            )}
            {(invoice.penalty || 0) > 0 && <Line label="Phí quá hạn" amount={invoice.penalty} />}
            {(invoice.discount || 0) > 0 && <Line label="Giảm trừ" amount={-(invoice.discount || 0)} />}
          </div>
        </section>
      </aside>
    </div>
  );
}

function Line({ label, detail, amount = 0 }: { label: string; detail?: string; amount?: number }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <div>
        <p className="font-semibold">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <p className="whitespace-nowrap font-bold">{invoiceCurrency.format(amount)}</p>
    </div>
  );
}
