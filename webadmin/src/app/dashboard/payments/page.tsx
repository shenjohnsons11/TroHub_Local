"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CircleDollarSign, Search, WalletCards } from "lucide-react";
import { AppLoading } from "@/components/app-loading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency } from "@/lib/formatters";

type PaymentRow = {
  _id: string;
  transactionCode: string;
  invoiceId: string;
  room: string;
  nguoiThue: string;
  month: string;
  amount: number;
  method: string;
  status: number;
  createdAt: string;
};

export default function PaymentsPage() {
  const notification = useNotification();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchAPI("/payments");
      setRows(response.data || []);
    } catch (error) {
      notification.error(getNotificationMessage(error, "Không thể tải lịch sử giao dịch."));
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const value = query.toLocaleLowerCase("vi");
    return rows.filter((row) => [row.transactionCode, row.invoiceId, row.room, row.nguoiThue].some((item) => item?.toLocaleLowerCase("vi").includes(value)));
  }, [query, rows]);
  const successful = rows.filter((row) => row.status === 1);
  const collected = successful.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Đối soát" title="Lịch sử thanh toán" description="Theo dõi giao dịch và trạng thái thanh toán đã ghi nhận." />
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-[24px] bg-primary p-5 text-primary-foreground shadow-[var(--calm-shadow)]">
          <CircleDollarSign aria-hidden="true" className="size-6 opacity-75" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[.14em] opacity-70">Đã thu thành công</p>
          <p className="mt-1 text-3xl font-black tracking-[-.04em]">{formatCurrency(collected)}</p>
        </article>
        <article className="calm-surface p-5">
          <WalletCards aria-hidden="true" className="size-6 text-primary" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Giao dịch ghi nhận</p>
          <p className="mt-1 text-3xl font-black tracking-[-.04em]">{rows.length}</p>
        </article>
      </div>
      <section className="calm-surface overflow-hidden">
        <div className="bg-muted/35 p-4">
          <div className="relative max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Tìm giao dịch" className="h-11 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã giao dịch, hóa đơn, Người thuê" />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Mã giao dịch</TableHead><TableHead>Người thuê</TableHead><TableHead>Phòng</TableHead><TableHead>Phương thức</TableHead><TableHead>Số tiền</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8"><AppLoading message="Đang tải giao dịch đã ghi nhận" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-right" />
                  <p className="mt-3 font-extrabold">Chưa có giao dịch phù hợp</p>
                  <p className="mt-1 text-sm text-muted-foreground">Giao dịch mới sẽ xuất hiện tại đây.</p>
                </TableCell>
              </TableRow>
            ) : filtered.map((row) => (
              <TableRow key={row._id}>
                <TableCell className="font-extrabold">{row.transactionCode}</TableCell>
                <TableCell>{row.nguoiThue}</TableCell>
                <TableCell>{row.room}</TableCell>
                <TableCell>{row.method}</TableCell>
                <TableCell className="text-base font-black">{formatCurrency(row.amount)}</TableCell>
                <TableCell><Badge variant={row.status === 1 ? "default" : row.status === 2 ? "secondary" : "destructive"}>{row.status === 1 ? "Thành công" : row.status === 2 ? "Đang chờ" : "Thất bại"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
