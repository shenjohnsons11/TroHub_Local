"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";

import {
  CalendarClock,
  CheckCircle2,
  Eye,
  ImageIcon,
  Search,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";

import {
  AppLoading,
} from "@/components/app-loading";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  PageHeader,
} from "@/components/calm-ops/page-header";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Label,
} from "@/components/ui/label";

import {
  useNotification,
} from "@/hooks/use-notification";

import {
  fetchAPI,
} from "@/lib/api";

import {
  getNotificationMessage,
} from "@/lib/notification-messages";

import {
  formatCurrency,
} from "@/lib/formatters";

import {
  useLanguage,
} from "@/components/language-provider";

type Repair = {
  _id: string;
  id?: string;

  repairCode?: string;

  room?: string;
  roomCode?: string;

  sender?: string;
  tenantName?: string;
  tenantPhone?: string;

  title?: string;
  content?: string;
  description?: string;

  priority?: number;
  priorityLabel?: string;

  status:
    | number
    | string;

  statusLabel?: string;

  landlordNote?: string;

  scheduledAt?:
    | string
    | null;

  estimatedCost?: number;

  actualCost?: number;

  cost?: number;

  completedAt?:
    | string
    | null;

  images?: string[];

  createdAt?: string;

  updatedAt?: string;
};

type RepairFilter =
  | "all"
  | 0
  | 1
  | 2;

const STATUS_OPTIONS = [
  {
    value: 0,
    label: "Chờ tiếp nhận",
  },
  {
    value: 1,
    label: "Đang sửa",
  },
  {
    value: 2,
    label: "Đã hoàn thành",
  },
  {
    value: 3,
    label: "Đã hủy",
  },
];

const PRIORITY_OPTIONS = [
  {
    value: 0,
    label: "Chưa phân loại",
  },
  {
    value: 1,
    label: "Thấp",
  },
  {
    value: 2,
    label: "Trung bình",
  },
  {
    value: 3,
    label: "Cao",
  },
];

const FILTER_OPTIONS: Array<{
  value: RepairFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Tất cả",
  },
  {
    value: 0,
    label: "Chờ tiếp nhận",
  },
  {
    value: 1,
    label: "Đang sửa",
  },
  {
    value: 2,
    label: "Hoàn thành",
  },
];

function normalizeStatus(
  status: unknown,
): number {
  if (
    typeof status ===
    "number"
  ) {
    return status;
  }

  const value =
    String(
      status || "",
    ).toLowerCase();

  if (
    value === "1" ||
    value.includes(
      "processing",
    ) ||
    value.includes(
      "đang xử lý",
    ) ||
    value.includes(
      "đang sửa",
    )
  ) {
    return 1;
  }

  if (
    value === "2" ||
    value.includes(
      "completed",
    ) ||
    value.includes(
      "done",
    ) ||
    value.includes(
      "hoàn thành",
    )
  ) {
    return 2;
  }

  if (
    value === "3" ||
    value.includes(
      "cancel",
    ) ||
    value.includes(
      "hủy",
    )
  ) {
    return 3;
  }

  return 0;
}

function getStatusLabel(
  status: unknown,
) {
  const value =
    normalizeStatus(
      status,
    );

  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value ===
        value,
    )?.label ||
    "Chờ tiếp nhận"
  );
}

function getPriorityLabel(
  value?: number,
) {
  return (
    PRIORITY_OPTIONS.find(
      (item) =>
        item.value ===
        Number(value || 0),
    )?.label ||
    "Chưa phân loại"
  );
}

function formatDate(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "vi-VN",
  );
}

