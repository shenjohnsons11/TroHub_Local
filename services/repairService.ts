import {
  RepairRequest,
  Priority,
  RepairStatus,
} from "../types/RepairRequest";

import { apiClient } from "./apiClient";
import { authService } from "./authService";

type ApiRepairRequest = {
  _id: string;

  id?: string;

  tenantId?:
    | {
        _id: string;
        fullName?: string;
        phone?: string;
      }
    | string;

  tenantName?: string;
  tenantPhone?: string;

  contractId?:
    | {
        _id: string;

        roomId?: {
          _id: string;
          roomCode?: string;
        };
      }
    | string;

  roomId?: string;

  room?: string;
  roomCode?: string;

  category?: string;
  title?: string;

  content?: string;
  description?: string;

  priority:
    | number
    | Priority;

  status:
    | number
    | RepairStatus
    | "Mới"
    | "Chờ tiếp nhận"
    | "Chờ xác nhận"
    | "Đang xử lý"
    | "Đã hoàn thành"
    | "Đã hủy";

  landlordNote?: string;

  note?: string;

  createdAt?: string;

  updatedAt?: string;

  date?: string;

  scheduledAt?: string | null;

  appointmentDate?: string;

  estimatedCost?: number;

  actualCost?: number;

  completedAt?: string | null;

  images?: Array<
    | string
    | {
        fileUrl?: string;
        url?: string;
      }
  >;
};

type RepairListResponse = {
  success: boolean;
  data: ApiRepairRequest[];
  message?: string;
};

type CreateRepairResponse = {
  success: boolean;
  message: string;
  data: ApiRepairRequest;
};

const mapPriorityFromApi = (
  priority: number | Priority,
): Priority => {
  if (typeof priority === "string") {
    return priority;
  }

  if (priority === 3) {
    return "Cao";
  }

  if (priority === 2) {
    return "Trung bình";
  }

  if (priority === 1) {
    return "Thấp";
  }

  return "Chưa phân loại";
};

const mapPriorityToApi = (
  priority?: Priority,
): number => {
  if (priority === "Cao") {
    return 3;
  }

  if (priority === "Trung bình") {
    return 2;
  }

  if (priority === "Thấp") {
    return 1;
  }

  return 0;
};

const mapStatusFromApi = (
  status: ApiRepairRequest["status"],
): RepairStatus => {
  if (
    status === "done" ||
    status === "processing" ||
    status === "pending" ||
    status === "cancelled"
  ) {
    return status;
  }

  if (
    status === 3 ||
    status === "Đã hủy"
  ) {
    return "cancelled";
  }

  if (
    status === 2 ||
    status === "Đã hoàn thành"
  ) {
    return "done";
  }

  if (
    status === 1 ||
    status === "Đang xử lý"
  ) {
    return "processing";
  }

  return "pending";
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "Không có";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Không có";
  }

  return date.toLocaleDateString(
    "vi-VN",
  );
};

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
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
};

const mapApiRepairToRepair = (
  item: ApiRepairRequest,
): RepairRequest => {
  const contract =
    item.contractId &&
    typeof item.contractId ===
      "object"
      ? item.contractId
      : undefined;

  const roomCode =
    contract?.roomId?.roomCode ||
    item.roomCode ||
    item.room ||
    "Không có";

  const roomId =
    contract?.roomId?._id ||
    item.roomId;

  const contractId =
    contract?._id ||
    (typeof item.contractId ===
    "string"
      ? item.contractId
      : undefined);

  const tenant =
    item.tenantId &&
    typeof item.tenantId ===
      "object"
      ? item.tenantId
      : undefined;

  const images =
    Array.isArray(item.images)
      ? item.images
          .map((image) => {
            if (
              typeof image ===
              "string"
            ) {
              return image;
            }

            return (
              image.fileUrl ||
              image.url ||
              ""
            );
          })
          .filter(Boolean)
      : [];

  return {
    id:
      item._id ||
      item.id ||
      "",

    contractId,

    roomId,

    room: roomCode,

    type:
      item.title ||
      item.category ||
      "",

    priority:
      mapPriorityFromApi(
        item.priority,
      ),

    description:
      item.content ||
      item.description ||
      "",

    status:
      mapStatusFromApi(
        item.status,
      ),

    createdAt:
      formatDate(
        item.createdAt ||
          item.date,
      ),

    appointmentDate:
      formatDateTime(
        item.scheduledAt ||
          item.appointmentDate,
      ),

    scheduledAt:
      item.scheduledAt ||
      undefined,

    landlordNote:
      item.landlordNote ||
      item.note ||
      "",

    estimatedCost:
      Number(
        item.estimatedCost ||
          0,
      ),

    actualCost:
      Number(
        item.actualCost ||
          0,
      ),

    completedAt:
      item.completedAt ||
      undefined,

    images,

    tenantName:
      item.tenantName ||
      tenant?.fullName ||
      "",

    tenantPhone:
      item.tenantPhone ||
      tenant?.phone ||
      "",
  };
};

export const repairService = {
  async getRequests(
    roomId?: string,
  ): Promise<
    RepairRequest[]
  > {
    try {
      const token =
        await authService.getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token đăng nhập",
        );
      }

      const response =
        await apiClient.get<RepairListResponse>(
          "/repairs/my",
          token,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Không lấy được danh sách sửa chữa",
        );
      }

      const mapped =
        (response.data || []).map(
          mapApiRepairToRepair,
        );

      if (!roomId) {
        return mapped;
      }

      return mapped.filter(
        (request) =>
          request.roomId ===
          roomId,
      );
    } catch (error) {
      console.log(
        "Lỗi lấy danh sách sửa chữa:",
        error,
      );

      throw error;
    }
  },

  async createRequest(
    request: Omit<
      RepairRequest,
      | "id"
      | "status"
      | "createdAt"
    >,
  ): Promise<
    RepairRequest[]
  > {
    try {
      const token =
        await authService.getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token đăng nhập",
        );
      }

      const response =
        await apiClient.post<CreateRepairResponse>(
          "/repairs",
          {
            roomId:
              request.roomId,

            title:
              request.type,

            content:
              request.description,

            priority:
              mapPriorityToApi(
                request.priority,
              ),

            images:
              request.images ||
              [],
          },
          token,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Gửi yêu cầu sửa chữa thất bại",
        );
      }

      return await this.getRequests(
        request.roomId,
      );
    } catch (error) {
      console.log(
        "Lỗi gửi yêu cầu sửa chữa:",
        error,
      );

      throw error;
    }
  },

  async deleteRequest(
    id: string,
  ): Promise<boolean> {
    try {
      const token =
        await authService.getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token",
        );
      }

      const response =
        await apiClient.delete<{
          success: boolean;
          message?: string;
        }>(
          `/repairs/my/${id}`,
          token,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Xóa thất bại",
        );
      }

      return true;
    } catch (error) {
      console.log(
        "Lỗi xóa yêu cầu:",
        error,
      );

      throw error;
    }
  },
};