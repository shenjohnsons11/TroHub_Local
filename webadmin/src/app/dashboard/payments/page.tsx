"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";

import { PaymentDetailDrawer } from "@/components/payment-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency } from "@/lib/formatters";
import {
  formatPaidAt,
  paidDateKey,
  type SuccessfulPayment,
} from "@/lib/payment-history";
import { useLanguage } from "@/components/language-provider";

export default function PaymentsPage() {
  const { t } = useLanguage();
  const notification = useNotification();
  const [rows, setRows] = useState<SuccessfulPayment[]>([]);
  const [selected, setSelected] = useState<SuccessfulPayment | null>(null);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchAPI("/payments");
      setRows(response.data || []);
    } catch (error) {
      notification.error(
        getNotificationMessage(error, t("common.error")),
      );
    } finally {
      setLoading(false);
    }
  }, [notification, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const methods = useMemo(
    () => [...new Set(rows.map((row) => row.method).filter(Boolean))],
    [rows],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [
        row.transactionCode,
        row.gatewayReference || "",
        row.invoiceId,
        row.room,
        row.nguoiThue,
      ].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
      const date = paidDateKey(row.paidAt);
      return matchesQuery
        && (method === "all" || row.method === method)
        && (!fromDate || date >= fromDate)
        && (!toDate || date <= toDate);
    });
  }, [fromDate, method, query, rows, toDate]);

  const collected = filtered.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-primary">{t("nav.overview")}</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.025em]">
            {t("payments.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("payments.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.loading")}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-t-2 border-primary bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{t("dashboard.revenue")}</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(collected)}</p>
        </div>
        <div className="border-t-2 border-emerald-600 bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{t("statusMap.payment.success")}</p>
          <p className="mt-1 text-2xl font-black">{filtered.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("common.search")}
          />
        </div>
        <select
          aria-label={t("payments.method")}
          className="h-11 rounded-[9px] border border-input bg-card px-3 text-sm"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="all">{t("common.all")}</option>
          {methods.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <Input aria-label={t("common.from")} type="date" className="h-11 w-auto" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input aria-label={t("common.to")} type="date" className="h-11 w-auto" value={toDate} onChange={(event) => setToDate(event.target.value)} />
      </div>

      <div className="overflow-hidden border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("payments.paidAt")}</TableHead>
              <TableHead>{t("payments.gatewayRef")}</TableHead>
              <TableHead>{t("common.tenant")}</TableHead>
              <TableHead>{t("common.room")}</TableHead>
              <TableHead>{t("invoices.period")}</TableHead>
              <TableHead>{t("payments.method")}</TableHead>
              <TableHead className="text-right">{t("common.amount")}</TableHead>
              <TableHead className="w-16"><span className="sr-only">{t("common.action")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={8}>
                  <div className="h-7 animate-pulse rounded-[6px] bg-muted" />
                </TableCell>
              </TableRow>
            )) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap font-semibold">{formatPaidAt(row.paidAt)}</TableCell>
                <TableCell className="font-mono text-xs font-bold">{row.transactionCode}</TableCell>
                <TableCell>{row.nguoiThue}</TableCell>
                <TableCell>{row.room}</TableCell>
                <TableCell>{row.period}</TableCell>
                <TableCell>{row.method}</TableCell>
                <TableCell className="text-right font-black">{formatCurrency(row.amount)}</TableCell>
                <TableCell>
                  <Button aria-label={t("common.details")} variant="ghost" size="icon" onClick={() => setSelected(row)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentDetailDrawer
        payment={selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </div>
  );
}
