import { RepairRequest, Priority, RepairStatus } from "../types/RepairRequest";
import { apiClient } from "./apiClient";
import { authService } from "./authService";

type ApiRepairRequest = {
  _id: string;
  id?: string;
  tenantId?: {
    _id: string;
    fullName?: string;
    phone?: string;
  } | string;
  contractId?: {
    _id: string;
    roomId?: {
      _id: string;
      roomCode?: string;
    };
  };
  room?: string;
  category?: string;
  title?: string;
  content?: string;
  description?: string;
  priority: number | Priority;
  status: number | RepairStatus | "Mới" | "Đang xử lý" | "Đã hoàn thành" | "Đã hủy";
  landlordNote?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  images?: Array<string | { fileUrl?: string; url?: string }>;
};

type RepairListResponse = {
  success: boolean;
  data: ApiRepairRequest[];
  message?: string;
};

type TenantPortalResponse = {
  success: boolean;
  data: {
    repairs: ApiRepairRequest[];
  };
  message?: string;
};

type CreateRepairResponse = {
  success: boolean;
  message: string;
  data: ApiRepairRequest;
};

const mapPriorityFromApi = (priority: number | Priority): Priority => {
  if (typeof priority === "string") return priority;
  if (priority === 3) return "Cao";
  if (priority === 2) return "Trung bình";
  if (priority === 1) return "Thấp";
  return "Chưa phân loại";
};

const mapPriorityToApi = (priority?: Priority): number => {
  if (priority === "Cao") return 3;
  if (priority === "Trung bình") return 2;
  if (priority === "Thấp") return 1;
  return 0;
};

const mapStatusFromApi = (status: ApiRepairRequest["status"]): RepairStatus => {
  if (status === "done" || status === "processing" || status === "pending") return status;
  if (status === "Đã hoàn thành") return "done";
  if (status === "Đang xử lý") return "processing";
  if (status === 2) return "done";
  if (status === 1) return "processing";
  return "pending";
};

const formatDate = (value?: string) => {
  if (!value) return "Không có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }

  return date.toLocaleDateString("vi-VN");
};

const mapApiRepairToRepair = (item: ApiRepairRequest): RepairRequest => {
  const roomCode = item.contractId?.roomId?.roomCode || item.room || "Không có";
  const images = Array.isArray(item.images)
    ? item.images.map((img) => typeof img === 'string' ? img : (img.fileUrl || img.url || ''))
    : [];
  return {
    id: item._id || item.id || "",
    room: roomCode,
    type: item.title || item.category || "",
    priority: mapPriorityFromApi(item.priority),
    description: item.content || item.description || "",
    status: mapStatusFromApi(item.status),
    createdAt: item.date || formatDate(item.createdAt),
    images,
  };
};

export const repairService = {
  async getRequests(): Promise<RepairRequest[]> {
    try {
      const token = await authService.getToken();
      const authUser = await authService.getAuthUser();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      if (!authUser) {
        throw new Error("Không tìm thấy thông tin user đăng nhập");
      }

      const response = await apiClient.get<TenantPortalResponse>(
        "/me",
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không lấy được danh sách sửa chữa");
      }

      const requests = response.data?.repairs || [];

      return requests.map(mapApiRepairToRepair);
    } catch (error) {
      console.log("Lỗi lấy danh sách sửa chữa từ API:", error);
      throw error;
    }
  },

  async createRequest(
    request: Omit<RepairRequest, "id" | "status" | "createdAt">
  ): Promise<RepairRequest[]> {
    try {
      const token = await authService.getToken();
      const authUser = await authService.getAuthUser();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      if (!authUser) {
        throw new Error("Không tìm thấy thông tin user đăng nhập");
      }

      const response = await apiClient.post<CreateRepairResponse>(
        "/me/repairs",
        {
          room: request.room,
          title: request.type,
          content: request.description,
          priority: mapPriorityToApi(request.priority),
          images: request.images || [],
        },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Gửi yêu cầu sửa chữa thất bại");
      }

      return await this.getRequests();
    } catch (error) {
      console.log("Lỗi gửi yêu cầu sửa chữa qua API:", error);
      throw error;
    }
  },

  async deleteRequest(id: string): Promise<boolean> {
    try {
      const token = await authService.getToken();
      if (!token) throw new Error("Không tìm thấy token");
      const response = await apiClient.delete<{ success: boolean; message?: string }>(
        `/me/repairs/${id}`,
        token
      );
      if (!response.success) throw new Error(response.message || "Xóa thất bại");
      return true;
    } catch (error) {
      console.log("Lỗi xóa yêu cầu:", error);
      throw error;
    }
  },
};
