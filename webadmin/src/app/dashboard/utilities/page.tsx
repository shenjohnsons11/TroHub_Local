"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarRange, Eye, Gauge, Search, Send, Save } from "lucide-react";
import { AppLoading } from "@/components/app-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";
import { formatCurrency, formatNumberInput, unformatNumber } from "@/lib/formatters";

const steps = [
  { label: "Chọn kỳ", icon: CalendarRange },
  { label: "Chốt điện/nước", icon: Gauge },
  { label: "Preview", icon: Eye },
  { label: "Phát hành", icon: Send },
];

export default function UtilitiesPage() {
  const notification = useNotification();
  const [previews, setPreviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [startMonth, setStartMonth] = useState(currentMonthStr);
  const [endMonth, setEndMonth] = useState(currentMonthStr);
  const [utilitiesState, setUtilitiesState] = useState<Record<string, { electricity: string; water: string }>>({});

  const loadPreviews = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI("/invoices/bulk-preview");
      if (data.success && data.data) {
        setPreviews(data.data);
        const stateInit: Record<string, { electricity: string; water: string }> = {};
        data.data.forEach((p: any) => {
          stateInit[p.contractId] = {
            electricity: formatNumberInput(p.electricityDraft),
            water: formatNumberInput(p.waterDraft),
          };
        });
        setUtilitiesState(stateInit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreviews();
  }, []);

  const handleUpdateInput = (contractId: string, field: "electricity" | "water", value: string) => {
    setUtilitiesState((prev) => ({
      ...prev,
      [contractId]: { ...prev[contractId], [field]: formatNumberInput(value) },
    }));
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    try {
      const utilitiesToUpdate = previews
        .map((p) => {
          const inputState = utilitiesState[p.contractId];
          return {
            roomId: p.roomId,
            draftElectricity: unformatNumber(inputState?.electricity),
            draftWater: unformatNumber(inputState?.water),
          };
        })
        .filter((item) => item.draftElectricity || item.draftWater);

      if (utilitiesToUpdate.length === 0) {
        notification.warning("Vui lòng nhập số liệu mới cho ít nhất 1 phòng.");
        setLoading(false);
        return;
      }

      const res = await fetchAPI("/rooms/bulk-report-utility", {
        method: "POST",
        body: JSON.stringify({ utilities: utilitiesToUpdate }),
      });

      if (res.success) {
        notification.success("Đã lưu nháp sổ điện nước. Bạn có thể chuyển sang Hóa đơn để phát hành.");
        void loadPreviews();
      } else {
        notification.error(getNotificationMessage(res.message, "Không thể lưu chỉ số điện nước."));
      }
    } catch (err: unknown) {
      notification.error(getNotificationMessage(err, "Không thể lưu chỉ số điện nước."));
    } finally {
      setLoading(false);
    }
  };

  const filteredPreviews = previews.filter((p) => p.room?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vận hành · Quy trình hóa đơn"
        title="Chốt điện nước"
        description="Ghi chỉ số mới theo phòng, kiểm tra bản xem trước rồi chuyển sang phát hành hóa đơn."
        action={
          <Button onClick={handleSaveBulk} disabled={loading}>
            <Save aria-hidden="true" /> {loading ? "Đang xử lý..." : "Lưu sổ điện nước"}
          </Button>
        }
      />

      <div className="flex gap-4 p-4 calm-surface rounded-[20px]">
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">Từ tháng</label>
          <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">Đến tháng</label>
          <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </div>
      </div>

      <ol aria-label="Tiến trình tạo hóa đơn hàng loạt" className="grid gap-2 rounded-[20px] bg-card p-3 shadow-[var(--calm-shadow)] ring-1 ring-border/50 sm:grid-cols-4">
        {steps.map(({ label, icon: Icon }, index) => {
          const active = index === 1;
          const complete = index < 1;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-3 rounded-[16px] px-3 py-3 ${active ? "bg-primary text-primary-foreground" : complete ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-current/10">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[.12em] opacity-70">Bước {index + 1}</span>
                <span className="text-sm font-extrabold">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section className="calm-surface overflow-hidden">
        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm theo mã phòng"
              placeholder="Tìm theo mã phòng..."
              className="h-11 pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-sm font-bold text-muted-foreground">{previews.length} phòng đang hiệu lực</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={6} className="bg-muted/50 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Kỳ ghi nhận: {startMonth} đến {endMonth}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Mã phòng</TableHead>
              <TableHead>Tiền phòng</TableHead>
              <TableHead>Số điện cũ</TableHead>
              <TableHead className="text-primary">Số điện mới</TableHead>
              <TableHead>Số nước cũ</TableHead>
              <TableHead className="text-primary">Số nước mới</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8"><AppLoading message="Đang tải bản xem trước điện nước" /></TableCell></TableRow>
            ) : filteredPreviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <Image src="/trohub-empty-states.png" alt="" width={170} height={100} className="mx-auto h-24 w-40 rounded-[20px] object-cover object-left" />
                  <p className="font-extrabold">Không có phòng phù hợp</p>
                  <p className="mt-1 text-sm text-muted-foreground">Thử từ khóa khác hoặc kiểm tra hợp đồng đang hiệu lực.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPreviews.map((p) => (
                <TableRow key={p.contractId}>
                  <TableCell className="font-extrabold">{p.room}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(p.roomAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.electricityOld}</TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Số điện mới phòng ${p.room}`}
                      className="h-9 w-28 bg-accent/45"
                      placeholder="Số mới"
                      inputMode="numeric"
                      value={utilitiesState[p.contractId]?.electricity || ""}
                      onChange={(event) => handleUpdateInput(p.contractId, "electricity", event.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.waterOld}</TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Số nước mới phòng ${p.room}`}
                      className="h-9 w-28 bg-accent/45"
                      placeholder="Số mới"
                      inputMode="numeric"
                      value={utilitiesState[p.contractId]?.water || ""}
                      onChange={(event) => handleUpdateInput(p.contractId, "water", event.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
