"use client";

import { useEffect, useMemo, useRef, useState } from "react";
<<<<<<< HEAD
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Gauge, PenLine, UserRound } from "lucide-react";
=======
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Gauge, PenLine, Save, UserRound } from "lucide-react";
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import { formatCurrency, formatMeterReading, formatNumberInput, formatPhone, parseMeterReading, unformatNumber } from "@/lib/formatters";
import {
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
import { consumePendingAIAction } from "@/lib/ai-actions";
import { safeJsonParse } from "@/lib/client-storage";
import { useLanguage } from "@/components/language-provider";

type Option = {
  _id?: string;
  id?: string;
  roomCode?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  defaultRentPrice?: number;
  defaultDeposit?: number;
  lastElectricityReading?: number;
  lastWaterReading?: number;
  draftElectricity?: number;
  draftWater?: number;
  type?: number;
  unit?: string;
  defaultPrice?: number;
};
const STEP_ICONS = [Building2, UserRound, Gauge, PenLine];

export default function NewContractPage() {
  const { t } = useLanguage();
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
<<<<<<< HEAD
=======
  const draftHydrated = useRef(false);
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

  const stepsList = [
    { id: 1, label: t("contracts.selectRoomAndTenant") },
    { id: 2, label: t("contracts.rentalTerms") },
    { id: 3, label: t("contracts.utilitiesAndServices") },
    { id: 4, label: t("contracts.reviewAndSign") },
  ];

  const adminId = useMemo(() => {
    if (typeof window === "undefined") return "unknown";
    const user = safeJsonParse<{ id?: string; _id?: string }>(localStorage.getItem("trohub_user"), {});
    return user.id || user._id || "unknown";
  }, []);
  const draftKey = buildContractDraftKey(adminId);

  useEffect(() => {
    Promise.all([fetchAPI("/rooms"), fetchAPI("/tenants"), fetchAPI("/services?isActive=true")])
      .then(([roomResponse, nguoiThueResponse, serviceResponse]) => {
        setRooms(roomResponse.data || []);
        setNguoiThueList(nguoiThueResponse.data || []);
        setServices(serviceResponse.data || []);
      })
      .catch((error) => notification.error(getNotificationMessage(error, t("common.error"))));
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      const savedDraft = safeJsonParse<Partial<ContractDraft> | null>(saved, null);
      if (savedDraft) {
        try {
<<<<<<< HEAD
=======
          setStep(savedDraft.step || 1);
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
          const defaults = defaultContractDates();
          setDraft({
            ...createContractDraft(),
            ...savedDraft,
            fixedRentPrice: formatNumberInput(savedDraft.fixedRentPrice),
            fixedDeposit: formatNumberInput(savedDraft.fixedDeposit),
            electricityPrice: formatNumberInput(savedDraft.electricityPrice ?? 3500),
            waterPrice: formatNumberInput(savedDraft.waterPrice ?? 15000),
            initialElectricity: formatMeterReading(savedDraft.initialElectricity),
            initialWater: formatMeterReading(savedDraft.initialWater),
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
        } catch {
          // ignore corrupted draft
        }
      }
    }
<<<<<<< HEAD
  }, [draftKey, notification, t]);

  const update = (key: keyof ContractDraft, value: never) => {
    setDraft((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(draftKey, JSON.stringify(updated));
=======
    draftHydrated.current = true;
  }, [draftKey, notification, t]);

  useEffect(() => {
    if (!draftHydrated.current || submitting) return;
    const timer = window.setTimeout(() => localStorage.setItem(draftKey, JSON.stringify({ ...draft, step })), 500);
    return () => window.clearTimeout(timer);
  }, [draft, draftKey, step, submitting]);

  const update = (key: keyof ContractDraft, value: never) => {
    setDraft((prev) => {
      const updated = { ...prev, [key]: value };
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
      return updated;
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleService = (service: Option) => {
    const serviceId = service._id || service.id;
    if (!serviceId) return;
    const exists = draft.services.some((s) => s.serviceId === serviceId);
    const nextServices = exists
      ? draft.services.filter((s) => s.serviceId !== serviceId)
      : [
          ...draft.services,
          {
            serviceId,
            name: service.name || service.fullName || "",
            unit: service.unit || "",
            fixedPrice: formatNumberInput(service.defaultPrice || 0),
          },
        ];
    update("services", nextServices as never);
  };

  const next = () => {
    const stepErrors = validateContractStep(step, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      const startDateIso = parseDisplayToIso(draft.startDate);
      const endDateIso = parseDisplayToIso(draft.endDate);
      if (!startDateIso || !endDateIso || !validateContractDateRange(startDateIso, endDateIso)) {
        notification.warning(t("common.error"));
        setStep(2);
        return;
      }
      await fetchAPI("/contracts", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          startDate: startDateIso,
          endDate: endDateIso,
          fixedRentPrice: unformatNumber(draft.fixedRentPrice),
          fixedDeposit: unformatNumber(draft.fixedDeposit),
          electricityPrice: unformatNumber(draft.electricityPrice || formatNumberInput(3500)),
          waterPrice: unformatNumber(draft.waterPrice || formatNumberInput(15000)),
          initialElectricity: draft.initialElectricity ? parseMeterReading(draft.initialElectricity) ?? undefined : undefined,
          initialWater: draft.initialWater ? parseMeterReading(draft.initialWater) ?? undefined : undefined,
          services: draft.services.map((item) => ({ ...item, fixedPrice: unformatNumber(item.fixedPrice) })),
        }),
      });
      localStorage.removeItem(draftKey);
      notification.success(t("contracts.createdSuccess"));
      router.push("/dashboard/contracts");
    } catch (error) {
      notification.error(getNotificationMessage(error, t("common.error")));
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< HEAD
=======
  const saveDraftNow = () => {
    localStorage.setItem(draftKey, JSON.stringify({ ...draft, step }));
    notification.success(t("contracts.draftSavedSuccess"));
    router.push("/dashboard/contracts");
  };

>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
  const selectedRoom = rooms.find((r) => (r._id || r.id) === draft.roomId);
  const selectedNguoiThue = nguoiThueList.find((t) => (t._id || t.id) === draft.tenantId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="calm-surface overflow-hidden bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_68%,#04100e))] p-6 text-primary-foreground sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[.16em] opacity-80">{t("contracts.newContract")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{t("contracts.createContract")}</h1>
        <p className="mt-2 max-w-xl opacity-80">{t("dashboard.property")}</p>
      </header>
      <ol aria-label={t("contracts.title")} className="grid grid-cols-4 gap-2">
        {stepsList.map((item, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <li
              key={item.id}
              aria-current={item.id === step ? "step" : undefined}
              className={`relative rounded-[16px] p-3 text-center text-sm transition sm:p-4 ${
                item.id === step
                  ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]"
                  : item.id < step
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground shadow-[var(--calm-shadow)]"
              }`}
            >
              <span className="flex flex-col items-center gap-1 font-bold sm:flex-row sm:justify-center sm:gap-2">
                {item.id < step ? <Check className="size-5" /> : <Icon className="size-5" />}
                <span className="text-[11px] leading-tight sm:text-sm">{item.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <section className="calm-surface min-h-[420px] p-6 sm:p-8">
        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("common.room")} error={errors.roomId}>
              <select
                className="h-11 w-full rounded-[16px] border border-input bg-background px-3"
                value={draft.roomId}
                onChange={(e) => {
                  update("roomId", e.target.value as never);
                  const room = rooms.find((item) => (item._id || item.id) === e.target.value);
                  if (room) {
                    setDraft((value) => ({
                      ...value,
                      roomId: e.target.value,
                      fixedRentPrice: formatNumberInput(room.defaultRentPrice),
                      fixedDeposit: formatNumberInput(room.defaultDeposit || room.defaultRentPrice),
                      initialElectricity: formatMeterReading(room.lastElectricityReading ?? room.draftElectricity),
                      initialWater: formatMeterReading(room.lastWaterReading ?? room.draftWater),
                    }));
                  }
                }}
              >
                <option value="">{t("contracts.selectRoom")}</option>
                {rooms.map((room) => (
                  <option key={room._id || room.id} value={room._id || room.id}>
                    {room.roomCode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("common.tenant")} error={errors.tenantId}>
              <select
                className="h-11 w-full rounded-[16px] border border-input bg-background px-3"
                value={draft.tenantId}
                onChange={(e) => update("tenantId", e.target.value as never)}
              >
                <option value="">{t("contracts.selectTenant")}</option>
                {nguoiThueList.map((item) => (
                  <option key={item._id || item.id} value={item._id || item.id}>
                    {item.fullName || item.name} · {formatPhone(item.phone)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("contracts.startDate")} error={errors.startDate}>
              <DateField
                ariaLabel={t("contracts.startDate")}
                value={draft.startDate}
                onChange={(value) => {
                  update("startDate", value as never);
                  const nextEndDate = resolveEndDateAfterStartChange(value, endDateWasEdited, draft.endDate);
                  if (nextEndDate !== draft.endDate) update("endDate", nextEndDate as never);
                }}
              />
            </Field>
            <Field label={t("contracts.endDate")} error={errors.endDate}>
              <DateField
                ariaLabel={t("contracts.endDate")}
                value={draft.endDate}
                onChange={(value) => {
                  setEndDateWasEdited(true);
                  update("endDate", value as never);
                }}
              />
            </Field>
            {[
              ["fixedRentPrice", t("contracts.rentPrice")],
              ["fixedDeposit", t("contracts.depositAmount")],
            ].map(([key, label]) => (
              <Field key={key} label={label} error={errors[key]}>
                <Input
                  inputMode="numeric"
                  value={draft[key as keyof ContractDraft] as string}
                  onChange={(e) => update(key as keyof ContractDraft, formatNumberInput(e.target.value) as never)}
                />
              </Field>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => {
                const id = service._id || service.id || "";
                const chosen = draft.services.find((item) => item.serviceId === id);
                return (
                  <label
                    key={id}
                    className={`rounded-[20px] p-4 shadow-[var(--calm-shadow)] ${
                      chosen ? "bg-primary/10 text-foreground" : "bg-background"
                    }`}
                  >
                    <span className="flex items-center gap-3 font-bold">
                      <input type="checkbox" checked={Boolean(chosen)} onChange={() => toggleService(service)} />
                      {service.name} · {service.unit}
                    </span>
                    {chosen && (
                      <Input
                        className="mt-3"
                        inputMode="numeric"
                        value={chosen.fixedPrice}
                        onChange={(e) =>
                          update(
                            "services",
                            draft.services.map((item) =>
                              item.serviceId === id ? { ...item, fixedPrice: formatNumberInput(e.target.value) } : item
                            ) as never
                          )
                        }
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={`${t("contracts.electricityPrice")} (đ/kWh)`} error={errors.electricityPrice}>
                <Input
                  inputMode="numeric"
                  value={draft.electricityPrice}
                  onChange={(e) => update("electricityPrice", formatNumberInput(e.target.value) as never)}
                  placeholder="3.500"
                />
              </Field>
              <Field label={`${t("contracts.waterPrice")} (đ/m³)`} error={errors.waterPrice}>
                <Input
                  inputMode="numeric"
                  value={draft.waterPrice}
                  onChange={(e) => update("waterPrice", formatNumberInput(e.target.value) as never)}
                  placeholder="15.000"
                />
              </Field>
              <Field label={`${t("contracts.initialElec")} (kWh)`}>
                <Input
                  inputMode="decimal"
                  value={draft.initialElectricity}
                  onChange={(e) => {
                    const value = e.target.value;
                    update(
                      "initialElectricity",
                      (parseMeterReading(value) === null ? value : formatMeterReading(value)) as never
                    );
                  }}
                  placeholder="0"
                />
              </Field>
              <Field label={`${t("contracts.initialWater")} (m³)`}>
                <Input
                  inputMode="decimal"
                  value={draft.initialWater}
                  onChange={(e) => {
                    const value = e.target.value;
                    update(
                      "initialWater",
                      (parseMeterReading(value) === null ? value : formatMeterReading(value)) as never
                    );
                  }}
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Summary label={t("common.room")} value={selectedRoom?.roomCode || "—"} />
            <Summary label={t("common.tenant")} value={selectedNguoiThue?.fullName || selectedNguoiThue?.name || "—"} />
            <Summary label={t("invoices.period")} value={`${draft.startDate} → ${draft.endDate}`} />
            <Summary label={t("contracts.rentPrice")} value={formatCurrency(draft.fixedRentPrice)} />
            <Summary label={t("contracts.depositAmount")} value={formatCurrency(draft.fixedDeposit)} />
            <Summary label={t("contracts.electricityPrice")} value={`${draft.electricityPrice || "3.500"}đ / kWh`} />
            <Summary label={t("contracts.waterPrice")} value={`${draft.waterPrice || "15.000"}đ / m³`} />
            <Summary label={t("contracts.services")} value={`${draft.services.length} services`} />
          </div>
        )}

      </section>
      <footer className="flex justify-between gap-3">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}>
          <ChevronLeft className="size-4" />
          {t("common.back")}
        </Button>
        {step < 4 ? (
          <Button onClick={next}>
            {t("common.confirm")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
<<<<<<< HEAD
          <Button disabled={submitting} onClick={() => void submit()}>
            <PenLine className="size-4" />
            {submitting ? t("common.saving") : t("contracts.signContract")}
          </Button>
=======
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={saveDraftNow}>
              <Save className="size-4" /> {t("contracts.saveDraft")}
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              <PenLine className="size-4" />
              {submitting ? t("common.saving") : t("contracts.signContract")}
            </Button>
          </div>
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
        )}
      </footer>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

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
    const showPicker = (picker as HTMLInputElement & { showPicker?: () => void }).showPicker;
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
        onChange={(event) => onChange(formatDisplayDateInput(event.target.value))}
      />
      <button
        type="button"
        aria-label={`Open calendar`}
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
