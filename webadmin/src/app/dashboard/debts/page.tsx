"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, Bell, RefreshCw, Search, WalletCards } from "lucide-react";
import { AppLoading } from "@/components/app-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { useLanguage } from "@/components/language-provider";
import { FEATURE_ICONS } from "@/constants/feature-icons";

interface Debt {
  contractId: string;
  room: string;
  nguoiThue: string;
  totalDebt: number;
  unpaidInvoiceCount: number;
  invoices: unknown[];
}

export default function DebtsPage() {
  const { t } = useLanguage();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const notification = useNotification();

  const loadDebts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI("/invoices/debts");
      if (data.success) {
        setDebts(data.data.map((item: Debt & { tenant?: string }) => ({
          ...item,
          nguoiThue: item.nguoiThue || item.tenant || t("common.unspecified"),
        })));
      }
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [notification, t]);

  useEffect(() => {
    void loadDebts();
  }, [loadDebts]);

  const handleRemind = async (contractId: string) => {
    try {
      const data = await fetchAPI(`/invoices/debts/${contractId}/remind`, { method: "POST" });
      if (data.success) notification.success(t("debts.remindedSuccess"));
      else notification.error(data.message || t("common.error"));
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : t("common.error"));
    }
  };

  const filteredDebts = debts.filter((debt) =>
    (debt.room || "").toLowerCase().includes(search.toLowerCase()) ||
    (debt.nguoiThue || "").toLowerCase().includes(search.toLowerCase()),
  );
  const totalSystemDebt = debts.reduce((sum, debt) => sum + debt.totalDebt, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("nav.overview")}
        title={t("debts.title")}
        description={t("debts.subtitle")}
        iconToken={FEATURE_ICONS.debts}
        action={<Button onClick={loadDebts} variant="outline" aria-label={t("common.loading")}><RefreshCw aria-hidden="true" /> {t("common.loading")}</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-primary text-primary-foreground dark:ring-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm opacity-80"><AlertCircle aria-hidden="true" className="size-4" /> {t("debts.totalDebt")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-black tracking-[-.04em]">{formatCurrency(totalSystemDebt)}</p><p className="mt-2 text-xs font-semibold opacity-70">{debts.length} {t("nav.rooms")}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><WalletCards aria-hidden="true" className="size-4 text-primary" /> {t("debts.unpaidInvoices")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-black tracking-[-.04em]">{debts.reduce((sum, debt) => sum + debt.unpaidInvoiceCount, 0)}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{t("dashboard.property")}</p></CardContent>
        </Card>
      </div>
      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black">{t("debts.title")}</h2>
          <div className="relative w-full sm:w-72">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t("common.search")} placeholder={t("common.search")} value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.room")}</TableHead><TableHead>{t("common.tenant")}</TableHead><TableHead className="text-center">{t("debts.unpaidInvoices")}</TableHead><TableHead className="text-right">{t("debts.totalDebt")}</TableHead><TableHead className="text-right">{t("common.action")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-8"><AppLoading message={t("common.loading")} /></TableCell></TableRow>
            ) : filteredDebts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-[center_68%]" />
                  <p className="mt-3 font-extrabold">{t("common.noData")}</p>
                </TableCell>
              </TableRow>
            ) : filteredDebts.map((debt) => (
              <TableRow key={debt.contractId}>
                <TableCell className="font-extrabold">{debt.room}</TableCell>
                <TableCell>{debt.nguoiThue}</TableCell>
                <TableCell className="text-center"><Badge variant="destructive">{debt.unpaidInvoiceCount}</Badge></TableCell>
                <TableCell className="text-right text-base font-black text-destructive">{formatCurrency(debt.totalDebt)}</TableCell>
                <TableCell className="text-right">
                  <Button onClick={() => handleRemind(debt.contractId)} variant="ghost" size="icon" aria-label={t("invoices.sendReminder")}>
                    <Bell aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
