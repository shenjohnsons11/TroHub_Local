"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  formatCurrency,
  formatNumberInput,
  unformatNumber,
} from "@/lib/formatters";
import { getNotificationMessage } from "@/lib/notification-messages";
import { useLanguage } from "@/components/language-provider";

type Service = {
  _id: string;
  name: string;
  code: string;
  type: 1 | 2;
  billingMode?: "FIXED" | "QUANTITY" | "METER";
  unit: string;
  defaultPrice: number;
  defaultQuantity?: number;
  isActive: boolean;
};

type ServiceForm = {
  name: string;
  code: string;
  billingMode: "FIXED" | "QUANTITY" | "METER";
  unit: string;
  defaultPrice: string;
  defaultQuantity: string;
  isActive: boolean;
};

/**
 * Dịch vụ phí cố định:
 * Internet, rác, bảo vệ, gửi xe,...
 * luôn tính theo THÁNG.
 */
const FIXED_SERVICE_UNIT = "tháng";

/**
 * Chuẩn hóa dữ liệu cũ.
 *
 * month / moth / months / thang
 * => tháng
 */
const normalizeServiceUnit = (
  unit?: string,
) => {
  const value = String(
    unit || "",
  ).trim();

  const normalized =
    value.toLowerCase();

  if (
    normalized === "month" ||
    normalized === "moth" ||
    normalized === "months" ||
    normalized === "thang" ||
    normalized === "tháng"
  ) {
    return FIXED_SERVICE_UNIT;
  }

  return value;
};

const getBillingMode = (
  service: Service,
): ServiceForm["billingMode"] => {
  if (
    service.billingMode ===
      "FIXED" ||
    service.billingMode ===
      "QUANTITY" ||
    service.billingMode ===
      "METER"
  ) {
    return service.billingMode;
  }

  return service.type === 1
    ? "METER"
    : "FIXED";
};

/**
 * Đơn vị dùng để hiển thị trên bảng.
 */
const getDisplayUnit = (
  service: Service,
) => {
  const billingMode =
    getBillingMode(service);

  if (
    billingMode === "FIXED"
  ) {
    return FIXED_SERVICE_UNIT;
  }

  return (
    normalizeServiceUnit(
      service.unit,
    ) || "-"
  );
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  code: "",
  billingMode: "FIXED",

  // Không dùng "month" nữa.
  unit: FIXED_SERVICE_UNIT,

  defaultPrice: "",
  defaultQuantity: "1",
  isActive: true,
};

type PriceImpact = {
  serviceId: string;
  currentPrice: number;
  newPrice: number;
  contracts: Array<{
    contractId: string;
    roomCode: string;
    currentPrice: number;
    newPrice: number;
  }>;
};

const generateServiceCode = (
  name: string,
) => {
  return name
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      "_",
    )
    .replace(
      /^_+|_+$/g,
      "",
    );
};

