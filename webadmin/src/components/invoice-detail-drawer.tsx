"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatInvoiceDate, SemanticInvoice } from "@/lib/invoice";
import { formatCurrency, formatMeterReading, formatPhone } from "@/lib/formatters";

type Props = {
  invoice: SemanticInvoice | null;
  onClose: () => void;
};

export function InvoiceDetailDrawer({ invoice, onClose }: Props) {
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
              Chi tiết hóa đơn
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Phòng {invoice.roomName || invoice.roomCode} · {invoice.tenantName || invoice.nguoiThue}
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
          <div><dt className="text-muted-foreground">Số điện thoại</dt><dd className="mt-1 font-bold">{invoice.tenantPhone ? formatPhone(invoice.tenantPhone) : "Chưa cập nhật"}</dd></div>
          <div><dt className="text-muted-foreground">Tổng thanh toán</dt><dd className="mt-1 font-black text-primary">{formatCurrency(invoice.totalAmount)}</dd></div>
        </dl>

        <section className="py-5">
          <h3 className="font-black">{isDeposit ? "Chi tiết tiền cọc" : "Chi tiết khoản thu"}</h3>
          <div className="mt-3 divide-y divide-border">
            {isDeposit ? (
              <Line label="Tiền cọc hợp đồng" amount={invoice.depositAmount} />
            ) : <>
            <Line label="Tiền phòng" amount={invoice.rent ?? invoice.roomAmount} />
            {serviceLines.length > 0 ? serviceLines.map((line, index) => line.billingMode === "METER" ? (
              <MeterLine
                key={line._id || `${line.serviceCode || line.serviceName}-${index}`}
                label={line.serviceName || line.serviceId?.name || "Dịch vụ"}
                unit={line.unit || line.serviceId?.unit || "đơn vị"}
                previous={line.oldIndex ?? 0}
                current={line.newIndex ?? 0}
                unitPrice={line.appliedPrice ?? 0}
                amount={line.amount}
              />
            ) : <Line
              key={line._id || `${line.serviceCode || line.serviceName}-${index}`}
              label={line.serviceName || line.serviceId?.name || "Dịch vụ"}
              detail={line.billingMode === "QUANTITY" ? `${line.quantity ?? 0} ${line.unit || ""}` : line.unit}
              amount={line.amount}
            />) : (
              <>
                <MeterLine label="Điện" unit="kWh" previous={invoice.electricityOld ?? 0} current={invoice.electricityNew ?? 0} amount={invoice.electricity} />
                <MeterLine label="Nước" unit="m³" previous={invoice.waterOld ?? 0} current={invoice.waterNew ?? 0} amount={invoice.water} />
                <Line label="Dịch vụ khác" amount={(invoice.services || 0) + (invoice.parking || 0) + (invoice.internet || 0) + (invoice.garbage || 0)} />
              </>
            )}
            {(invoice.penalty || 0) > 0 && <Line label="Phí quá hạn" amount={invoice.penalty} />}
            {(invoice.discount || 0) > 0 && <Line label="Giảm trừ" amount={-(invoice.discount || 0)} />}
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

function MeterLine({ label, unit, previous, current, unitPrice = 0, amount = 0 }: { label: string; unit: string; previous: number; current: number; unitPrice?: number; amount?: number }) {
  const usage = Math.max(0, current - previous);
  const displayedUnitPrice = unitPrice || (usage > 0 ? Math.round(amount / usage) : 0);
  return <div className="grid gap-2 py-3 sm:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] sm:items-end"><div><p className="font-semibold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">Chỉ số & chi phí theo kỳ</p></div><MeterValue label="Kỳ trước" value={`${formatMeterReading(previous)} ${unit}`} /><MeterValue label="Kỳ này" value={`${formatMeterReading(current)} ${unit}`} /><MeterValue label="Tiêu thụ" value={`${formatMeterReading(usage)} ${unit}`} /><MeterValue label="Thành tiền" value={formatCurrency(amount)} accent /><div className="sm:col-start-2"><p className="text-xs text-muted-foreground">Đơn giá</p><p className="mt-1 text-sm font-semibold">{formatCurrency(displayedUnitPrice)}</p></div></div>;
}

function MeterValue({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${accent ? "text-primary" : ""}`}>{value}</p></div>;
}
