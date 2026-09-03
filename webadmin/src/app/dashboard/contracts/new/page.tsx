"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Gauge,
  Loader2,
  PenLine,
  Save,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotification } from "@/hooks/use-notification";
import { fetchAPI } from "@/lib/api";
import { getNotificationMessage } from "@/lib/notification-messages";
import {
  formatCurrency,
  formatMeterReading,
  formatNumberInput,
  formatPhone,
  parseMeterReading,
  unformatNumber,
} from "@/lib/formatters";
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

  const [draft, setDraft] = useState<ContractDraft>(() =>
    createContractDraft(),
  );

  const [endDateWasEdited, setEndDateWasEdited] = useState(false);

  const [rooms, setRooms] = useState<Option[]>([]);
  const [nguoiThueList, setNguoiThueList] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [landlordSignature, setLandlordSignature] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const draftHydrated = useRef(false);

  const stepsList = [
    {
      id: 1,
      label: t("contracts.selectRoomAndTenant"),
    },
    {
      id: 2,
      label: t("contracts.rentalTerms"),
    },
    {
      id: 3,
      label: t("contracts.utilitiesAndServices"),
    },
    {
      id: 4,
      label: t("contracts.reviewAndSign"),
    },
  ];

  const adminId = useMemo(() => {
    if (typeof window === "undefined") return "unknown";

    const user = safeJsonParse<{
      id?: string;
      _id?: string;
    }>(
      localStorage.getItem("trohub_user"),
      {},
    );

    return user.id || user._id || "unknown";
  }, []);

  const draftKey = buildContractDraftKey(adminId);

  useEffect(() => {
    Promise.all([
      fetchAPI("/rooms"),
      fetchAPI("/tenants"),
      fetchAPI("/services?isActive=true"),
      fetchAPI("/settings").catch(() => ({
        data: null,
      })),
    ])
      .then(
        ([
          roomResponse,
          nguoiThueResponse,
          serviceResponse,
          settingsResponse,
        ]) => {
          setRooms(roomResponse.data || []);
          setNguoiThueList(nguoiThueResponse.data || []);
          setServices(serviceResponse.data || []);

          if (settingsResponse?.data?.landlordSignature) {
            setLandlordSignature(
              settingsResponse.data.landlordSignature,
            );
          }

          if (settingsResponse?.data?.propertyAddress) {
            setDraft((prev) => ({
              ...prev,
              propertyAddress:
                prev.propertyAddress ||
                settingsResponse.data.propertyAddress,
            }));
          }
        },
      )
      .catch((error) =>
        notification.error(
          getNotificationMessage(
            error,
            t("common.error"),
          ),
        ),
      );

    const saved = localStorage.getItem(draftKey);

    if (saved) {
      const savedDraft =
        safeJsonParse<Partial<ContractDraft> | null>(
          saved,
          null,
        );

      if (savedDraft) {
        try {
          setStep(savedDraft.step || 1);

          const defaults = defaultContractDates();

          setDraft({
            ...createContractDraft(),
            ...savedDraft,

            fixedRentPrice: formatNumberInput(
              savedDraft.fixedRentPrice,
            ),

            fixedDeposit: formatNumberInput(
              savedDraft.fixedDeposit,
            ),

            propertyAddress:
              savedDraft.propertyAddress || "",

            electricityPrice: formatNumberInput(
              savedDraft.electricityPrice ?? 3500,
            ),

            waterPrice: formatNumberInput(
              savedDraft.waterPrice ?? 15000,
            ),

            initialElectricity: formatMeterReading(
              savedDraft.initialElectricity,
            ),

            initialWater: formatMeterReading(
              savedDraft.initialWater,
            ),

            services: (savedDraft.services || []).map(
              (item) => ({
                ...item,
                fixedPrice: formatNumberInput(
                  item.fixedPrice,
                ),
              }),
            ),

            startDate:
              formatIsoToDisplay(
                savedDraft.startDate || "",
              ) ||
              savedDraft.startDate ||
              defaults.startDate,

            endDate:
              formatIsoToDisplay(
                savedDraft.endDate || "",
              ) ||
              savedDraft.endDate ||
              defaults.endDate,
          });
        } catch {
          // ignore corrupted draft
        }
      }
    }

    draftHydrated.current = true;
  }, [draftKey, notification, t]);

  useEffect(() => {
    if (!draftHydrated.current || submitting) {
      return;
    }

    const timer = window.setTimeout(
      () =>
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...draft,
            step,
          }),
        ),
      500,
    );

    return () => window.clearTimeout(timer);
  }, [
    draft,
    draftKey,
    step,
    submitting,
  ]);

  const update = (
    key: keyof ContractDraft,
    value: never,
  ) => {
    setDraft((prev) => {
      const updated = {
        ...prev,
        [key]: value,
      };

      return updated;
    });

    setErrors((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const toggleService = (service: Option) => {
    const serviceId =
      service._id || service.id;

    if (!serviceId) return;

    const exists = draft.services.some(
      (s) => s.serviceId === serviceId,
    );

    const nextServices = exists
      ? draft.services.filter(
          (s) => s.serviceId !== serviceId,
        )
      : [
          ...draft.services,
          {
            serviceId,
            name:
              service.name ||
              service.fullName ||
              "",
            unit: service.unit || "",
            fixedPrice: formatNumberInput(
              service.defaultPrice || 0,
            ),
          },
        ];

    update(
      "services",
      nextServices as never,
    );
  };

  const next = () => {
    const stepErrors =
      validateContractStep(step, draft);

    if (
      Object.keys(stepErrors).length > 0
    ) {
      setErrors(stepErrors);
      return;
    }

    setStep((s) =>
      Math.min(4, s + 1),
    );
  };

  // Xem trước toàn bộ hợp đồng (Full draft preview)
  const handlePreviewDraft = async () => {
    try {
      setPreviewLoading(true);
      setPreviewOpen(true);

      const startDateIso =
        parseDisplayToIso(draft.startDate);

      const endDateIso =
        parseDisplayToIso(draft.endDate);

      const res = await fetchAPI(
        "/contracts/preview-draft?format=json",
        {
          method: "POST",

          headers: {
            Accept: "application/json",
          },

          body: JSON.stringify({
            roomId: draft.roomId,

            tenantId: draft.tenantId,

            startDate: startDateIso,

            endDate: endDateIso,

            fixedRentPrice:
              unformatNumber(
                draft.fixedRentPrice,
              ),

            fixedDeposit:
              unformatNumber(
                draft.fixedDeposit,
              ),

            propertyAddress:
              draft.propertyAddress?.trim() ||
              undefined,

            electricityPrice:
              unformatNumber(
                draft.electricityPrice ||
                  "3500",
              ),

            waterPrice:
              unformatNumber(
                draft.waterPrice ||
                  "15000",
              ),

            initialElectricity:
              draft.initialElectricity
                ? parseMeterReading(
                    draft.initialElectricity,
                  )
                : undefined,

            initialWater:
              draft.initialWater
                ? parseMeterReading(
                    draft.initialWater,
                  )
                : undefined,

            services:
              draft.services.map(
                (item) => ({
                  ...item,
                  fixedPrice:
                    unformatNumber(
                      item.fixedPrice,
                    ),
                }),
              ),
          }),
        },
      );

      if (res.data?.html) {
        setPreviewHtml(
          res.data.html,
        );
      } else {
        setPreviewHtml("");
      }
    } catch (err) {
      notification.error(
        getNotificationMessage(
          err,
          "Không thể tải bản xem trước hợp đồng.",
        ),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);

      const startDateIso =
        parseDisplayToIso(draft.startDate);

      const endDateIso =
        parseDisplayToIso(draft.endDate);

      if (
        !startDateIso ||
        !endDateIso ||
        !validateContractDateRange(
          startDateIso,
          endDateIso,
        )
      ) {
        notification.warning(
          t("common.error"),
        );

        setStep(2);

        return;
      }

      await fetchAPI(
        "/contracts",
        {
          method: "POST",

          body: JSON.stringify({
            ...draft,

            propertyAddress:
              draft.propertyAddress?.trim() ||
              undefined,

            startDate:
              startDateIso,

            endDate:
              endDateIso,

            fixedRentPrice:
              unformatNumber(
                draft.fixedRentPrice,
              ),

            fixedDeposit:
              unformatNumber(
                draft.fixedDeposit,
              ),

            electricityPrice:
              unformatNumber(
                draft.electricityPrice ||
                  formatNumberInput(
                    3500,
                  ),
              ),

            waterPrice:
              unformatNumber(
                draft.waterPrice ||
                  formatNumberInput(
                    15000,
                  ),
              ),

            initialElectricity:
              draft.initialElectricity
                ? parseMeterReading(
                    draft.initialElectricity,
                  ) ?? undefined
                : undefined,

            initialWater:
              draft.initialWater
                ? parseMeterReading(
                    draft.initialWater,
                  ) ?? undefined
                : undefined,

            services:
              draft.services.map(
                (item) => ({
                  ...item,

                  fixedPrice:
                    unformatNumber(
                      item.fixedPrice,
                    ),
                }),
              ),
          }),
        },
      );

      localStorage.removeItem(
        draftKey,
      );

      notification.success(
        t(
          "contracts.createdSuccess",
        ),
      );

      router.push(
        "/dashboard/contracts",
      );
    } catch (error) {
      notification.error(
        getNotificationMessage(
          error,
          t("common.error"),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraftNow = () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        ...draft,
        step,
      }),
    );

    notification.success(
      t(
        "contracts.draftSavedSuccess",
      ),
    );

    router.push(
      "/dashboard/contracts",
    );
  };

  const selectedRoom =
    rooms.find(
      (r) =>
        (r._id || r.id) ===
        draft.roomId,
    );

  const selectedNguoiThue =
    nguoiThueList.find(
      (tenant) =>
        (tenant._id ||
          tenant.id) ===
        draft.tenantId,
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HEADER */}

      <header className="calm-surface overflow-hidden bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_68%,#04100e))] p-6 text-primary-foreground sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[.16em] opacity-80">
          {t(
            "contracts.newContract",
          )}
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          {t(
            "contracts.createContract",
          )}
        </h1>

        <p className="mt-2 max-w-xl opacity-80">
          {t(
            "dashboard.property",
          )}
        </p>
      </header>

      {/* STEPS */}

      <ol
        aria-label={t(
          "contracts.title",
        )}
        className="grid grid-cols-4 gap-2"
      >
        {stepsList.map(
          (item, index) => {
            const Icon =
              STEP_ICONS[index];

            return (
              <li
                key={item.id}
                aria-current={
                  item.id === step
                    ? "step"
                    : undefined
                }
                className={`relative rounded-[16px] p-3 text-center text-sm transition sm:p-4 ${
                  item.id === step
                    ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]"
                    : item.id < step
                      ? "bg-primary/10 text-primary"
                      : "bg-card text-muted-foreground shadow-[var(--calm-shadow)]"
                }`}
              >
                <span className="flex flex-col items-center gap-1 font-bold sm:flex-row sm:justify-center sm:gap-2">
                  {item.id <
                  step ? (
                    <Check className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}

                  <span className="text-[11px] leading-tight sm:text-sm">
                    {item.label}
                  </span>
                </span>
              </li>
            );
          },
        )}
      </ol>

      {/* CONTENT */}

      <section className="calm-surface min-h-[420px] p-6 sm:p-8">
        {/* ================================================= */}
        {/* BƯỚC 1: CHỌN PHÒNG & KHÁCH THUÊ */}
        {/* ================================================= */}

        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={t(
                "common.room",
              )}
              error={errors.roomId}
            >
              <select
                className="h-11 w-full rounded-[16px] border border-input bg-background px-3"
                value={
                  draft.roomId
                }
                onChange={(e) => {
                  update(
                    "roomId",
                    e.target
                      .value as never,
                  );

                  const room =
                    rooms.find(
                      (item) =>
                        (item._id ||
                          item.id) ===
                        e.target
                          .value,
                    );

                  if (room) {
                    setDraft(
                      (value) => ({
                        ...value,

                        roomId:
                          e.target
                            .value,

                        fixedRentPrice:
                          formatNumberInput(
                            room.defaultRentPrice,
                          ),

                        fixedDeposit:
                          formatNumberInput(
                            room.defaultDeposit ||
                              room.defaultRentPrice,
                          ),

                        initialElectricity:
                          formatMeterReading(
                            room.lastElectricityReading ??
                              room.draftElectricity,
                          ),

                        initialWater:
                          formatMeterReading(
                            room.lastWaterReading ??
                              room.draftWater,
                          ),
                      }),
                    );
                  }
                }}
              >
                <option value="">
                  {t(
                    "contracts.selectRoom",
                  )}
                </option>

                {rooms.map(
                  (room) => (
                    <option
                      key={
                        room._id ||
                        room.id
                      }
                      value={
                        room._id ||
                        room.id
                      }
                    >
                      {
                        room.roomCode
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                "common.tenant",
              )}
              error={
                errors.tenantId
              }
            >
              <select
                className="h-11 w-full rounded-[16px] border border-input bg-background px-3"
                value={
                  draft.tenantId
                }
                onChange={(e) =>
                  update(
                    "tenantId",
                    e.target
                      .value as never,
                  )
                }
              >
                <option value="">
                  {t(
                    "contracts.selectTenant",
                  )}
                </option>

                {nguoiThueList.map(
                  (item) => (
                    <option
                      key={
                        item._id ||
                        item.id
                      }
                      value={
                        item._id ||
                        item.id
                      }
                    >
                      {item.fullName ||
                        item.name}{" "}
                      ·{" "}
                      {formatPhone(
                        item.phone,
                      )}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
        )}

        {/* ================================================= */}
        {/* BƯỚC 2: ĐIỀU KHOẢN THUÊ */}
        {/* ================================================= */}

        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={t(
                "contracts.startDate",
              )}
              error={
                errors.startDate
              }
            >
              <DateField
                ariaLabel={t(
                  "contracts.startDate",
                )}
                value={
                  draft.startDate
                }
                onChange={(
                  value,
                ) => {
                  update(
                    "startDate",
                    value as never,
                  );

                  const nextEndDate =
                    resolveEndDateAfterStartChange(
                      value,
                      endDateWasEdited,
                      draft.endDate,
                    );

                  if (
                    nextEndDate !==
                    draft.endDate
                  ) {
                    update(
                      "endDate",
                      nextEndDate as never,
                    );
                  }
                }}
              />
            </Field>

            <Field
              label={t(
                "contracts.endDate",
              )}
              error={
                errors.endDate
              }
            >
              <DateField
                ariaLabel={t(
                  "contracts.endDate",
                )}
                value={
                  draft.endDate
                }
                onChange={(
                  value,
                ) => {
                  setEndDateWasEdited(
                    true,
                  );

                  update(
                    "endDate",
                    value as never,
                  );
                }}
              />
            </Field>

            {[
              [
                "fixedRentPrice",
                t(
                  "contracts.rentPrice",
                ),
              ],

              // CHỈ ĐỔI LABEL, KHÔNG ĐỔI LOGIC
              [
                "fixedDeposit",
                "Tiền cọc",
              ],
            ].map(
              ([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  error={
                    errors[key]
                  }
                >
                  <Input
                    inputMode="numeric"
                    value={
                      draft[
                        key as keyof ContractDraft
                      ] as string
                    }
                    onChange={(
                      e,
                    ) =>
                      update(
                        key as keyof ContractDraft,

                        formatNumberInput(
                          e.target
                            .value,
                        ) as never,
                      )
                    }
                  />
                </Field>
              ),
            )}

            <div className="md:col-span-2">
              <Field label="Địa chỉ cơ sở / Nhà trọ">
                <Input
                  value={
                    draft.propertyAddress ||
                    ""
                  }
                  onChange={(
                    e,
                  ) =>
                    update(
                      "propertyAddress",

                      e.target
                        .value as never,
                    )
                  }
                  placeholder="VD: 123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* BƯỚC 3: ĐIỆN NƯỚC & DỊCH VỤ */}
        {/* ================================================= */}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map(
                (service) => {
                  const id =
                    service._id ||
                    service.id ||
                    "";

                  const chosen =
                    draft.services.find(
                      (s) =>
                        s.serviceId ===
                        id,
                    );

                  return (
                    <label
                      key={id}
                      className={`block cursor-pointer rounded-[20px] border p-4 transition ${
                        chosen
                          ? "border-primary bg-primary/10 shadow-[var(--calm-shadow)]"
                          : "border-border bg-card shadow-[var(--calm-shadow)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {service.name ||
                              service.fullName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {service.unit ||
                              "phòng / tháng"}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={Boolean(
                            chosen,
                          )}
                          onChange={() =>
                            toggleService(
                              service,
                            )
                          }
                          className="size-5 rounded text-primary focus:ring-primary"
                        />
                      </div>

                      {chosen && (
                        <Input
                          className="mt-3"
                          inputMode="numeric"
                          value={
                            chosen.fixedPrice
                          }
                          onChange={(
                            e,
                          ) =>
                            update(
                              "services",

                              draft.services.map(
                                (
                                  item,
                                ) =>
                                  item.serviceId ===
                                  id
                                    ? {
                                        ...item,

                                        fixedPrice:
                                          formatNumberInput(
                                            e
                                              .target
                                              .value,
                                          ),
                                      }
                                    : item,
                              ) as never,
                            )
                          }
                        />
                      )}
                    </label>
                  );
                },
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label={`${t(
                  "contracts.electricityPrice",
                )} (đ/kWh)`}
                error={
                  errors.electricityPrice
                }
              >
                <Input
                  inputMode="numeric"
                  value={
                    draft.electricityPrice
                  }
                  onChange={(e) =>
                    update(
                      "electricityPrice",

                      formatNumberInput(
                        e.target
                          .value,
                      ) as never,
                    )
                  }
                  placeholder="3.500"
                />
              </Field>

              <Field
                label={`${t(
                  "contracts.waterPrice",
                )} (đ/m³)`}
                error={
                  errors.waterPrice
                }
              >
                <Input
                  inputMode="numeric"
                  value={
                    draft.waterPrice
                  }
                  onChange={(e) =>
                    update(
                      "waterPrice",

                      formatNumberInput(
                        e.target
                          .value,
                      ) as never,
                    )
                  }
                  placeholder="15.000"
                />
              </Field>

              <Field
                label={`${t(
                  "contracts.initialElec",
                )} (kWh)`}
              >
                <Input
                  inputMode="decimal"
                  value={
                    draft.initialElectricity
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    update(
                      "initialElectricity",

                      (parseMeterReading(
                        value,
                      ) === null
                        ? value
                        : formatMeterReading(
                            value,
                          )) as never,
                    );
                  }}
                  placeholder="0"
                />
              </Field>

              <Field
                label={`${t(
                  "contracts.initialWater",
                )} (m³)`}
              >
                <Input
                  inputMode="decimal"
                  value={
                    draft.initialWater
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    update(
                      "initialWater",

                      (parseMeterReading(
                        value,
                      ) === null
                        ? value
                        : formatMeterReading(
                            value,
                          )) as never,
                    );
                  }}
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* BƯỚC 4: KÝ & XÁC NHẬN */}
        {/* ================================================= */}

        {step === 4 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Summary
                label={t(
                  "common.room",
                )}
                value={
                  selectedRoom?.roomCode ||
                  "—"
                }
              />

              <Summary
                label={t(
                  "common.tenant",
                )}
                value={
                  selectedNguoiThue?.fullName ||
                  selectedNguoiThue?.name ||
                  "—"
                }
              />

              <Summary
                label={t(
                  "invoices.period",
                )}
                value={`${draft.startDate} → ${draft.endDate}`}
              />

              <Summary
                label={t(
                  "contracts.rentPrice",
                )}
                value={formatCurrency(
                  draft.fixedRentPrice,
                )}
              />

              {/* CHỈ ĐỔI LABEL, KHÔNG ĐỔI LOGIC */}
              <Summary
                label="Tiền cọc"
                value={formatCurrency(
                  draft.fixedDeposit,
                )}
              />

              <Summary
                label="Địa chỉ cơ sở / Nhà trọ"
                value={
                  draft.propertyAddress ||
                  "Theo cài đặt"
                }
              />

              <Summary
                label={t(
                  "contracts.electricityPrice",
                )}
                value={`${
                  draft.electricityPrice ||
                  "3.500"
                }đ / kWh`}
              />

              <Summary
                label={t(
                  "contracts.waterPrice",
                )}
                value={`${
                  draft.waterPrice ||
                  "15.000"
                }đ / m³`}
              />

              <Summary
                label={t(
                  "contracts.services",
                )}
                value={`${draft.services.length} dịch vụ`}
              />
            </div>

            {/* Trạng thái chữ ký số Bên A */}

            <div
              className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
                landlordSignature
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              <div className="flex items-center gap-3">
                {landlordSignature ? (
                  <CheckCircle2 className="size-5 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 shrink-0" />
                )}

                <div>
                  <p className="text-sm font-bold">
                    {landlordSignature
                      ? "Đã sẵn sàng chữ ký số Bên A (sẽ tự động đóng dấu vào hợp đồng)"
                      : "Chưa thiết lập chữ ký mẫu Bên A"}
                  </p>

                  <p className="text-xs opacity-80">
                    {landlordSignature
                      ? "Chữ ký tay số hóa của Chủ trọ sẽ được tự động chèn vào văn bản và file PDF."
                      : "Bạn có thể vào Cài đặt tài khoản để thiết lập chữ ký mẫu tự động bất kỳ lúc nào."}
                  </p>
                </div>
              </div>

              {landlordSignature ? (
                <div className="hidden h-12 w-28 items-center justify-center rounded-lg border bg-white p-1 shadow-sm sm:flex">
                  <img
                    src={
                      landlordSignature.startsWith(
                        "data:",
                      )
                        ? landlordSignature
                        : `data:image/png;base64,${landlordSignature}`
                    }
                    alt="Chữ ký Bên A"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : null}
            </div>

            {/* Nút Xem trước toàn bộ hợp đồng */}

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <FileText className="size-6 text-primary" />

                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Xem trước toàn bộ hợp đồng
                  </h4>

                  <p className="text-xs text-muted-foreground">
                    Kiểm tra toàn văn 12 điều khoản pháp lý và chữ ký trước khi phát hành chính thức
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={
                  handlePreviewDraft
                }
                className="w-full border-primary/30 font-bold text-primary hover:bg-primary/10 sm:w-auto"
              >
                <Eye className="size-4" />

                Xem trước toàn bộ hợp đồng
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="flex justify-between gap-3">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() =>
            setStep((value) =>
              Math.max(
                1,
                value - 1,
              ),
            )
          }
        >
          <ChevronLeft className="size-4" />

          {t("common.back")}
        </Button>

        {step < 4 ? (
          <Button onClick={next}>
            {t(
              "common.confirm",
            )}

            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                saveDraftNow
              }
            >
              <Save className="size-4" />

              {t(
                "contracts.saveDraft",
              )}
            </Button>

            <Button
              disabled={
                submitting
              }
              onClick={() =>
                void submit()
              }
            >
              <PenLine className="size-4" />

              {submitting
                ? t(
                    "common.saving",
                  )
                : t(
                    "contracts.signContract",
                  )}
            </Button>
          </div>
        )}
      </footer>

      {/* ================================================= */}
      {/* MODAL XEM TRƯỚC TOÀN BỘ HỢP ĐỒNG - BẢN LỚN */}
      {/* ================================================= */}

      <Dialog
        open={previewOpen}
        onOpenChange={
          setPreviewOpen
        }
      >
        <DialogContent
          className="
            flex
            h-[95vh]
            w-[96vw]
            max-w-[96vw]
            flex-col
            overflow-hidden
            rounded-[24px]
            p-0
            sm:max-w-[96vw]
            lg:max-w-[1400px]
            xl:max-w-[1500px]
          "
        >
          {/* HEADER */}

          <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <FileText className="size-6 text-primary" />

              Xem trước toàn bộ hợp đồng
            </DialogTitle>
          </DialogHeader>

          {/* CONTENT */}

          <div className="min-h-0 flex-1 bg-muted/20 p-3">
            <div className="h-full w-full overflow-hidden rounded-[16px] border border-border bg-white">
              {previewLoading ? (
                <div className="grid h-full place-items-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-7 animate-spin text-primary" />

                    <span>
                      Đang tạo bản xem trước hợp đồng...
                    </span>
                  </div>
                </div>
              ) : previewHtml ? (
                <iframe
                  title="Xem trước toàn bộ hợp đồng"
                  srcDoc={
                    previewHtml
                  }
                  className="block h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Không có dữ liệu xem trước
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
      </Label>

      {children}

      {error ? (
        <p className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="font-bold">
        {value}
      </p>
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
  onChange: (
    value: string,
  ) => void;
}) {
  const [typed, setTyped] =
    useState(value);

  const hiddenDateRef =
    useRef<HTMLInputElement>(
      null,
    );

  useEffect(() => {
    setTyped(value);
  }, [value]);

  const isoValue =
    useMemo(() => {
      const iso =
        parseDisplayToIso(
          typed,
        );

      return iso &&
        iso.length === 10
        ? iso
        : "";
    }, [typed]);

  const handleOpenPicker =
    () => {
      if (
        hiddenDateRef.current
      ) {
        if (
          typeof hiddenDateRef
            .current
            .showPicker ===
          "function"
        ) {
          try {
            hiddenDateRef.current.showPicker();
          } catch {
            hiddenDateRef.current.focus();
          }
        } else {
          hiddenDateRef.current.focus();
        }
      }
    };

  const handlePickerChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextIso =
      e.target.value;

    if (nextIso) {
      const displayVal =
        formatIsoToDisplay(
          nextIso,
        );

      setTyped(displayVal);

      onChange(displayVal);
    }
  };

  return (
    <div className="relative">
      <Input
        aria-label={
          ariaLabel
        }
        value={typed}
        onChange={(e) => {
          const nextVal =
            formatDisplayDateInput(
              e.target.value,
            );

          setTyped(
            nextVal,
          );

          onChange(
            nextVal,
          );
        }}
        placeholder="DD/MM/YYYY"
        className="pr-10"
      />

      <input
        ref={
          hiddenDateRef
        }
        type="date"
        value={
          isoValue
        }
        onChange={
          handlePickerChange
        }
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0"
      />

      <button
        type="button"
        onClick={
          handleOpenPicker
        }
        aria-label={`Mở lịch chọn ${ariaLabel}`}
        title="Mở lịch chọn ngày"
        className="absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <CalendarDays className="size-4" />
      </button>
    </div>
  );
}