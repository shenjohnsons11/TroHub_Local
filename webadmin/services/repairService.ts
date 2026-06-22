import { RepairRequest, Priority, RepairStatus } from "../types/RepairRequest";
import { apiClient } from "./apiClient";
import { authService } from "./authService";

type ApiRepairRequest = {
  _id: string;
  contractId?: {
    _id: string;
    roomId?: {
      _id: string;
      roomCode?: string;
    };
    tenantId?: {
      _id: string;
      fullName?: string;
      phone?: string;
    };
  };
  title: string;
  content: string;
  priority: number;
  status: number;
  landlordNote?: string;
  createdAt: string;
  updatedAt: string;
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

const mapPriorityFromApi = (priority: number): Priority => {
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

const mapStatusFromApi = (status: number): RepairStatus => {
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

const mapApiRepairToRepair = (item: any): RepairRequest => {
  const roomCode = item.room?.code || item.room?.roomCode || item.contractId?.roomId?.roomCode || item.room || "A101";
  const images = Array.isArray(item.images)
    ? item.images.map((img: any) => typeof img === 'string' ? img : (img.fileUrl || img.url || ''))
    : [];
  return {
    id: item._id || item.id,
    room: roomCode,
    type: item.title || item.category || "",
    priority: mapPriorityFromApi(item.priority),
    description: item.content || item.description || "",
    status: mapStatusFromApi(item.status),
    createdAt: formatDate(item.createdAt),
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

      const response = await apiClient.get<RepairListResponse>(
        "/repairs",
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không lấy được danh sách sửa chữa");
      }

      const requests = response.data || [];

      const myRequests = requests.filter((item) => {
        return item.contractId?.tenantId?._id === authUser.id;
      });

      return myRequests.map(mapApiRepairToRepair);
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
        "/repairs",
        {
          tenantId: authUser.id,
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