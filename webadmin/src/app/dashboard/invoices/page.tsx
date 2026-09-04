"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fetchAPI } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Bell,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gauge,
  Loader2,
  Plus,
  ScanSearch,
  Search,
  Send,
  Trash2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  formatCurrency,
  formatMeterReading,
  parseMeterReading,
  unformatNumber,
} from "@/lib/formatters";
import { useNotification } from "@/hooks/use-notification";
import { getNotificationMessage } from "@/lib/notification-messages";
import { PageHeader } from "@/components/calm-ops/page-header";
import { useLanguage } from "@/components/language-provider";
import { InvoiceDetailDrawer } from "@/components/invoice-detail-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusText } from "@/lib/status-helpers";
import { AutomationStatusCard } from "@/components/AutomationStatusCard";
import { FEATURE_ICONS } from "@/constants/feature-icons";

type InvoiceMeterField = "electricity" | "water";

type SingleInvoiceService = {
  serviceId?: string;
  name: string;
  unit?: string;
  fixedPrice: number;
};

const DEFAULT_ELECTRICITY_PRICE = 3500;
const DEFAULT_WATER_PRICE = 15000;

const utilityPriceOrDefault = (value: unknown, fallback: number) => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : fallback;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Cannot read file"));

    reader.onerror = () =>
      reject(new Error("Cannot read file"));

    reader.readAsDataURL(file);
  });

/**
 * Chuẩn hóa services từ hợp đồng.
 * Chỉ dùng cho hóa đơn lẻ.
 */
const normalizeContractServices = (
  contract: any,
): SingleInvoiceService[] => {
  const services = Array.isArray(contract?.services)
    ? contract.services
    : [];

  return services
    .map((item: any) => {
      const populatedService =
        item?.serviceId &&
        typeof item.serviceId === "object"
          ? item.serviceId
          : null;

      const serviceId =
        populatedService?._id ||
        populatedService?.id ||
        (typeof item?.serviceId === "string"
          ? item.serviceId
          : undefined);

      const name =
        populatedService?.name ||
        item?.name ||
        item?.serviceName ||
        "";

      const unit =
        populatedService?.unit ||
        item?.unit ||
        "";

      const fixedPrice = Number(
        item?.fixedPrice ??
          item?.appliedPrice ??
          populatedService?.defaultPrice ??
          0,
      );

      return {
        serviceId,
        name,
        unit,
        fixedPrice:
          Number.isFinite(fixedPrice)
            ? fixedPrice
            : 0,
      };
    })
    .filter(
      (service: SingleInvoiceService) =>
        Boolean(service.name),
    );
};