function formatDateTime(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function toDateTimeLocal(
  value?:
    | string
    | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset *
          60 *
          1000,
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}

export default function RepairsPage() {
  const { t } =
    useLanguage();

  const notification =
    useNotification();

  const [
    repairs,
    setRepairs,
  ] = useState<
    Repair[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<RepairFilter>(
      "all",
    );

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    selectedRepair,
    setSelectedRepair,
  ] =
    useState<Repair | null>(
      null,
    );

  const [
    updating,
    setUpdating,
  ] = useState(false);

  const [
    newStatus,
    setNewStatus,
  ] = useState(0);

  const [
    newPriority,
    setNewPriority,
  ] = useState(0);

  const [
    landlordNote,
    setLandlordNote,
  ] = useState("");

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState("");

  const [
    estimatedCost,
    setEstimatedCost,
  ] = useState("");

  const [
    actualCost,
    setActualCost,
  ] = useState("");

  const loadRepairs =
    async () => {
      try {
        setLoading(true);

        const response =
          await fetchAPI(
            "/repairs",
          );

        if (
          response.success
        ) {
          setRepairs(
            response.data ||
              [],
          );
        }
      } catch (error) {
        console.error(
          error,
        );

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
    };

  useEffect(() => {
    void loadRepairs();
  }, []);

  // ==========================
  // ĐẾM THEO TRẠNG THÁI
  // ==========================

  const statusCounts =
    useMemo(() => {
      return {
        all: repairs.length,

        pending:
          repairs.filter(
            (repair) =>
              normalizeStatus(
                repair.status,
              ) === 0,
          ).length,

        processing:
          repairs.filter(
            (repair) =>
              normalizeStatus(
                repair.status,
              ) === 1,
          ).length,

        completed:
          repairs.filter(
            (repair) =>
              normalizeStatus(
                repair.status,
              ) === 2,
          ).length,
      };
    }, [repairs]);

  const getFilterCount = (
    filter: RepairFilter,
  ) => {
    if (
      filter === "all"
    ) {
      return statusCounts.all;
    }

    if (filter === 0) {
      return statusCounts.pending;
    }

    if (filter === 1) {
      return statusCounts.processing;
    }

    return statusCounts.completed;
  };

  // ==========================
  // SEARCH + FILTER
  // ==========================

  const filteredRepairs =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();

      return repairs.filter(
        (repair) => {
          const status =
            normalizeStatus(
              repair.status,
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            status ===
              statusFilter;

          if (
            !matchesStatus
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const values = [
            repair.room,
            repair.roomCode,
            repair.sender,
            repair.tenantName,
            repair.title,
            repair.content,
            repair.description,
            repair.repairCode,
          ];

          return values.some(
            (value) =>
              String(
                value || "",
              )
                .toLowerCase()
                .includes(
                  keyword,
                ),
          );
        },
      );
    }, [
      repairs,
      searchTerm,
      statusFilter,
    ]);

  // ==========================
  // OPEN DETAIL
  // ==========================

  const openRepair =
    (
      repair: Repair,
    ) => {
      setSelectedRepair(
        repair,
      );

      setNewStatus(
        normalizeStatus(
          repair.status,
        ),
      );

      setNewPriority(
        Number(
          repair.priority ||
            0,
        ),
      );

      setLandlordNote(
        repair.landlordNote ||
          "",
      );

      setScheduledAt(
        toDateTimeLocal(
          repair.scheduledAt,
        ),
      );

      setEstimatedCost(
        repair.estimatedCost
          ? String(
              repair.estimatedCost,
            )
          : "",
      );

      setActualCost(
        repair.actualCost
          ? String(
              repair.actualCost,
            )
          : "",
      );

      setModalOpen(true);
    };

  // ==========================
  // UPDATE
  // ==========================

  const submitUpdate =
    async () => {
      if (
        !selectedRepair
      ) {
        return;
      }

      try {
        setUpdating(true);

        const response =
          await fetchAPI(
            `/repairs/${
              selectedRepair._id ||
              selectedRepair.id
            }`,
            {
              method:
                "PUT",

              body: JSON.stringify(
                {
                  status:
                    newStatus,

                  priority:
                    newPriority,

                  landlordNote:
                    landlordNote.trim(),

                  scheduledAt:
                    scheduledAt
                      ? new Date(
                          scheduledAt,
                        ).toISOString()
                      : null,

                  estimatedCost:
                    Number(
                      estimatedCost ||
                        0,
                    ),

                  actualCost:
                    Number(
                      actualCost ||
                        0,
                    ),
                },
              ),
            },
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
              "Cập nhật thất bại",
          );
        }

        notification.success(
          "Cập nhật yêu cầu sửa chữa thành công!",
        );

        setModalOpen(
          false,
        );

        setSelectedRepair(
          null,
        );

        await loadRepairs();
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
        setUpdating(
          false,
        );
      }
    };

  // ==========================
  // QUICK UPDATE
  // ==========================

  const quickStatus =
    async (
      repair: Repair,
      status: number,
    ) => {
      try {
        const response =
          await fetchAPI(
            `/repairs/${
              repair._id ||
              repair.id
            }`,
            {
              method:
                "PUT",

              body: JSON.stringify(
                {
                  status,
                },
              ),
            },
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
              "Cập nhật thất bại",
          );
        }

        notification.success(
          status === 1
            ? "Đã tiếp nhận yêu cầu."
            : "Đã hoàn thành yêu cầu.",
        );

        await loadRepairs();
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

  // ==========================
  // DELETE
  // Chỉ yêu cầu hoàn thành
  // ==========================

  const handleDeleteRepair =
    async (
      repair: Repair,
    ) => {
      if (
        normalizeStatus(
          repair.status,
        ) !== 2
      ) {
        notification.warning(
          "Chỉ có thể xóa yêu cầu đã hoàn thành.",
        );

        return;
      }

      const confirmed =
        await notification.confirm({
          title:
            "Xóa yêu cầu sửa chữa",

          message:
            "Bạn có chắc muốn xóa yêu cầu đã hoàn thành này? Thao tác này không thể hoàn tác.",

          confirmText:
            "Xóa",

          destructive:
            true,
        });

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetchAPI(
            `/repairs/${
              repair._id ||
              repair.id
            }`,
            {
              method:
                "DELETE",
            },
          );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
              "Xóa yêu cầu thất bại",
          );
        }

        notification.success(
          "Đã xóa yêu cầu sửa chữa.",
        );

        if (
          selectedRepair &&
          (selectedRepair._id ||
            selectedRepair.id) ===
            (repair._id ||
              repair.id)
        ) {
          setModalOpen(false);
          setSelectedRepair(null);
        }

        await loadRepairs();
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

  // ==========================
  // STATUS BADGE
  // ==========================

  const getStatusBadge =
    (
      status: unknown,
    ) => {
      const value =
        normalizeStatus(
          status,
        );

      if (value === 2) {
        return (
          <Badge className="border-0 bg-primary/12 text-primary">
            Đã hoàn thành
          </Badge>
        );
      }

      if (value === 1) {
        return (
          <Badge
            variant="secondary"
            className="border-0"
          >
            Đang sửa
          </Badge>
        );
      }

      if (value === 3) {
        return (
          <Badge className="border-0 bg-destructive/10 text-destructive">
            Đã hủy
          </Badge>
        );
      }

      return (
        <Badge className="border-0 bg-[var(--warning-soft)] text-warning-foreground">
          Chờ tiếp nhận
        </Badge>
      );
    };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(
          "nav.overview",
        )}
        title={t(
          "repairs.title",
        )}
        description={t(
          "repairs.subtitle",
        )}
      />

      <section className="calm-surface overflow-hidden">
        {/* SEARCH */}

        <div className="flex flex-col gap-3 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              aria-label={t(
                "common.search",
              )}
              placeholder="Tìm phòng, người thuê, sự cố..."
              className="h-11 pl-9"
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
            />
          </div>

          <p className="text-sm font-bold text-muted-foreground">
            {
              repairs.length
            }{" "}
            yêu cầu sửa chữa
          </p>
        </div>

        {/* ======================== */}
        {/* FILTER TRẠNG THÁI */}
        {/* ======================== */}

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {FILTER_OPTIONS.map(
            (filter) => {
              const active =
                statusFilter ===
                filter.value;

              return (
                <Button
                  key={String(
                    filter.value,
                  )}
                  type="button"
                  variant={
                    active
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-9 rounded-full gap-2"
                  onClick={() =>
                    setStatusFilter(
                      filter.value,
                    )
                  }
                >
                  {
                    filter.label
                  }

                  <span
                    className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getFilterCount(
                      filter.value,
                    )}
                  </span>
                </Button>
              );
            },
          )}
        </div>

        {/* TABLE */}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                Ngày gửi
              </TableHead>

              <TableHead>
                Phòng
              </TableHead>

              <TableHead>
                Sự cố
              </TableHead>

              <TableHead>
                Người thuê
              </TableHead>

              <TableHead>
                Chi phí
              </TableHead>

              <TableHead>
                Trạng thái
              </TableHead>

              <TableHead className="text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8"
                >
                  <AppLoading
                    message={t(
                      "common.loading",
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : filteredRepairs.length ===
              0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-64 text-center"
                >
                  <Image
                    src="/trohub-empty-states.png"
                    alt=""
                    width={170}
                    height={100}
                    className="mx-auto h-24 w-40 rounded-[20px] object-cover object-center"
                  />

                  <p className="mt-3 font-extrabold">
                    Không có yêu cầu
                    sửa chữa phù hợp
                  </p>

                  {statusFilter !==
                    "all" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hãy chọn trạng
                      thái khác để xem
                      yêu cầu.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredRepairs.map(
                (
                  repair,
                ) => {
                  const status =
                    normalizeStatus(
                      repair.status,
                    );

                  return (
                    <TableRow
                      key={
                        repair._id ||
                        repair.id
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        openRepair(
                          repair,
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {formatDate(
                          repair.createdAt,
                        )}
                      </TableCell>

                      <TableCell className="font-extrabold">
                        {repair.roomCode ||
                          repair.room ||
                          "-"}
                      </TableCell>

                      <TableCell className="max-w-[300px]">
                        <p className="font-bold text-foreground">
                          {repair.title ||
                            "Sự cố"}
                        </p>

                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {repair.content ||
                            repair.description ||
                            "-"}
                        </p>
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold">
                          {repair.tenantName ||
                            repair.sender ||
                            "—"}
                        </p>

                        {repair.tenantPhone ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {
                              repair.tenantPhone
                            }
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell className="font-bold">
                        {(repair.actualCost ||
                          repair.cost ||
                          0) >
                        0
                          ? formatCurrency(
                              repair.actualCost ||
                                repair.cost ||
                                0,
                            )
                          : "Chưa có"}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(
                          repair.status,
                        )}
                      </TableCell>

                      <TableCell
                        className="text-right"
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <div className="flex justify-end gap-1">
                          {/* XEM */}

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            onClick={() =>
                              openRepair(
                                repair,
                              )
                            }
                          >
                            <Eye className="size-4" />
                          </Button>

                          {/* CHỜ TIẾP NHẬN -> ĐANG SỬA */}

                          {status ===
                            0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Tiếp nhận"
                              onClick={() =>
                                void quickStatus(
                                  repair,
                                  1,
                                )
                              }
                            >
                              <Wrench className="size-4 text-primary" />
                            </Button>
                          )}

                          {/* ĐANG SỬA -> HOÀN THÀNH */}

                          {status ===
                            1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hoàn thành"
                              onClick={() =>
                                void quickStatus(
                                  repair,
                                  2,
                                )
                              }
                            >
                              <CheckCircle2 className="size-4 text-primary" />
                            </Button>
                          )}

                          {/* XÓA CHỈ HIỆN KHI HOÀN THÀNH */}

                          {status ===
                            2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Xóa yêu cầu"
                              aria-label="Xóa yêu cầu đã hoàn thành"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                void handleDeleteRepair(
                                  repair,
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                },
              )
            )}
          </TableBody>
        </Table>
      </section>

      {/* =========================== */}
      {/* MODAL CHI TIẾT */}
      {/* =========================== */}

      <Dialog
        open={modalOpen}
        onOpenChange={
          setModalOpen
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wrench className="size-5 text-primary" />

              Chi tiết yêu cầu sửa chữa
            </DialogTitle>
          </DialogHeader>

          {selectedRepair ? (
            <div className="space-y-6 pt-2">
              {/* INFO */}

              <div className="grid gap-3 rounded-[18px] bg-muted/40 p-4 sm:grid-cols-2">
                <Info
                  label="Mã yêu cầu"
                  value={
                    selectedRepair.repairCode ||
                    selectedRepair._id
                      ?.slice(-6)
                      .toUpperCase() ||
                    "-"
                  }
                />

                <Info
                  label="Ngày gửi"
                  value={formatDateTime(
                    selectedRepair.createdAt,
                  )}
                />

                <Info
                  label="Phòng"
                  value={
                    selectedRepair.roomCode ||
                    selectedRepair.room ||
                    "-"
                  }
                />

                <Info
                  label="Người thuê"
                  value={
                    selectedRepair.tenantName ||
                    selectedRepair.sender ||
                    "-"
                  }
                />

                <Info
                  label="Số điện thoại"
                  value={
                    selectedRepair.tenantPhone ||
                    "-"
                  }
                />

                <Info
                  label="Trạng thái"
                  value={getStatusLabel(
                    selectedRepair.status,
                  )}
                />
              </div>

              {/* TITLE */}

              <div>
                <Label>
                  Tên sự cố
                </Label>

                <div className="mt-2 rounded-[16px] border border-border bg-card p-3 font-bold">
                  {selectedRepair.title ||
                    "-"}
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <Label>
                  Mô tả chi tiết
                </Label>

                <div className="mt-2 min-h-24 whitespace-pre-wrap rounded-[16px] border border-border bg-card p-3 text-sm">
                  {selectedRepair.content ||
                    selectedRepair.description ||
                    "-"}
                </div>
              </div>

              {/* IMAGES */}

              {selectedRepair.images &&
              selectedRepair.images
                .length >
                0 ? (
                <div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-primary" />

                    <Label>
                      Ảnh sự cố
                    </Label>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedRepair.images.map(
                      (
                        image,
                        index,
                      ) => (
                        <a
                          key={
                            index
                          }
                          href={
                            image
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-[16px] border border-border bg-muted"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              image
                            }
                            alt={`Ảnh sự cố ${
                              index +
                              1
                            }`}
                            className="aspect-square h-full w-full object-cover"
                          />
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {/* PRIORITY + STATUS */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="repair-priority">
                    Mức độ ưu tiên
                  </Label>

                  <select
                    id="repair-priority"
                    value={
                      newPriority
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewPriority(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="flex h-11 w-full rounded-[14px] border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PRIORITY_OPTIONS.map(
                      (
                        item,
                      ) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repair-status">
                    Trạng thái
                  </Label>

                  <select
                    id="repair-status"
                    value={
                      newStatus
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewStatus(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="flex h-11 w-full rounded-[14px] border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {STATUS_OPTIONS.map(
                      (
                        item,
                      ) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* SCHEDULE */}

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="size-4" />

                    Lịch hẹn sửa
                  </span>
                </Label>

                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={
                    scheduledAt
                  }
                  onChange={(
                    event,
                  ) =>
                    setScheduledAt(
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              {/* COST */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estimatedCost">
                    Chi phí dự kiến
                  </Label>

                  <Input
                    id="estimatedCost"
                    type="number"
                    min={0}
                    placeholder="VD: 200000"
                    value={
                      estimatedCost
                    }
                    onChange={(
                      event,
                    ) =>
                      setEstimatedCost(
                        event.target
                          .value,
                      )
                    }
                  />

                  {Number(
                    estimatedCost ||
                      0,
                  ) > 0 ? (
                    <p className="text-xs font-semibold text-primary">
                      {formatCurrency(
                        Number(
                          estimatedCost,
                        ),
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualCost">
                    Chi phí thực tế
                  </Label>

                  <Input
                    id="actualCost"
                    type="number"
                    min={0}
                    placeholder="VD: 180000"
                    value={
                      actualCost
                    }
                    onChange={(
                      event,
                    ) =>
                      setActualCost(
                        event.target
                          .value,
                      )
                    }
                  />

                  {Number(
                    actualCost ||
                      0,
                  ) > 0 ? (
                    <p className="text-xs font-semibold text-primary">
                      {formatCurrency(
                        Number(
                          actualCost,
                        ),
                      )}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* NOTE */}

              <div className="space-y-2">
                <Label htmlFor="landlordNote">
                  Phản hồi của chủ trọ
                </Label>

                <textarea
                  id="landlordNote"
                  value={
                    landlordNote
                  }
                  onChange={(
                    event,
                  ) =>
                    setLandlordNote(
                      event.target
                        .value,
                    )
                  }
                  placeholder="VD: Thợ sẽ đến kiểm tra vào chiều mai..."
                  className="min-h-28 w-full resize-y rounded-[16px] border border-border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {selectedRepair.scheduledAt ? (
                <p className="text-sm text-muted-foreground">
                  Lịch hiện tại:{" "}

                  <strong className="text-foreground">
                    {formatDateTime(
                      selectedRepair.scheduledAt,
                    )}
                  </strong>
                </p>
              ) : null}

              {/* BUTTONS */}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
                {/* Nút xóa trong modal cũng chỉ hiện nếu đã hoàn thành */}

                {normalizeStatus(
                  selectedRepair.status,
                ) === 2 && (
                  <Button
                    variant="outline"
                    className="mr-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      void handleDeleteRepair(
                        selectedRepair,
                      )
                    }
                    disabled={
                      updating
                    }
                  >
                    <Trash2 className="size-4" />
                    Xóa yêu cầu
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() =>
                    setModalOpen(
                      false,
                    )
                  }
                  disabled={
                    updating
                  }
                >
                  Đóng
                </Button>

                {newStatus ===
                  3 && (
                  <div className="mr-auto flex items-center gap-2 text-sm font-semibold text-destructive">
                    <XCircle className="size-4" />
                    Yêu cầu sẽ được đánh dấu Đã hủy
                  </div>
                )}

                <Button
                  onClick={() =>
                    void submitUpdate()
                  }
                  disabled={
                    updating
                  }
                >
                  {updating
                    ? "Đang lưu..."
                    : "Lưu cập nhật"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}