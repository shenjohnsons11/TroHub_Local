"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Gauge, PenLine, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency, formatNumberInput, formatPhone, unformatNumber } from "@/lib/formatters";
import {
  CONTRACT_STEPS,
  ContractDraft,
  buildContractDraftKey,
  createContractDraft,
  validateContractStep,
} from "./contract-wizard-state";
import {
  defaultContractDates,
  formatDisplayDateInput,
  formatIsoToDisplay,
  parseDisplayToIso,
  resolveEndDateAfterStartChange,
  validateContractDateRange,
} from "../../../../../../utils/contractDate";

type Option = { _id?: string; id?: string; roomCode?: string; fullName?: string; name?: string; phone?: string; defaultRentPrice?: number; defaultDeposit?: number; type?: number; unit?: string; defaultPrice?: number };
const STEP_ICONS = [Building2, UserRound, Gauge, PenLine];

export default function NewContractPage() {
  const router = useRouter();
  const notification = useNotification();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ContractDraft>(() => createContractDraft());
  const [endDateWasEdited, setEndDateWasEdited] = useState(false);
  const [rooms, setRooms] = useState<Option[]>([]);
  const [nguoiThueList, setNguoiThueList] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const adminId = useMemo(() => { if (typeof window === "undefined") return "unknown"; try { return JSON.parse(localStorage.getItem("trohub_user") || "{}").id || JSON.parse(localStorage.getItem("trohub_user") || "{}")._id || "unknown"; } catch { return "unknown"; } }, []);
  const draftKey = buildContractDraftKey(adminId);

  useEffect(() => {
    Promise.all([fetchAPI("/rooms"), fetchAPI("/tenants"), fetchAPI("/services?isActive=true")])
      .then(([roomResponse, nguoiThueResponse, serviceResponse]) => {
        setRooms(roomResponse.data || []);
        setNguoiThueList(nguoiThueResponse.data || []);
        setServices(serviceResponse.data || []);
      })
      .catch((error) => notification.error(getNotificationMessage(error, "Không thể tải dữ liệu tạo hợp đồng.")));
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const savedDraft = JSON.parse(saved) as Partial<ContractDraft>;
        const defaults = defaultContractDates();
        setDraft({
          ...createContractDraft(),
          ...savedDraft,
          fixedRentPrice: formatNumberInput(savedDraft.fixedRentPrice),
          fixedDeposit: formatNumberInput(savedDraft.fixedDeposit),
          initialElectricity: formatNumberInput(savedDraft.initialElectricity),
          initialWater: formatNumberInput(savedDraft.initialWater),
          services: (savedDraft.services || []).map((item) => ({
            ...item,
            fixedPrice: formatNumberInput(item.fixedPrice),
          })),
          startDate:
            formatIsoToDisplay(savedDraft.startDate || "") ||
            savedDraft.startDate ||
            defaults.startDate,
          endDate:
            formatIsoToDisplay(savedDraft.endDate || "") ||
            savedDraft.endDate ||
            defaults.endDate,
        });
        setEndDateWasEdited(Boolean(savedDraft.endDate));
        notification.info("Đã khôi phục bản nháp hợp đồng.");
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
  }, [draftKey, notification]);

  useEffect(() => { localStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);
  const update = <K extends keyof ContractDraft>(key: K, value: ContractDraft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
  const next = () => { const nextErrors = validateContractStep(step, draft); setErrors(nextErrors); if (Object.keys(nextErrors).length) { notification.warning("Vui lòng hoàn tất thông tin ở bước hiện tại."); return; } setStep((value) => Math.min(4, value + 1)); };
  const selectedRoom = rooms.find((item) => (item._id || item.id) === draft.roomId);
  const selectedNguoiThue = nguoiThueList.find((item) => (item._id || item.id) === draft.tenantId);
  const toggleService = (service: Option) => { const id = service._id || service.id || ""; const exists = draft.services.some((item) => item.serviceId === id); update("services", exists ? draft.services.filter((item) => item.serviceId !== id) : [...draft.services, { serviceId: id, fixedPrice: formatNumberInput(service.defaultPrice) }]); };
  const submit = async () => {
    try {
      setSubmitting(true);
      const dateErrors = validateContractDateRange(draft.startDate, draft.endDate);
      const startDateIso = parseDisplayToIso(draft.startDate);
      const endDateIso = parseDisplayToIso(draft.endDate);
      if (Object.keys(dateErrors).length || !startDateIso || !endDateIso) {
        setErrors((current) => ({ ...current, ...dateErrors }));
        notification.warning("Vui lòng kiểm tra lại ngày hợp đồng.");
        setStep(2);
        return;
      }
      await fetchAPI("/contracts", { method: "POST", body: JSON.stringify({ ...draft, startDate: startDateIso, endDate: endDateIso, fixedRentPrice: unformatNumber(draft.fixedRentPrice), fixedDeposit: unformatNumber(draft.fixedDeposit), initialElectricity: draft.initialElectricity ? unformatNumber(draft.initialElectricity) : undefined, initialWater: draft.initialWater ? unformatNumber(draft.initialWater) : undefined, services: draft.services.map((item) => ({ ...item, fixedPrice: unformatNumber(item.fixedPrice) })) }) });
      localStorage.removeItem(draftKey);
      notification.success("Tạo hợp đồng thành công.");
      router.push("/dashboard/contracts");
    } catch (error) { notification.error(getNotificationMessage(error, "Không thể tạo hợp đồng.")); } finally { setSubmitting(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6"><header className="calm-surface overflow-hidden bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_68%,#04100e))] p-6 text-primary-foreground sm:p-8"><p className="text-sm font-bold uppercase tracking-[.16em] opacity-80">Hợp đồng mới</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Tạo hợp đồng thuê</h1><p className="mt-2 max-w-xl opacity-80">Bản nháp được tự động lưu riêng cho tài khoản Admin.</p></header><ol aria-label="Tiến trình tạo hợp đồng" className="grid grid-cols-4 gap-2">{CONTRACT_STEPS.map((item, index) => { const Icon = STEP_ICONS[index]; return <li key={item.id} aria-current={item.id === step ? "step" : undefined} className={`relative rounded-[16px] p-3 text-center text-sm transition sm:p-4 ${item.id === step ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]" : item.id < step ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground shadow-[var(--calm-shadow)]"}`}><span className="flex flex-col items-center gap-1 font-bold sm:flex-row sm:justify-center sm:gap-2">{item.id < step ? <Check className="size-5" /> : <Icon className="size-5" />}<span className="text-[11px] leading-tight sm:text-sm">{item.label}</span></span></li>; })}</ol><section className="calm-surface min-h-[420px] p-6 sm:p-8">
    {step === 1 && <div className="grid gap-5 md:grid-cols-2"><Field label="Phòng" error={errors.roomId}><select className="h-11 w-full rounded-[16px] border border-input bg-background px-3" value={draft.roomId} onChange={(e) => { update("roomId", e.target.value); const room = rooms.find((item) => (item._id || item.id) === e.target.value); if (room) setDraft((value) => ({ ...value, roomId: e.target.value, fixedRentPrice: formatNumberInput(room.defaultRentPrice), fixedDeposit: formatNumberInput(room.defaultDeposit || room.defaultRentPrice) })); }}><option value="">Chọn Phòng</option>{rooms.map((room) => <option key={room._id || room.id} value={room._id || room.id}>{room.roomCode}</option>)}</select></Field><Field label="Người thuê" error={errors.tenantId}><select className="h-11 w-full rounded-[16px] border border-input bg-background px-3" value={draft.tenantId} onChange={(e) => update("tenantId", e.target.value)}><option value="">Chọn Người thuê</option>{nguoiThueList.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.fullName || item.name} · {formatPhone(item.phone)}</option>)}</select></Field></div>}
    {step === 2 && <div className="grid gap-5 md:grid-cols-2">
      <Field label="Ngày bắt đầu" error={errors.startDate}>
        <DateField
          ariaLabel="Ngày bắt đầu hợp đồng"
          value={draft.startDate}
          onChange={(value) => {
            update("startDate", value);
            const nextEndDate = resolveEndDateAfterStartChange(
              value,
              endDateWasEdited,
              draft.endDate,
            );
            if (nextEndDate !== draft.endDate) update("endDate", nextEndDate);
          }}
        />
      </Field>
      <Field label="Ngày kết thúc" error={errors.endDate}>
        <DateField
          ariaLabel="Ngày kết thúc hợp đồng"
          value={draft.endDate}
          onChange={(value) => {
            setEndDateWasEdited(true);
            update("endDate", value);
          }}
        />
      </Field>
      {[["fixedRentPrice","Tiền thuê / tháng"],["fixedDeposit","Tiền cọc"]].map(([key,label]) => <Field key={key} label={label} error={errors[key]}><Input inputMode="numeric" value={draft[key as keyof ContractDraft] as string} onChange={(e) => update(key as keyof ContractDraft, formatNumberInput(e.target.value) as never)} /></Field>)}
    </div>}
    {step === 3 && <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2">{services.map((service) => { const id = service._id || service.id || ""; const chosen = draft.services.find((item) => item.serviceId === id); return <label key={id} className={`rounded-[20px] p-4 shadow-[var(--calm-shadow)] ${chosen ? "bg-primary/10 text-foreground" : "bg-background"}`}><span className="flex items-center gap-3 font-bold"><input type="checkbox" checked={Boolean(chosen)} onChange={() => toggleService(service)} />{service.name} · {service.unit}</span>{chosen && <Input className="mt-3" inputMode="numeric" value={chosen.fixedPrice} onChange={(e) => update("services", draft.services.map((item) => item.serviceId === id ? { ...item, fixedPrice: formatNumberInput(e.target.value) } : item))} />}</label>; })}</div><div className="grid gap-5 md:grid-cols-2"><Field label="Chỉ số điện ban đầu"><Input inputMode="numeric" value={draft.initialElectricity} onChange={(e) => update("initialElectricity", formatNumberInput(e.target.value))} /></Field><Field label="Chỉ số nước ban đầu"><Input inputMode="numeric" value={draft.initialWater} onChange={(e) => update("initialWater", formatNumberInput(e.target.value))} /></Field></div></div>}
    {step === 4 && <div className="grid gap-4 sm:grid-cols-2"><Summary label="Phòng" value={selectedRoom?.roomCode || "—"} /><Summary label="Người thuê" value={selectedNguoiThue?.fullName || selectedNguoiThue?.name || "—"} /><Summary label="Thời hạn" value={`${draft.startDate} → ${draft.endDate}`} /><Summary label="Tiền thuê" value={formatCurrency(draft.fixedRentPrice)} /><Summary label="Tiền cọc" value={formatCurrency(draft.fixedDeposit)} /><Summary label="Dịch vụ" value={`${draft.services.length} dịch vụ`} /></div>}
  </section><footer className="flex justify-between gap-3"><Button variant="outline" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ChevronLeft className="size-4" />Quay lại</Button>{step < 4 ? <Button onClick={next}>Tiếp tục<ChevronRight className="size-4" /></Button> : <Button disabled={submitting} onClick={() => void submit()}><PenLine className="size-4" />{submitting ? "Đang tạo..." : "Ký & tạo hợp đồng"}</Button>}</footer></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}</div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-[12px] bg-background p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>; }

function DateField({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    const showPicker = (
      picker as HTMLInputElement & { showPicker?: () => void }
    ).showPicker;
    if (typeof showPicker === "function") showPicker.call(picker);
    else HTMLElement.prototype.click.call(picker);
  };

  return (
    <div className="relative">
      <Input
        aria-label={ariaLabel}
        className="pr-11 tabular-nums"
        inputMode="numeric"
        maxLength={10}
        placeholder="dd/mm/yyyy"
        value={value}
        onChange={(event) =>
          onChange(formatDisplayDateInput(event.target.value))
        }
      />
      <button
        type="button"
        aria-label={`Mở lịch chọn ${ariaLabel.toLowerCase()}`}
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-[16px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={openPicker}
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        type="date"
        value={parseDisplayToIso(value) || ""}
        onChange={(event) => onChange(formatIsoToDisplay(event.target.value))}
      />
    </div>
  );
}