export default function InvoicesPage() {
  const { t } = useLanguage();
  const notification = useNotification();

  const bulkFormRef =
    useRef<HTMLFormElement>(null);

  const meterImageInputRef =
    useRef<HTMLInputElement>(null);

  const pendingMeterRef = useRef<{
    contractId: string;
    room: string;
    field: InvoiceMeterField;
  } | null>(null);

  const [invoices, setInvoices] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isAddOpen, setIsAddOpen] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [issuedAt, setIssuedAt] =
    useState(() =>
      new Date().toLocaleDateString("en-CA"),
    );

  const [bulkData, setBulkData] =
    useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [bulkStep, setBulkStep] =
    useState(1);

  const [manualMeter, setManualMeter] =
    useState<{
      contractId: string;
      room: string;
      field: InvoiceMeterField;
    } | null>(null);

  const [
    manualMeterValue,
    setManualMeterValue,
  ] = useState("");

  // ============================
  // SINGLE INVOICE
  // ============================

  const [isSingleOpen, setIsSingleOpen] =
    useState(false);

  const [singleRoomId, setSingleRoomId] =
    useState("");

  const [
    singlePeriod,
    setSinglePeriod,
  ] = useState(() => {
    const d = new Date();

    return `${
      d.getMonth() + 1
    }/${d.getFullYear()}`;
  });

  const [
    singleDueDate,
    setSingleDueDate,
  ] = useState(() => {
    const due = new Date();

    due.setDate(
      due.getDate() + 7,
    );

    return due
      .toISOString()
      .split("T")[0];
  });

  const [
    singleRooms,
    setSingleRooms,
  ] = useState<any[]>([]);

  const [
    singleContracts,
    setSingleContracts,
  ] = useState<any[]>([]);

  const [
    singleSubmitting,
    setSingleSubmitting,
  ] = useState(false);

  // Meter & price states

  const [
    singleElecOld,
    setSingleElecOld,
  ] = useState("0");

  const [
    singleElecNew,
    setSingleElecNew,
  ] = useState("0");

  const [
    singleElecPrice,
    setSingleElecPrice,
  ] = useState(
    DEFAULT_ELECTRICITY_PRICE,
  );

  const [
    singleWaterOld,
    setSingleWaterOld,
  ] = useState("0");

  const [
    singleWaterNew,
    setSingleWaterNew,
  ] = useState("0");

  const [
    singleWaterPrice,
    setSingleWaterPrice,
  ] = useState(
    DEFAULT_WATER_PRICE,
  );

  const [
    singleRoomPrice,
    setSingleRoomPrice,
  ] = useState(0);

  const [
    singleTenantName,
    setSingleTenantName,
  ] = useState("");

  const [
    singleContractId,
    setSingleContractId,
  ] = useState("");

  /**
   * DỊCH VỤ ĐI KÈM CỦA HỢP ĐỒNG
   */
  const [
    singleServices,
    setSingleServices,
  ] = useState<
    SingleInvoiceService[]
  >([]);

  // Detail

  const [
    detailInvoice,
    setDetailInvoice,
  ] = useState<any>(null);

  const [
    remindingId,
    setRemindingId,
  ] = useState<string | null>(null);

  const INVOICE_STEPS = [
    {
      label: t("invoices.period"),
      icon: CalendarDays,
    },
    {
      label: t("invoices.recordMeter"),
      icon: Gauge,
    },
    {
      label: "Preview",
      icon: ScanSearch,
    },
    {
      label: t("common.send"),
      icon: Send,
    },
  ];

  useEffect(() => {
    if (isAddOpen) {
      fetchAPI(
        "/invoices/bulk-preview",
      ).then((res) => {
        if (res.success) {
          const mapped =
            res.data.map(
              (p: any) => ({
                ...p,

                electricityOldInput:
                  formatMeterReading(
                    p.electricityOld,
                  ),

                electricityNewInput:
                  formatMeterReading(
                    p.electricityDraft ||
                      p.electricityOld,
                  ),

                electricityPrice:
                  utilityPriceOrDefault(
                    p.electricityPrice,
                    DEFAULT_ELECTRICITY_PRICE,
                  ),

                waterOldInput:
                  formatMeterReading(
                    p.waterOld,
                  ),

                waterNewInput:
                  formatMeterReading(
                    p.waterDraft ||
                      p.waterOld,
                  ),

                waterPrice:
                  utilityPriceOrDefault(
                    p.waterPrice,
                    DEFAULT_WATER_PRICE,
                  ),

                discountInput: "0",

                selected: true,
              }),
            );

          setBulkData(mapped);
        }
      });

      const d = new Date();

      setTitle(
        `${t("common.month")} ${
          d.getMonth() + 1
        }/${d.getFullYear()}`,
      );
    }
  }, [isAddOpen, t]);

  const loadInvoices = async () => {
    try {
      const data =
        await fetchAPI(
          "/invoices",
        );

      if (data.success) {
        setInvoices(
          data.data,
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();

    Promise.all([
      fetchAPI("/rooms"),
      fetchAPI("/contracts"),
    ])
      .then(
        ([
          roomsRes,
          contractsRes,
        ]) => {
          if (
            roomsRes.success
          ) {
            setSingleRooms(
              roomsRes.data.filter(
                (rm: any) =>
                  rm.status === 1 ||
                  rm.status ===
                    "OCCUPIED" ||
                  rm.status ===
                    "active" ||
                  rm.currentContract,
              ),
            );
          }

          if (
            contractsRes.success
          ) {
            setSingleContracts(
              contractsRes.data ||
                [],
            );
          }
        },
      )
      .catch(() => {});
  }, []);

  /**
   * =========================================
   * CHỌN PHÒNG → LẤY HỢP ĐỒNG + DỊCH VỤ
   * =========================================
   */

  const handleSelectSingleRoom = (
    roomId: string,
  ) => {
    setSingleRoomId(
      roomId,
    );

    const room =
      singleRooms.find(
        (r: any) =>
          (r._id || r.id) ===
          roomId,
      );

    if (!room) {
      setSingleServices([]);
      return;
    }

    const contract =
      singleContracts.find(
        (c: any) =>
          c.status === 1 &&
          (typeof c.roomId ===
          "string"
            ? c.roomId ===
              roomId
            : c.roomId?._id ===
                roomId ||
              c.roomId?.id ===
                roomId),
      );

    const oldElec =
      room.lastElectricityReading ??
      0;

    const oldWater =
      room.lastWaterReading ??
      0;

    const newElec =
      room.draftElectricity !==
        undefined &&
      room.draftElectricity !==
        null &&
      room.draftElectricity !==
        ""
        ? room.draftElectricity
        : oldElec;

    const newWater =
      room.draftWater !==
        undefined &&
      room.draftWater !==
        null &&
      room.draftWater !==
        ""
        ? room.draftWater
        : oldWater;

    setSingleElecOld(
      formatMeterReading(
        oldElec,
      ),
    );

    setSingleElecNew(
      formatMeterReading(
        newElec,
      ),
    );

    setSingleWaterOld(
      formatMeterReading(
        oldWater,
      ),
    );

    setSingleWaterNew(
      formatMeterReading(
        newWater,
      ),
    );

    if (contract) {
      setSingleContractId(
        contract._id ||
          contract.id ||
          "",
      );

      setSingleTenantName(
        contract.tenantId
          ?.fullName ||
          contract.tenantName ||
          "",
      );

      setSingleElecPrice(
        contract.electricityPrice
          ? Number(
              contract.electricityPrice,
            )
          : DEFAULT_ELECTRICITY_PRICE,
      );

      setSingleWaterPrice(
        contract.waterPrice
          ? Number(
              contract.waterPrice,
            )
          : DEFAULT_WATER_PRICE,
      );

      setSingleRoomPrice(
        contract.fixedRentPrice ||
          contract.monthlyRent ||
          contract.rentAmount ||
          room.basePrice ||
          room.defaultRentPrice ||
          0,
      );

      /**
       * QUAN TRỌNG:
       * Lấy toàn bộ dịch vụ đã set trong hợp đồng.
       */
      setSingleServices(
        normalizeContractServices(
          contract,
        ),
      );
    } else {
      setSingleContractId(
        "",
      );

      setSingleTenantName(
        "",
      );

      setSingleElecPrice(
        DEFAULT_ELECTRICITY_PRICE,
      );

      setSingleWaterPrice(
        DEFAULT_WATER_PRICE,
      );

      setSingleRoomPrice(
        room.basePrice ||
          room.defaultRentPrice ||
          0,
      );

      setSingleServices(
        [],
      );
    }
  };

  // ============================
  // TÍNH TIỀN SINGLE
  // ============================

  const singleElecOldNum =
    parseMeterReading(
      singleElecOld,
    ) ?? 0;

  const singleElecNewNum =
    parseMeterReading(
      singleElecNew,
    ) ??
    singleElecOldNum;

  const singleElecUsage =
    Math.max(
      0,
      singleElecNewNum -
        singleElecOldNum,
    );

  const singleElecAmount =
    singleElecUsage *
    singleElecPrice;

  const singleWaterOldNum =
    parseMeterReading(
      singleWaterOld,
    ) ?? 0;

  const singleWaterNewNum =
    parseMeterReading(
      singleWaterNew,
    ) ??
    singleWaterOldNum;

  const singleWaterUsage =
    Math.max(
      0,
      singleWaterNewNum -
        singleWaterOldNum,
    );

  const singleWaterAmount =
    singleWaterUsage *
    singleWaterPrice;

  /**
   * TỔNG DỊCH VỤ ĐI KÈM
   */
  const singleServicesTotal =
    singleServices.reduce(
      (
        total,
        service,
      ) =>
        total +
        Number(
          service.fixedPrice ||
            0,
        ),
      0,
    );

  /**
   * TỔNG HÓA ĐƠN
   *
   * Tiền phòng
   * + điện
   * + nước
   * + dịch vụ đi kèm
   */
  const singleTotalAmount =
    singleRoomPrice +
    singleElecAmount +
    singleWaterAmount +
    singleServicesTotal;

  const handleCreateBulkInvoices =
    async (
      e: React.FormEvent,
    ) => {
      e.preventDefault();

      if (
        isSubmitting
      )
        return;

      setIsSubmitting(
        true,
      );

      try {
        const selectedItems =
          bulkData.filter(
            (x) => x.selected,
          );

        if (
          selectedItems.length ===
          0
        ) {
          throw new Error(
            t(
              "common.error",
            ),
          );
        }

        const payload = {
          invoices:
            selectedItems.map(
              (item) => ({
                contractId:
                  item.contractId,

                room:
                  item.room,

                tenant:
                  item.tenant,

                electricityOld:
                  parseMeterReading(
                    item.electricityOldInput,
                  ),

                electricityNew:
                  parseMeterReading(
                    item.electricityNewInput,
                  ),

                electricityPrice:
                  item.electricityPrice,

                waterOld:
                  parseMeterReading(
                    item.waterOldInput,
                  ),

                waterNew:
                  parseMeterReading(
                    item.waterNewInput,
                  ),

                waterPrice:
                  item.waterPrice,

                roomAmount:
                  item.roomAmount,

                services:
                  item.services,

                parking:
                  item.parking,

                internet:
                  item.internet,

                garbage:
                  item.garbage,

                discount:
                  unformatNumber(
                    item.discountInput,
                  ),
              }),
            ),

          period: title,

          issuedAt,
        };

        if (
          payload.invoices.some(
            (item: any) =>
              item.electricityOld ===
                null ||
              item.electricityNew ===
                null ||
              item.waterOld ===
                null ||
              item.waterNew ===
                null ||
              item.electricityNew <
                item.electricityOld ||
              item.waterNew <
                item.waterOld,
          )
        ) {
          throw new Error(
            t(
              "common.error",
            ),
          );
        }

        await fetchAPI(
          "/invoices/bulk",
          {
            method: "POST",

            body: JSON.stringify(
              payload,
            ),
          },
        );

        notification.success(
          t(
            "common.success",
          ),
        );

        setIsAddOpen(
          false,
        );

        loadInvoices();
      } catch (err: unknown) {
        notification.error(
          getNotificationMessage(
            err,
            t(
              "common.error",
            ),
          ),
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const handleMarkPaid =
    async (id: string) => {
      try {
        await fetchAPI(
          `/invoices/${id}`,
          {
            method: "PUT",

            body: JSON.stringify(
              {
                status:
                  "Đã thanh toán",
              },
            ),
          },
        );

        notification.success(
          t(
            "common.success",
          ),
        );

        loadInvoices();
      } catch (err: unknown) {
        notification.error(
          getNotificationMessage(
            err,
            t(
              "common.error",
            ),
          ),
        );
      }
    };

  const handleDelete =
    async (id: string) => {
      const confirmed =
        await notification.confirm(
          {
            title: t(
              "common.delete",
            ),

            message: t(
              "common.confirm",
            ),

            confirmText:
              t(
                "common.delete",
              ),

            destructive:
              true,
          },
        );

      if (!confirmed)
        return;

      try {
        await fetchAPI(
          `/invoices/${id}`,
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

        loadInvoices();
      } catch (err: unknown) {
        notification.error(
          getNotificationMessage(
            err,
            t(
              "common.error",
            ),
          ),
        );
      }
    };

  /**
   * ===============================================
   * TẠO HÓA ĐƠN LẺ
   * ===============================================
   */

  const handleCreateSingleInvoice =
    async (
      e: React.FormEvent,
    ) => {
      e.preventDefault();

      if (
        !singleRoomId ||
        !singlePeriod ||
        !singleDueDate
      ) {
        notification.error(
          t(
            "common.error",
          ),
        );

        return;
      }

      const electricityOld =
        parseMeterReading(
          singleElecOld,
        );

      const electricityNew =
        parseMeterReading(
          singleElecNew,
        );

      const waterOld =
        parseMeterReading(
          singleWaterOld,
        );

      const waterNew =
        parseMeterReading(
          singleWaterNew,
        );

      if (
        electricityOld ===
          null ||
        electricityNew ===
          null ||
        waterOld === null ||
        waterNew === null ||
        electricityNew <
          electricityOld ||
        waterNew < waterOld
      ) {
        notification.error(
          "Chỉ số kỳ này phải hợp lệ và không nhỏ hơn chỉ số kỳ trước.",
        );

        return;
      }

      setSingleSubmitting(
        true,
      );

      try {
        const payload = {
          roomId:
            singleRoomId,

          contractId:
            singleContractId ||
            undefined,

          period:
            singlePeriod,

          dueDate:
            singleDueDate,

          electricityOld,

          electricityNew,

          electricityPrice:
            singleElecPrice,

          waterOld,

          waterNew,

          waterPrice:
            singleWaterPrice,

          roomAmount:
            singleRoomPrice,

          /**
           * Danh sách dịch vụ thực tế
           * trong hợp đồng.
           */
          serviceItems:
            singleServices.map(
              (service) => ({
                serviceId:
                  service.serviceId,

                name:
                  service.name,

                unit:
                  service.unit,

                fixedPrice:
                  service.fixedPrice,

                amount:
                  service.fixedPrice,
              }),
            ),

          /**
           * Tổng tiền dịch vụ.
           * Giữ riêng để backend dễ tính.
           */
          servicesAmount:
            singleServicesTotal,

          status: 1,
        };

        await fetchAPI(
          "/invoices",
          {
            method:
              "POST",

            body: JSON.stringify(
              payload,
            ),
          },
        );

        notification.success(
          t(
            "common.success",
          ),
        );

        setIsSingleOpen(
          false,
        );

        loadInvoices();
      } catch (err) {
        notification.error(
          getNotificationMessage(
            err,
            t(
              "common.error",
            ),
          ),
        );
      } finally {
        setSingleSubmitting(
          false,
        );
      }
    };

  const handleRemind =
    async (
      invoiceId: string,
      e: React.MouseEvent,
    ) => {
      e.stopPropagation();

      try {
        setRemindingId(
          invoiceId,
        );

        await fetchAPI(
          `/invoices/${invoiceId}/remind`,
          {
            method:
              "POST",
          },
        );

        notification.success(
          t(
            "invoices.reminderSent",
          ),
        );
      } catch (err) {
        notification.error(
          getNotificationMessage(
            err,
            t(
              "common.error",
            ),
          ),
        );
      } finally {
        setRemindingId(
          null,
        );
      }
    };

  const getStatusBadge = (
    status: string,
  ) => {
    const label =
      getStatusText(
        "invoice",
        status,
        t,
      );

    const normalized =
      String(status).toLowerCase();

    if (
      normalized.includes(
        "paid",
      ) ||
      normalized.includes(
        "đã thanh toán",
      )
    ) {
      return (
        <Badge className="border-0 bg-primary/10 text-primary">
          {label}
        </Badge>
      );
    }

    if (
      normalized.includes(
        "overdue",
      ) ||
      normalized.includes(
        "quá hạn",
      )
    ) {
      return (
        <Badge className="border-0 bg-destructive/10 text-destructive">
          {label}
        </Badge>
      );
    }

    return (
      <Badge className="border-0 bg-[var(--warning-soft)] text-warning-foreground">
        {label}
      </Badge>
    );
  };

  const filteredInvoices =
    invoices.filter((i) => {
      const roomStr =
        i.contractId
          ?.roomId
          ?.roomCode ||
        i.room ||
        i.roomCode ||
        "";

      return roomStr
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase(),
        );
    });

  const nextBulkStep =
    () => {
      if (
        !bulkFormRef.current?.reportValidity()
      )
        return;

      setBulkStep(
        (current) =>
          Math.min(
            4,
            current + 1,
          ),
      );
    };

  const beginMeterCapture = (
    contractId: string,
    room: string,
    field: InvoiceMeterField,
  ) => {
    pendingMeterRef.current =
      {
        contractId,
        room,
        field,
      };

    meterImageInputRef.current?.click();
  };

  const handleMeterImage =
    async (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      const target =
        pendingMeterRef.current;

      pendingMeterRef.current =
        null;

      event.target.value =
        "";

      if (
        !file ||
        !target
      )
        return;

      try {
        const image =
          await fileToDataUrl(
            file,
          );

        const result =
          await fetchAPI(
            "/ocr/meter",
            {
              method:
                "POST",

              body: JSON.stringify(
                {
                  image,
                },
              ),
            },
          );

        if (
          !result.data
            ?.digits
        ) {
          throw new Error(
            "Cannot read digits",
          );
        }

        setBulkData(
          (current) =>
            current.map(
              (item) =>
                item.contractId ===
                target.contractId
                  ? {
                      ...item,

                      [target.field ===
                      "electricity"
                        ? "electricityNewInput"
                        : "waterNewInput"]:
                        formatMeterReading(
                          result
                            .data
                            .digits,
                        ),
                    }
                  : item,
            ),
        );

        notification.success(
          t(
            "invoices.ocrSuccess",
          ),
        );
      } catch {
        setManualMeter(
          target,
        );

        setManualMeterValue(
          "",
        );

        notification.warning(
          t(
            "invoices.ocrError",
          ),
        );
      }
    };

  const applyManualMeter =
    (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !manualMeter ||
        !manualMeterValue.trim()
      )
        return;

      setBulkData(
        (current) =>
          current.map(
            (item) =>
              item.contractId ===
              manualMeter.contractId
                ? {
                    ...item,

                    [manualMeter.field ===
                    "electricity"
                      ? "electricityNewInput"
                      : "waterNewInput"]:
                      formatMeterReading(
                        manualMeterValue,
                      ),
                  }
                : item,
          ),
      );

      setManualMeter(
        null,
      );

      setManualMeterValue(
        "",
      );
    };

  return (
    <div className="space-y-6">
      <input
        ref={meterImageInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleMeterImage}
        tabIndex={-1}
      />

      <PageHeader
        eyebrow={t("nav.overview")}
        title={t("invoices.title")}
        description={t("invoices.subtitle")}
        iconToken={FEATURE_ICONS.invoices}
      />
      <AutomationStatusCard />

      <section className="calm-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder={t(
              "common.search",
            )}
            className="pl-9"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value,
              )
            }
          />
        </div>

        <div className="flex items-center gap-2">
          {/* =============================== */}
          {/* HÓA ĐƠN LẺ */}
          {/* =============================== */}

          <Dialog
            open={
              isSingleOpen
            }
            onOpenChange={
              setIsSingleOpen
            }
          >
            <DialogTrigger className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold transition hover:bg-accent">
              <Plus className="size-4" />

              {t(
                "invoices.createSingle",
              )}
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>
                  {t(
                    "invoices.createSingle",
                  )}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={
                  handleCreateSingleInvoice
                }
                className="mt-4 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="singleRoom">
                      {t(
                        "common.room",
                      )}{" "}
                      *
                    </Label>

                    <select
                      id="singleRoom"
                      value={
                        singleRoomId
                      }
                      onChange={(
                        e,
                      ) =>
                        handleSelectSingleRoom(
                          e.target
                            .value,
                        )
                      }
                      required
                      className="h-10 w-full rounded-[12px] border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">
                        --{" "}
                        {t(
                          "common.room",
                        )}{" "}
                        --
                      </option>

                      {singleRooms.map(
                        (
                          r: any,
                        ) => (
                          <option
                            key={
                              r._id ||
                              r.id
                            }
                            value={
                              r._id ||
                              r.id
                            }
                          >
                            Phòng{" "}
                            {
                              r.roomCode
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="singlePeriod">
                      {t(
                        "invoices.period",
                      )}{" "}
                      *
                    </Label>

                    <Input
                      id="singlePeriod"
                      placeholder="VD: 7/2026"
                      value={
                        singlePeriod
                      }
                      onChange={(
                        e,
                      ) =>
                        setSinglePeriod(
                          e.target
                            .value,
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="singleDue">
                    {t(
                      "invoices.dueDate",
                    )}{" "}
                    *
                  </Label>

                  <Input
                    id="singleDue"
                    type="date"
                    value={
                      singleDueDate
                    }
                    onChange={(
                      e,
                    ) =>
                      setSingleDueDate(
                        e.target
                          .value,
                      )
                    }
                    required
                  />
                </div>

                {singleTenantName ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                    <span className="font-bold text-primary">
                      Khách thuê:{" "}
                    </span>

                    <span className="font-semibold text-foreground">
                      {
                        singleTenantName
                      }
                    </span>
                  </div>
                ) : null}

                {/* ============================== */}
                {/* ĐIỆN */}
                {/* ============================== */}

                <div className="space-y-3 rounded-[16px] border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500">
                      ⚡ Điện tiêu thụ
                    </span>

                    <span className="text-xs font-extrabold text-foreground">
                      {
                        singleElecUsage
                      }{" "}
                      kWh ={" "}
                      <span className="text-amber-500">
                        {formatCurrency(
                          singleElecAmount,
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Chỉ số cũ
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleElecOld
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleElecOld(
                            formatMeterReading(
                              e
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Chỉ số mới
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleElecNew
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleElecNew(
                            formatMeterReading(
                              e
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Đơn giá
                        (đ/kWh)
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleElecPrice
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleElecPrice(
                            Number(
                              e
                                .target
                                .value,
                            ) ||
                              0,
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ============================== */}
                {/* NƯỚC */}
                {/* ============================== */}

                <div className="space-y-3 rounded-[16px] border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-500">
                      💧 Nước tiêu thụ
                    </span>

                    <span className="text-xs font-extrabold text-foreground">
                      {
                        singleWaterUsage
                      }{" "}
                      m³ ={" "}
                      <span className="text-blue-500">
                        {formatCurrency(
                          singleWaterAmount,
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Chỉ số cũ
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleWaterOld
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleWaterOld(
                            formatMeterReading(
                              e
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Chỉ số mới
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleWaterNew
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleWaterNew(
                            formatMeterReading(
                              e
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Đơn giá
                        (đ/m³)
                      </Label>

                      <Input
                        inputMode="numeric"
                        value={
                          singleWaterPrice
                        }
                        onChange={(
                          e,
                        ) =>
                          setSingleWaterPrice(
                            Number(
                              e
                                .target
                                .value,
                            ) ||
                              0,
                          )
                        }
                        className="mt-1 h-9 text-xs font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================== */}
                {/* DỊCH VỤ ĐI KÈM */}
                {/* ======================================== */}

                {singleServices.length >
                0 ? (
                  <div className="overflow-hidden rounded-[16px] border border-primary/20 bg-primary/[0.03]">
                    <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-foreground">
                          Dịch vụ đi kèm
                        </p>

                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                          {
                            singleServices.length
                          }{" "}
                          dịch vụ theo
                          hợp đồng
                        </p>
                      </div>

                      <span className="text-sm font-black text-primary">
                        {formatCurrency(
                          singleServicesTotal,
                        )}
                      </span>
                    </div>

                    <div>
                      {singleServices.map(
                        (
                          service,
                          index,
                        ) => (
                          <div
                            key={
                              service.serviceId ||
                              `${service.name}-${index}`
                            }
                            className={`flex items-center justify-between gap-3 px-4 py-3 ${
                              index !==
                              singleServices.length -
                                1
                                ? "border-b border-border/60"
                                : ""
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                                <Check className="size-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">
                                  {
                                    service.name
                                  }
                                </p>

                                {service.unit ? (
                                  <p className="text-[11px] text-muted-foreground">
                                    {service.unit ===
                                    "month"
                                      ? "Theo tháng"
                                      : service.unit}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground">
                                    Theo hợp
                                    đồng
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="shrink-0 text-sm font-black text-primary">
                              {formatCurrency(
                                service.fixedPrice,
                              )}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : singleRoomId &&
                  singleContractId ? (
                  <div className="rounded-[16px] border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Hợp đồng này
                    không có dịch vụ
                    đi kèm.
                  </div>
                ) : null}

                {/* ============================== */}
                {/* TIỀN PHÒNG + TỔNG */}
                {/* ============================== */}

                <div className="space-y-3 rounded-[16px] border border-border/60 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="singleRoomPrice"
                      className="text-xs font-bold text-muted-foreground"
                    >
                      Tiền thuê phòng
                    </Label>

                    <Input
                      id="singleRoomPrice"
                      type="number"
                      value={
                        singleRoomPrice
                      }
                      onChange={(
                        e,
                      ) =>
                        setSingleRoomPrice(
                          Number(
                            e
                              .target
                              .value,
                          ) ||
                            0,
                        )
                      }
                      className="h-9 w-36 text-right text-xs font-black"
                    />
                  </div>

                  {singleServicesTotal >
                  0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        Dịch vụ đi
                        kèm
                      </span>

                      <span className="text-sm font-black text-foreground">
                        {formatCurrency(
                          singleServicesTotal,
                        )}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between border-t border-border/50 pt-3">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Tổng tiền thanh
                      toán
                    </span>

                    <span className="text-xl font-black text-emerald-500">
                      {formatCurrency(
                        singleTotalAmount,
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    singleSubmitting
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-primary text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-60"
                >
                  {singleSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />

                      {t(
                        "common.loading",
                      )}
                    </>
                  ) : (
                    t(
                      "invoices.createInvoice",
                    )
                  )}
                </button>
              </form>
            </DialogContent>
          </Dialog>

          {/* =============================== */}
          {/* BULK - GIỮ NGUYÊN */}
          {/* =============================== */}

          <Dialog
            open={isAddOpen}
            onOpenChange={(
              open,
            ) => {
              setIsAddOpen(
                open,
              );

              if (open)
                setBulkStep(
                  1,
                );
            }}
          >
            <DialogTrigger className="flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--calm-shadow)] transition hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />

              {t(
                "invoices.createBulk",
              )}
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">
              <DialogHeader>
                <DialogTitle>
                  {t(
                    "invoices.createBulk",
                  )}
                </DialogTitle>
              </DialogHeader>

              <ol
                aria-label={t(
                  "invoices.createBulk",
                )}
                className="mt-3 grid grid-cols-4 gap-2"
              >
                {INVOICE_STEPS.map(
                  (
                    {
                      label,
                      icon: Icon,
                    },
                    index,
                  ) => {
                    const itemStep =
                      index + 1;

                    return (
                      <li
                        key={
                          label
                        }
                        aria-current={
                          itemStep ===
                          bulkStep
                            ? "step"
                            : undefined
                        }
                        className={`rounded-[16px] p-3 text-center transition ${
                          itemStep ===
                          bulkStep
                            ? "bg-primary text-primary-foreground shadow-[var(--calm-shadow)]"
                            : itemStep <
                                bulkStep
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="mx-auto size-5" />

                        <span className="mt-1 block text-[11px] font-bold leading-tight sm:text-sm">
                          {
                            label
                          }
                        </span>
                      </li>
                    );
                  },
                )}
              </ol>

              <form
                ref={
                  bulkFormRef
                }
                onSubmit={
                  handleCreateBulkInvoices
                }
                className="mt-5 space-y-5"
              >
                {bulkStep ===
                  1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        {t(
                          "invoices.period",
                        )}{" "}
                        *
                      </Label>

                      <Input
                        id="title"
                        value={
                          title
                        }
                        onChange={(
                          e,
                        ) =>
                          setTitle(
                            e
                              .target
                              .value,
                          )
                        }
                        required
                        placeholder="VD: Tháng 6/2026"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuedAt">
                        {t(
                          "invoices.issuedAt",
                        )}{" "}
                        *
                      </Label>

                      <Input
                        id="issuedAt"
                        type="date"
                        max={new Date().toLocaleDateString(
                          "en-CA",
                        )}
                        value={
                          issuedAt
                        }
                        onChange={(
                          e,
                        ) =>
                          setIssuedAt(
                            e
                              .target
                              .value,
                          )
                        }
                        required
                      />
                    </div>
                  </div>
                )}

                {bulkStep ===
                  2 && (
                  <div className="calm-workbench">
                    <Table>
                      <TableHeader className="bg-background">
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              aria-label={t(
                                "common.all",
                              )}
                              type="checkbox"
                              checked={
                                bulkData.length >
                                  0 &&
                                bulkData.every(
                                  (
                                    x,
                                  ) =>
                                    x.selected,
                                )
                              }
                              onChange={(
                                e,
                              ) =>
                                setBulkData(
                                  bulkData.map(
                                    (
                                      x,
                                    ) => ({
                                      ...x,
                                      selected:
                                        e
                                          .target
                                          .checked,
                                    }),
                                  ),
                                )
                              }
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                          </TableHead>

                          <TableHead className="whitespace-nowrap font-semibold">
                            {t(
                              "common.room",
                            )}
                          </TableHead>

                          <TableHead className="whitespace-nowrap font-semibold">
                            {t(
                              "utilities.oldElec",
                            )}
                          </TableHead>

                          <TableHead className="whitespace-nowrap font-semibold">
                            {t(
                              "utilities.newElec",
                            )}
                          </TableHead>

                          <TableHead className="whitespace-nowrap font-semibold">
                            {t(
                              "utilities.oldWater",
                            )}
                          </TableHead>

                          <TableHead className="whitespace-nowrap font-semibold">
                            {t(
                              "utilities.newWater",
                            )}
                          </TableHead>

                          <TableHead className="whitespace-nowrap text-right font-semibold">
                            {t(
                              "invoices.totalAmount",
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {bulkData.length ===
                        0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={
                                7
                              }
                              className="py-4 text-center"
                            >
                              {t(
                                "common.noData",
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          bulkData.map(
                            (
                              item,
                              index,
                            ) => {
                              const eOld =
                                parseMeterReading(
                                  item.electricityOldInput,
                                ) ??
                                0;

                              const eNew =
                                parseMeterReading(
                                  item.electricityNewInput,
                                ) ??
                                eOld;

                              const eUsage =
                                Math.max(
                                  0,
                                  eNew -
                                    eOld,
                                );

                              const eAmt =
                                Math.round(
                                  eUsage *
                                    (item.electricityPrice ||
                                      0),
                                );

                              const wOld =
                                parseMeterReading(
                                  item.waterOldInput,
                                ) ??
                                0;

                              const wNew =
                                parseMeterReading(
                                  item.waterNewInput,
                                ) ??
                                wOld;

                              const wUsage =
                                Math.max(
                                  0,
                                  wNew -
                                    wOld,
                                );

                              const wAmt =
                                Math.round(
                                  wUsage *
                                    (item.waterPrice ||
                                      0),
                                );

                              const dsc =
                                unformatNumber(
                                  item.discountInput,
                                );

                              const total =
                                (item.roomAmount ||
                                  0) +
                                eAmt +
                                wAmt +
                                (item.services ||
                                  0) +
                                (item.parking ||
                                  0) +
                                (item.internet ||
                                  0) +
                                (item.garbage ||
                                  0) -
                                dsc;

                              return (
                                <TableRow
                                  key={
                                    item.contractId
                                  }
                                  className={
                                    !item.selected
                                      ? "opacity-50"
                                      : ""
                                  }
                                >
                                  <TableCell>
                                    <input
                                      aria-label={
                                        item.room
                                      }
                                      type="checkbox"
                                      checked={
                                        item.selected
                                      }
                                      onChange={(
                                        e,
                                      ) => {
                                        const updated =
                                          [
                                            ...bulkData,
                                          ];

                                        updated[
                                          index
                                        ].selected =
                                          e.target.checked;

                                        setBulkData(
                                          updated,
                                        );
                                      }}
                                      className="rounded border-border text-primary focus:ring-primary"
                                    />
                                  </TableCell>

                                  <TableCell className="font-medium">
                                    {
                                      item.room
                                    }
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="h-10 w-24 bg-card px-2 text-sm"
                                        inputMode="decimal"
                                        value={
                                          item.electricityOldInput
                                        }
                                        onChange={(
                                          e,
                                        ) => {
                                          const u =
                                            [
                                              ...bulkData,
                                            ];

                                          const value =
                                            e
                                              .target
                                              .value;

                                          u[
                                            index
                                          ].electricityOldInput =
                                            parseMeterReading(
                                              value,
                                            ) ===
                                            null
                                              ? value
                                              : formatMeterReading(
                                                  value,
                                                );

                                          setBulkData(
                                            u,
                                          );
                                        }}
                                      />

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-11 whitespace-nowrap px-2 text-xs"
                                        aria-label={t(
                                          "utilities.scanCamera",
                                        )}
                                        onClick={() =>
                                          beginMeterCapture(
                                            item.contractId,
                                            item.room,
                                            "electricity",
                                          )
                                        }
                                      >
                                        📷
                                      </Button>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      className="h-10 w-24 bg-card px-2 text-sm"
                                      inputMode="decimal"
                                      value={
                                        item.electricityNewInput
                                      }
                                      onChange={(
                                        e,
                                      ) => {
                                        const u =
                                          [
                                            ...bulkData,
                                          ];

                                        const value =
                                          e
                                            .target
                                            .value;

                                        u[
                                          index
                                        ].electricityNewInput =
                                          parseMeterReading(
                                            value,
                                          ) ===
                                          null
                                            ? value
                                            : formatMeterReading(
                                                value,
                                              );

                                        setBulkData(
                                          u,
                                        );
                                      }}
                                    />

                                    <Label
                                      className="mt-1 block text-[10px] text-muted-foreground"
                                      htmlFor={`electricity-price-${item.contractId}`}
                                    >
                                      {formatCurrency(
                                        item.electricityPrice,
                                      )}
                                    </Label>

                                    <Input
                                      id={`electricity-price-${item.contractId}`}
                                      className="mt-1 h-10 w-24 bg-card px-2 text-xs"
                                      inputMode="numeric"
                                      value={
                                        item.electricityPrice
                                      }
                                      onChange={(
                                        e,
                                      ) => {
                                        const u =
                                          [
                                            ...bulkData,
                                          ];

                                        u[
                                          index
                                        ].electricityPrice =
                                          utilityPriceOrDefault(
                                            unformatNumber(
                                              e
                                                .target
                                                .value,
                                            ),
                                            DEFAULT_ELECTRICITY_PRICE,
                                          );

                                        setBulkData(
                                          u,
                                        );
                                      }}
                                    />

                                    <p className="mt-1 text-[10px] font-semibold text-primary">
                                      {formatMeterReading(
                                        eUsage,
                                      )}{" "}
                                      kWh ·{" "}
                                      {formatCurrency(
                                        eAmt,
                                      )}
                                    </p>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="h-10 w-24 bg-card px-2 text-sm"
                                        inputMode="decimal"
                                        value={
                                          item.waterOldInput
                                        }
                                        onChange={(
                                          e,
                                        ) => {
                                          const u =
                                            [
                                              ...bulkData,
                                            ];

                                          const value =
                                            e
                                              .target
                                              .value;

                                          u[
                                            index
                                          ].waterOldInput =
                                            parseMeterReading(
                                              value,
                                            ) ===
                                            null
                                              ? value
                                              : formatMeterReading(
                                                  value,
                                                );

                                          setBulkData(
                                            u,
                                          );
                                        }}
                                      />

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-11 whitespace-nowrap px-2 text-xs"
                                        aria-label={t(
                                          "utilities.scanCamera",
                                        )}
                                        onClick={() =>
                                          beginMeterCapture(
                                            item.contractId,
                                            item.room,
                                            "water",
                                          )
                                        }
                                      >
                                        📷
                                      </Button>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      className="h-10 w-24 bg-card px-2 text-sm"
                                      inputMode="decimal"
                                      value={
                                        item.waterNewInput
                                      }
                                      onChange={(
                                        e,
                                      ) => {
                                        const u =
                                          [
                                            ...bulkData,
                                          ];

                                        const value =
                                          e
                                            .target
                                            .value;

                                        u[
                                          index
                                        ].waterNewInput =
                                          parseMeterReading(
                                            value,
                                          ) ===
                                          null
                                            ? value
                                            : formatMeterReading(
                                                value,
                                              );

                                        setBulkData(
                                          u,
                                        );
                                      }}
                                    />

                                    <Label
                                      className="mt-1 block text-[10px] text-muted-foreground"
                                      htmlFor={`water-price-${item.contractId}`}
                                    >
                                      {formatCurrency(
                                        item.waterPrice,
                                      )}
                                    </Label>

                                    <Input
                                      id={`water-price-${item.contractId}`}
                                      className="mt-1 h-10 w-24 bg-card px-2 text-xs"
                                      inputMode="numeric"
                                      value={
                                        item.waterPrice
                                      }
                                      onChange={(
                                        e,
                                      ) => {
                                        const u =
                                          [
                                            ...bulkData,
                                          ];

                                        u[
                                          index
                                        ].waterPrice =
                                          utilityPriceOrDefault(
                                            unformatNumber(
                                              e
                                                .target
                                                .value,
                                            ),
                                            DEFAULT_WATER_PRICE,
                                          );

                                        setBulkData(
                                          u,
                                        );
                                      }}
                                    />

                                    <p className="mt-1 text-[10px] font-semibold text-primary">
                                      {formatMeterReading(
                                        wUsage,
                                      )}{" "}
                                      m³ ·{" "}
                                      {formatCurrency(
                                        wAmt,
                                      )}
                                    </p>
                                  </TableCell>

                                  <TableCell className="text-right font-medium text-foreground">
                                    {formatCurrency(
                                      total,
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            },
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {bulkStep ===
                  3 && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[20px] bg-primary/10 p-5">
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "invoices.period",
                        )}
                      </p>

                      <p className="mt-1 text-xl font-black">
                        {
                          title
                        }
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-muted p-5">
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "invoices.issuedAt",
                        )}
                      </p>

                      <p className="mt-1 text-xl font-black">
                        {new Date(
                          issuedAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-[var(--warning-soft)] p-5">
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "common.confirm",
                        )}
                      </p>

                      <p className="mt-1 text-3xl font-black">
                        {
                          bulkData.filter(
                            (
                              item,
                            ) =>
                              item.selected,
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                )}

                {bulkStep ===
                  4 && (
                  <div className="calm-surface bg-primary/8 p-6 text-center">
                    <Send className="mx-auto size-9 text-primary" />

                    <h3 className="mt-3 text-xl font-black">
                      {t(
                        "common.confirm",
                      )}
                    </h3>

                    <p className="mt-1 text-muted-foreground">
                      {
                        bulkData.filter(
                          (
                            item,
                          ) =>
                            item.selected,
                        ).length
                      }{" "}
                      invoices for{" "}
                      {
                        title
                      }
                    </p>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      bulkStep ===
                      1
                    }
                    onClick={() =>
                      setBulkStep(
                        (
                          current,
                        ) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />

                    {t(
                      "common.back",
                    )}
                  </Button>

                  {bulkStep <
                  4 ? (
                    <Button
                      type="button"
                      onClick={
                        nextBulkStep
                      }
                    >
                      {t(
                        "common.details",
                      )}

                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting
                      }
                    >
                      <Send className="size-4" />

                      {isSubmitting
                        ? t(
                            "common.loading",
                          )
                        : `${t(
                            "common.send",
                          )} (${
                            bulkData.filter(
                              (
                                item,
                              ) =>
                                item.selected,
                            )
                              .length
                          })`}
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* =============================== */}
      {/* DANH SÁCH HÓA ĐƠN */}
      {/* =============================== */}

      <div className="calm-workbench">
        <Table>
          <TableHeader className="bg-background">
            <TableRow>
              <TableHead className="font-semibold text-foreground">
                {t(
                  "invoices.invoiceCode",
                )}
              </TableHead>

              <TableHead className="font-semibold text-foreground">
                {t(
                  "invoices.period",
                )}
              </TableHead>

              <TableHead className="font-semibold text-foreground">
                {t(
                  "common.room",
                )}
              </TableHead>

              <TableHead className="font-semibold text-foreground">
                {t(
                  "invoices.totalAmount",
                )}
              </TableHead>

              <TableHead className="font-semibold text-foreground">
                {t(
                  "common.status",
                )}
              </TableHead>

              <TableHead className="text-right font-semibold text-foreground">
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
                    6
                  }
                  className="p-4"
                >
                  <div className="space-y-3">
                    {Array.from(
                      {
                        length:
                          3,
                      },
                      (
                        _,
                        index,
                      ) => (
                        <Skeleton
                          key={
                            index
                          }
                          className="h-12 w-full"
                        />
                      ),
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length ===
              0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    6
                  }
                  className="h-64 text-center"
                >
                  <Image
                    src="/trohub-empty-states.png"
                    alt=""
                    width={
                      170
                    }
                    height={
                      100
                    }
                    className="mx-auto h-24 w-40 rounded-[20px] object-cover object-left"
                  />

                  <p className="mt-3 font-black">
                    {t(
                      "invoices.emptyInvoices",
                    )}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map(
                (
                  invoice,
                ) => (
                  <TableRow
                    key={
                      invoice._id ||
                      invoice.id
                    }
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() =>
                      setDetailInvoice(
                        invoice,
                      )
                    }
                  >
                    <TableCell className="font-medium text-foreground">
                      {
                        invoice.invoiceCode
                      }
                    </TableCell>

                    <TableCell>
                      {
                        invoice.period
                      }
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold">
                        {invoice.roomCode ||
                          "-"}
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        {invoice.nguoiThue ||
                          "-"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {formatCurrency(
                        invoice.totalAmount,
                      )}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(
                        invoice.statusLabel ||
                          invoice.status,
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(
                          e,
                        ) =>
                          e.stopPropagation()
                        }
                      >
                        <Button
                          aria-label={t(
                            "common.details",
                          )}
                          onClick={(
                            e,
                          ) => {
                            e.stopPropagation();

                            setDetailInvoice(
                              invoice,
                            );
                          }}
                          variant="ghost"
                          size="icon"
                          title={t(
                            "common.details",
                          )}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-4" />
                        </Button>

                        {String(
                          invoice.statusLabel,
                        ).toLowerCase() !==
                          "đã thanh toán" &&
                          String(
                            invoice.statusLabel,
                          ).toLowerCase() !==
                            "paid" && (
                            <>
                              <Button
                                aria-label={t(
                                  "invoices.sendReminder",
                                )}
                                disabled={
                                  remindingId ===
                                  (invoice._id ||
                                    invoice.id)
                                }
                                onClick={(
                                  e,
                                ) =>
                                  handleRemind(
                                    invoice._id ||
                                      invoice.id,
                                    e,
                                  )
                                }
                                variant="ghost"
                                size="icon"
                                title={t(
                                  "invoices.sendReminder",
                                )}
                                className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                              >
                                {remindingId ===
                                (invoice._id ||
                                  invoice.id) ? (
                                  <Loader2 className="size-4 animate-spin text-amber-600" />
                                ) : (
                                  <Bell className="size-4" />
                                )}
                              </Button>

                              <Button
                                aria-label={t(
                                  "invoices.markPaid",
                                )}
                                onClick={(
                                  e,
                                ) => {
                                  e.stopPropagation();

                                  handleMarkPaid(
                                    invoice._id ||
                                      invoice.id,
                                  );
                                }}
                                variant="ghost"
                                size="icon"
                                title={t(
                                  "invoices.markPaid",
                                )}
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                              >
                                <CheckCircle className="size-4" />
                              </Button>
                            </>
                          )}

                        <Button
                          aria-label={t(
                            "common.delete",
                          )}
                          onClick={(
                            e,
                          ) => {
                            e.stopPropagation();

                            handleDelete(
                              invoice._id ||
                                invoice.id,
                            );
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
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

      <Dialog
        open={Boolean(
          manualMeter,
        )}
        onOpenChange={(
          open,
        ) => {
          if (!open)
            setManualMeter(
              null,
            );
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t(
                "invoices.recordMeter",
              )}{" "}
              ·{" "}
              {
                manualMeter?.room
              }
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={
              applyManualMeter
            }
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              {t(
                "invoices.ocrError",
              )}
            </p>

            <Input
              autoFocus
              inputMode="decimal"
              aria-label={
                manualMeter?.room ||
                ""
              }
              value={
                manualMeterValue
              }
              onChange={(
                event,
              ) => {
                const value =
                  event.target.value;

                setManualMeterValue(
                  parseMeterReading(
                    value,
                  ) === null
                    ? value
                    : formatMeterReading(
                        value,
                      ),
                );
              }}
              placeholder="0"
              required
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setManualMeter(
                    null,
                  )
                }
              >
                {t(
                  "common.cancel",
                )}
              </Button>

              <Button type="submit">
                {t(
                  "common.save",
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <InvoiceDetailDrawer
        invoice={
          detailInvoice
        }
        onClose={() =>
          setDetailInvoice(
            null,
          )
        }
      />
    </div>
  );
}