"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInvoiceDate, SemanticInvoice } from "@/lib/invoice";
import { formatCurrency, formatMeterReading, formatPhone } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";
import { getStatusText } from "@/lib/status-helpers";

type Props = {
  invoice: SemanticInvoice | null;
  onClose: () => void;
};

export function InvoiceDetailDrawer({ invoice, onClose }: Props) {
  const { t } = useLanguage();
  if (!invoice) return null;
  const isDeposit = invoice.type === "deposit";
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
              {t("common.details")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("common.room")} {invoice.roomName || invoice.roomCode} · {invoice.tenantName || invoice.nguoiThue}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-border py-5 text-sm">
          <div><dt className="text-muted-foreground">{t("invoices.period")}</dt><dd className="mt-1 font-bold">{invoice.period}</dd></div>
          <div><dt className="text-muted-foreground">{t("invoices.dueDate")}</dt><dd className="mt-1 font-bold">{formatInvoiceDate(invoice.dueDate)}</dd></div>
          <div><dt className="text-muted-foreground">{t("common.status")}</dt><dd className="mt-1 font-bold">{getStatusText("invoice", invoice.statusLabel, t)}</dd></div>
          <div><dt className="text-muted-foreground">{t("tenants.phone")}</dt><dd className="mt-1 font-bold">{invoice.tenantPhone ? formatPhone(invoice.tenantPhone) : t("common.unspecified")}</dd></div>
          <div><dt className="text-muted-foreground">{t("invoices.totalAmount")}</dt><dd className="mt-1 font-black text-primary">{formatCurrency(invoice.totalAmount)}</dd></div>
        </dl>

        <section className="py-5">
          <h3 className="font-black">{isDeposit ? t("contracts.depositAmount") : t("invoices.title")}</h3>
          <div className="mt-3 divide-y divide-border">
            {isDeposit ? (
              <Line label={t("contracts.depositAmount")} amount={invoice.depositAmount} />
            ) : <>
            <Line label={t("invoices.roomFee")} amount={invoice.rent ?? invoice.roomAmount} />
            {serviceLines.length > 0 ? serviceLines.map((line, index) => line.billingMode === "METER" ? (
              <MeterLine
                key={line._id || `${line.serviceCode || line.serviceName}-${index}`}
                label={line.serviceName || line.serviceId?.name || t("contracts.services")}
                unit={line.unit || line.serviceId?.unit || ""}
                previous={line.oldIndex ?? 0}
                current={line.newIndex ?? 0}
                unitPrice={line.appliedPrice ?? 0}
                amount={line.amount}
              />
            ) : <Line
              key={line._id || `${line.serviceCode || line.serviceName}-${index}`}
              label={line.serviceName || line.serviceId?.name || t("contracts.services")}
              detail={line.billingMode === "QUANTITY" ? `${line.quantity ?? 0} ${line.unit || ""}` : line.unit}
              amount={line.amount}
            />) : (
              <>
                <MeterLine label={t("nav.utilities")} unit="kWh" previous={invoice.electricityOld ?? 0} current={invoice.electricityNew ?? 0} amount={invoice.electricity} />
                <MeterLine label={t("nav.utilities")} unit="m³" previous={invoice.waterOld ?? 0} current={invoice.waterNew ?? 0} amount={invoice.water} />
                <Line label={t("invoices.serviceFee")} amount={(invoice.services || 0) + (invoice.parking || 0) + (invoice.internet || 0) + (invoice.garbage || 0)} />
              </>
            )}
            {(invoice.penalty || 0) > 0 && <Line label={t("invoices.penalty")} amount={invoice.penalty} />}
            {(invoice.discount || 0) > 0 && <Line label={t("invoices.discount")} amount={-(invoice.discount || 0)} />}
            </>}
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
      <p className="whitespace-nowrap font-bold">{formatCurrency(amount)}</p>
    </div>
  );
}

function MeterLine({ label, unit, previous = 0, current = 0, unitPrice, amount = 0 }: { label: string; unit: string; previous?: number; current?: number; unitPrice?: number; amount?: number }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatMeterReading(previous)} → {formatMeterReading(current)} {unit}
          {unitPrice !== undefined ? ` · ${formatCurrency(unitPrice)}/${unit}` : ""}
        </p>
      </div>
      <p className="whitespace-nowrap font-bold">{formatCurrency(amount)}</p>
    </div>
  );
}
