"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";

type PaymentRow = { _id: string; transactionCode: string; invoiceId: string; room: string; nguoiThue: string; month: string; amount: number; method: string; status: number; createdAt: string };

export default function PaymentsPage() {
  const notification = useNotification();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setLoading(true); const response = await fetchAPI("/payments"); setRows(response.data || []); } catch (error) { notification.error(getNotificationMessage(error, "Không thể tải lịch sử giao dịch.")); } finally { setLoading(false); } }, [notification]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { const value = query.toLocaleLowerCase("vi"); return rows.filter((row) => [row.transactionCode, row.invoiceId, row.room, row.nguoiThue].some((item) => item?.toLocaleLowerCase("vi").includes(value))); }, [query, rows]);
  return <div className="space-y-6"><header><p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Đối soát</p><h1 className="mt-1 text-3xl font-black">Lịch sử thanh toán</h1></header><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mã giao dịch, hóa đơn, Người thuê" /></div><div className="overflow-hidden rounded-[14px] border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Mã giao dịch</TableHead><TableHead>Người thuê</TableHead><TableHead>Phòng</TableHead><TableHead>Phương thức</TableHead><TableHead>Số tiền</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={6} className="h-28 text-center">Đang tải...</TableCell></TableRow> : filtered.map((row) => <TableRow key={row._id}><TableCell className="font-bold">{row.transactionCode}</TableCell><TableCell>{row.nguoiThue}</TableCell><TableCell>{row.room}</TableCell><TableCell>{row.method}</TableCell><TableCell className="font-bold">{row.amount.toLocaleString("vi-VN")}đ</TableCell><TableCell><Badge variant={row.status === 1 ? "default" : "secondary"}>{row.status === 1 ? "Thành công" : row.status === 2 ? "Đang chờ" : "Thất bại"}</Badge></TableCell></TableRow>)}</TableBody></Table></div></div>;
}