export default function ServicesPage() {
  const { t } =
    useLanguage();

  const notification =
    useNotification();

  const [
    services,
    setServices,
  ] =
    useState<Service[]>([]);

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<ServiceForm>(
      EMPTY_FORM,
    );

  const [
    editingService,
    setEditingService,
  ] =
    useState<Service | null>(
      null,
    );

  const [
    priceImpact,
    setPriceImpact,
  ] =
    useState<PriceImpact | null>(
      null,
    );

  const [
    priceScope,
    setPriceScope,
  ] =
    useState<
      | "NEW_CONTRACTS_ONLY"
      | "SELECTED_ACTIVE_CONTRACTS"
    >(
      "NEW_CONTRACTS_ONLY",
    );

  const [
    selectedContractIds,
    setSelectedContractIds,
  ] =
    useState<string[]>([]);

  const loadServices =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const response =
            await fetchAPI(
              "/services",
            );

          setServices(
            response.data ?? [],
          );
        } catch (error) {
          notification.error(
            getNotificationMessage(
              error,
              t(
                "common.error",
              ),
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [
        notification,
        t,
      ],
    );

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const filteredServices =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return services;
      }

      return services.filter(
        (service) =>
          service.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          service.code
            .toLowerCase()
            .includes(
              query,
            ),
      );
    }, [
      searchTerm,
      services,
    ]);

  const openCreate =
    () => {
      setEditingId(
        null,
      );

      setEditingService(
        null,
      );

      setPriceImpact(
        null,
      );

      setSelectedContractIds(
        [],
      );

      setForm({
        ...EMPTY_FORM,
      });

      setDialogOpen(
        true,
      );
    };

  const openEdit = (
    service: Service,
  ) => {
    const billingMode =
      getBillingMode(
        service,
      );

    setEditingId(
      service._id,
    );

    setEditingService(
      service,
    );

    setPriceImpact(
      null,
    );

    setSelectedContractIds(
      [],
    );

    setForm({
      name:
        service.name,

      code:
        service.code,

      billingMode,

      /**
       * Nếu là phí cố định:
       * ép về "tháng".
       */
      unit:
        billingMode ===
        "FIXED"
          ? FIXED_SERVICE_UNIT
          : normalizeServiceUnit(
              service.unit,
            ),

      defaultPrice:
        formatNumberInput(
          service.defaultPrice,
        ),

      defaultQuantity:
        String(
          service.defaultQuantity ||
            1,
        ),

      isActive:
        service.isActive !==
        false,
    });

    setDialogOpen(
      true,
    );
  };

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      if (
        !form.name.trim() ||
        !form.code.trim()
      ) {
        notification.warning(
          t(
            "common.error",
          ),
        );

        return;
      }

      /**
       * QUAN TRỌNG:
       *
       * FIXED luôn gửi unit = "tháng".
       */
      const unit =
        form.billingMode ===
        "FIXED"
          ? FIXED_SERVICE_UNIT
          : normalizeServiceUnit(
              form.unit,
            );

      const payload = {
        name:
          form.name.trim(),

        code:
          form.code
            .trim()
            .toUpperCase(),

        billingMode:
          form.billingMode,

        unit,

        defaultPrice:
          unformatNumber(
            form.defaultPrice,
          ),

        defaultQuantity:
          form.billingMode ===
          "QUANTITY"
            ? Number(
                form.defaultQuantity ||
                  1,
              )
            : undefined,

        isActive:
          form.isActive,
      };

      try {
        setSubmitting(
          true,
        );

        if (editingId) {
          if (
            editingService &&
            payload.defaultPrice !==
              editingService.defaultPrice
          ) {
            const preview =
              await fetchAPI(
                `/services/${editingId}/price-impact`,
                {
                  method:
                    "POST",

                  body:
                    JSON.stringify(
                      {
                        newPrice:
                          payload.defaultPrice,
                      },
                    ),
                },
              );

            if (
              preview.data
                ?.contracts
                ?.length
            ) {
              setPriceImpact(
                preview.data,
              );

              setSelectedContractIds(
                preview.data.contracts.map(
                  (
                    contract: PriceImpact["contracts"][number],
                  ) =>
                    contract.contractId,
                ),
              );

              return;
            }
          }

          await fetchAPI(
            `/services/${editingId}`,
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

          notification.success(
            t(
              "common.success",
            ),
          );
        } else {
          await fetchAPI(
            "/services",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

          notification.success(
            t(
              "common.success",
            ),
          );
        }

        setDialogOpen(
          false,
        );

        await loadServices();
      } catch (error) {
        notification.error(
          getNotificationMessage(
            error,
            t(
              "common.error",
            ),
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  const applyPriceChange =
    async () => {
      if (
        !priceImpact ||
        !editingId
      ) {
        return;
      }

      try {
        setSubmitting(
          true,
        );

        /**
         * FIXED cũng phải ép "tháng"
         * ở trường hợp đổi giá.
         */
        const unit =
          form.billingMode ===
          "FIXED"
            ? FIXED_SERVICE_UNIT
            : normalizeServiceUnit(
                form.unit,
              );

        const metadataPayload =
          {
            name:
              form.name.trim(),

            code:
              form.code
                .trim()
                .toUpperCase(),

            billingMode:
              form.billingMode,

            unit,

            defaultPrice:
              editingService
                ?.defaultPrice ??
              priceImpact.currentPrice,

            defaultQuantity:
              form.billingMode ===
              "QUANTITY"
                ? Number(
                    form.defaultQuantity ||
                      1,
                  )
                : undefined,

            isActive:
              form.isActive,
          };

        await fetchAPI(
          `/services/${editingId}`,
          {
            method:
              "PUT",

            body:
              JSON.stringify(
                metadataPayload,
              ),
          },
        );

        await fetchAPI(
          `/services/${editingId}/price`,
          {
            method:
              "PUT",

            body:
              JSON.stringify(
                {
                  newPrice:
                    priceImpact.newPrice,

                  scope:
                    priceScope,

                  contractIds:
                    priceScope ===
                    "SELECTED_ACTIVE_CONTRACTS"
                      ? selectedContractIds
                      : [],
                },
              ),
          },
        );

        notification.success(
          t(
            "common.success",
          ),
        );

        setDialogOpen(
          false,
        );

        setPriceImpact(
          null,
        );

        await loadServices();
      } catch (error) {
        notification.error(
          getNotificationMessage(
            error,
            t(
              "common.error",
            ),
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  const handleDelete =
    async (
      service: Service,
    ) => {
      const confirmed =
        await notification.confirm(
          {
            title:
              t(
                "common.delete",
              ),

            message:
              `${t(
                "common.delete",
              )} ${service.name}?`,

            confirmText:
              t(
                "common.delete",
              ),

            destructive:
              true,
          },
        );

      if (!confirmed) {
        return;
      }

      try {
        await fetchAPI(
          `/services/${service._id}`,
          {
            method:
              "DELETE",
          },
        );

        notification.success(
          t(
            "common.success",
          ),
        );

        await loadServices();
      } catch (error) {
        notification.error(
          getNotificationMessage(
            error,
            t(
              "common.error",
            ),
          ),
        );
      }
    };

  return (
    <div className="space-y-6">

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
            {t(
              "nav.overview",
            )}
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-[-0.025em] text-foreground">
            {t(
              "nav.services",
            )}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "dashboard.property",
            )}
          </p>

        </div>

        <Button
          onClick={
            openCreate
          }
          className="h-10 rounded-full px-4 font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />

          {t(
            "common.add",
          )}
        </Button>

      </header>

      <section className="overflow-hidden rounded-[14px] border border-border bg-card">

        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="relative w-full sm:max-w-sm">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
              placeholder={t(
                "common.search",
              )}
              className="h-11 rounded-[10px] pl-9"
            />

          </div>

          <p className="text-sm font-semibold text-muted-foreground">
            {
              services.length
            }{" "}
            {t(
              "nav.services",
            )}
          </p>

        </div>

        <div className="overflow-x-auto">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  {t(
                    "nav.services",
                  )}
                </TableHead>

                <TableHead>
                  {t(
                    "services.billingMode",
                  )}
                </TableHead>

                <TableHead>
                  {t(
                    "services.defaultPrice",
                  )}
                </TableHead>

                <TableHead>
                  {t(
                    "common.status",
                  )}
                </TableHead>

                <TableHead className="text-right">
                  {t(
                    "common.action",
                  )}
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={
                      5
                    }
                    className="h-32 text-center text-muted-foreground"
                  >
                    {t(
                      "common.loading",
                    )}
                  </TableCell>

                </TableRow>

              ) : filteredServices.length ===
                0 ? (

                <TableRow>

                  <TableCell
                    colSpan={
                      5
                    }
                    className="h-44 text-center"
                  >
                    <Wrench className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />

                    <p className="font-bold text-foreground">
                      {t(
                        "common.noData",
                      )}
                    </p>

                  </TableCell>

                </TableRow>

              ) : (

                filteredServices.map(
                  (
                    service,
                  ) => (

                    <TableRow
                      key={
                        service._id
                      }
                    >

                      <TableCell>

                        <p className="font-bold text-foreground">
                          {
                            service.name
                          }
                        </p>

                        <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">
                          {
                            service.code
                          }
                        </p>

                      </TableCell>

                      <TableCell>

                        {service.billingMode ===
                        "QUANTITY"
                          ? t(
                              "services.billingQty",
                            )
                          : service.billingMode ===
                                "METER" ||
                              service.type ===
                                1
                            ? t(
                                "services.billingMeter",
                              )
                            : t(
                                "services.billingFixed",
                              )}

                        {" · "}

                        {getDisplayUnit(
                          service,
                        )}

                      </TableCell>

                      <TableCell className="font-bold">
                        {formatCurrency(
                          service.defaultPrice,
                        )}
                      </TableCell>

                      <TableCell>

                        <Badge
                          variant={
                            service.isActive
                              ? "default"
                              : "secondary"
                          }
                        >
                          {service.isActive
                            ? t(
                                "common.active",
                              )
                            : t(
                                "common.inactive",
                              )}
                        </Badge>

                      </TableCell>

                      <TableCell>

                        <div className="flex justify-end gap-1">

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEdit(
                                service,
                              )
                            }
                            aria-label={t(
                              "common.edit",
                            )}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              void handleDelete(
                                service,
                              )
                            }
                            aria-label={t(
                              "common.delete",
                            )}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                        </div>

                      </TableCell>

                    </TableRow>

                  ),
                )

              )}

            </TableBody>

          </Table>

        </div>

      </section>

      <Dialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
      >

        <DialogContent className="rounded-[14px] sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>
              {editingId
                ? t(
                    "common.edit",
                  )
                : t(
                    "common.add",
                  )}
            </DialogTitle>

          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5 pt-2"
          >

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2 sm:col-span-2">

                <Label htmlFor="service-name">
                  Tên dịch vụ
                </Label>

                <Input
                  id="service-name"
                  value={
                    form.name
                  }
                  onChange={(
                    event,
                  ) => {
                    const name =
                      event
                        .target
                        .value;

                    setForm({
                      ...form,

                      name,

                      code:
                        editingId
                          ? form.code
                          : generateServiceCode(
                              name,
                            ),
                    });
                  }}
                  placeholder="VD: Internet, Giữ xe, Rác..."
                />

              </div>

              <div className="space-y-2 sm:col-span-2">

                <Label htmlFor="service-type">
                  {t(
                    "services.billingMode",
                  )}
                </Label>

                <select
                  id="service-type"
                  value={
                    form.billingMode
                  }
                  onChange={(
                    event,
                  ) => {
                    const billingMode =
                      event
                        .target
                        .value as ServiceForm["billingMode"];

                    setForm({
                      ...form,

                      billingMode,

                      /**
                       * Chuyển sang phí cố định
                       * thì unit = tháng ngay.
                       */
                      unit:
                        billingMode ===
                        "FIXED"
                          ? FIXED_SERVICE_UNIT
                          : form.unit,
                    });
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >

                  <option value="FIXED">
                    {t(
                      "services.billingFixed",
                    )}
                  </option>

                  <option value="QUANTITY">
                    {t(
                      "services.billingQty",
                    )}
                  </option>

                  <option value="METER">
                    {t(
                      "services.billingMeter",
                    )}
                  </option>

                </select>

              </div>

            </div>

            <div className="space-y-2">

              <Label htmlFor="service-price">
                {t(
                  "services.defaultPrice",
                )}
              </Label>

              <Input
                id="service-price"
                inputMode="numeric"
                value={
                  form.defaultPrice
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,

                    defaultPrice:
                      formatNumberInput(
                        event
                          .target
                          .value,
                      ),
                  })
                }
                placeholder="0"
              />

              {form.billingMode ===
                "FIXED" && (
                <p className="text-xs font-medium text-muted-foreground">
                  Đơn vị tính:{" "}
                  <strong>
                    tháng
                  </strong>
                </p>
              )}

            </div>

            {form.billingMode ===
              "QUANTITY" && (

              <div className="space-y-2">

                <Label htmlFor="service-quantity">
                  {t(
                    "services.defaultQuantity",
                  )}
                </Label>

                <Input
                  id="service-quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    form.defaultQuantity
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      defaultQuantity:
                        event
                          .target
                          .value,
                    })
                  }
                />

              </div>

            )}

            {priceImpact && (

              <section className="space-y-4 rounded-[12px] bg-muted p-4">

                <div>

                  <h3 className="font-bold text-foreground">
                    {t(
                      "rooms.price",
                    )}
                  </h3>

                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">

                    {formatCurrency(
                      priceImpact.currentPrice,
                    )}

                    <ArrowRight className="h-4 w-4" />

                    <strong className="text-foreground">
                      {formatCurrency(
                        priceImpact.newPrice,
                      )}
                    </strong>

                  </p>

                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    checked={
                      priceScope ===
                      "NEW_CONTRACTS_ONLY"
                    }
                    onChange={() =>
                      setPriceScope(
                        "NEW_CONTRACTS_ONLY",
                      )
                    }
                  />

                  <span className="text-sm font-semibold">
                    {t(
                      "contracts.newContract",
                    )}
                  </span>

                </label>

                <label className="flex min-h-11 cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    checked={
                      priceScope ===
                      "SELECTED_ACTIVE_CONTRACTS"
                    }
                    onChange={() =>
                      setPriceScope(
                        "SELECTED_ACTIVE_CONTRACTS",
                      )
                    }
                  />

                  <span className="text-sm font-semibold">
                    {t(
                      "contracts.activeContracts",
                    )}
                  </span>

                </label>

              </section>

            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border p-3">

              <input
                type="checkbox"
                checked={
                  form.isActive
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,

                    isActive:
                      event
                        .target
                        .checked,
                  })
                }
                className="h-4 w-4 accent-primary"
              />

              <div>

                <p className="text-sm font-semibold text-foreground">
                  Bật dịch vụ
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cho phép sử dụng dịch vụ này khi tạo hợp đồng.
                </p>

              </div>

            </label>

            <div className="flex justify-end gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(
                    false,
                  )
                }
              >
                {t(
                  "common.cancel",
                )}
              </Button>

              {priceImpact ? (

                <Button
                  type="button"
                  onClick={() =>
                    void applyPriceChange()
                  }
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? t(
                        "common.saving",
                      )
                    : t(
                        "common.save",
                      )}
                </Button>

              ) : (

                <Button
                  type="submit"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? t(
                        "common.saving",
                      )
                    : t(
                        "common.save",
                      )}
                </Button>

              )}

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>
  );
}