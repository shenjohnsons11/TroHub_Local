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

interface Debt {
  contractId: string;
  room: string;
  nguoiThue: string;
  totalDebt: number;
  unpaidInvoiceCount: number;
  invoices: unknown[];
}

export default function DebtsPage() {
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
          nguoiThue: item.nguoiThue || item.tenant || "Không xác định",
        })));
      }
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "Không thể tải danh sách công nợ.");
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    void loadDebts();
  }, [loadDebts]);

  const handleRemind = async (contractId: string) => {
    try {
      const data = await fetchAPI(`/invoices/debts/${contractId}/remind`, { method: "POST" });
      if (data.success) notification.success("Đã gửi thông báo nhắc nợ thành công.");
      else notification.error(data.message || "Không thể gửi thông báo nhắc nợ.");
    } catch (error: unknown) {
      notification.error(error instanceof Error ? error.message : "Lỗi kết nối khi gửi nhắc nợ.");
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
        eyebrow="Dòng tiền"
        title="Quản lý công nợ"
        description="Theo dõi công nợ của Người thuê và gửi nhắc thanh toán."
        action={<Button onClick={loadDebts} variant="outline" aria-label="Làm mới danh sách công nợ"><RefreshCw aria-hidden="true" /> Làm mới</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-primary text-primary-foreground dark:ring-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm opacity-80"><AlertCircle aria-hidden="true" className="size-4" /> Tổng công nợ hiện tại</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-black tracking-[-.04em]">{totalSystemDebt.toLocaleString("vi-VN")} đ</p><p className="mt-2 text-xs font-semibold opacity-70">Từ {debts.length} phòng đang nợ</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><WalletCards aria-hidden="true" className="size-4 text-primary" /> Hóa đơn chưa thanh toán</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-black tracking-[-.04em]">{debts.reduce((sum, debt) => sum + debt.unpaidInvoiceCount, 0)}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">Trên toàn hệ thống</p></CardContent>
        </Card>
      </div>
      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black">Danh sách nợ theo phòng</h2>
          <div className="relative w-full sm:w-72">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Tìm công nợ" placeholder="Tìm theo phòng hoặc khách..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Phòng</TableHead><TableHead>Người thuê</TableHead><TableHead className="text-center">Số hóa đơn nợ</TableHead><TableHead className="text-right">Tổng nợ</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-8"><AppLoading message="Đang tải danh sách công nợ" /></TableCell></TableRow>
            ) : filteredDebts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-[center_68%]" />
                  <p className="mt-3 font-extrabold">Không có công nợ cần thu</p>
                  <p className="mt-1 text-sm text-muted-foreground">Các khoản nợ mới sẽ xuất hiện tại đây.</p>
                </TableCell>
              </TableRow>
            ) : filteredDebts.map((debt) => (
              <TableRow key={debt.contractId}>
                <TableCell className="font-extrabold">{debt.room}</TableCell>
                <TableCell>{debt.nguoiThue}</TableCell>
                <TableCell className="text-center"><Badge variant="destructive">{debt.unpaidInvoiceCount} hóa đơn</Badge></TableCell>
                <TableCell className="text-right text-base font-black text-destructive">{debt.totalDebt.toLocaleString("vi-VN")} đ</TableCell>
                <TableCell className="text-right">
                  <Button onClick={() => handleRemind(debt.contractId)} variant="ghost" size="icon" aria-label={`Gửi nhắc nợ phòng ${debt.room}`}>
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
