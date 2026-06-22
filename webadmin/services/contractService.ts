import { Contract, ContractStatus } from "../types/Contract";
import { apiClient } from "./apiClient";
import { authService } from "./authService";

type ApiRoom = {
  _id: string;
  roomCode?: string;
  area?: string;
};

type ApiTenant = {
  _id: string;
  fullName?: string;
  phone?: string;
};

type ApiServiceItem = {
  serviceId?: {
    _id: string;
    name?: string;
    unit?: string;
    type?: number;
    defaultPrice?: number;
  };
  fixedPrice?: number;
};

type ApiContract = {
  _id: string;
  roomId?: ApiRoom;
  tenantId?: ApiTenant;
  startDate: string;
  endDate: string;
  fixedRentPrice: number;
  fixedDeposit: number;
  status: number;
  services?: ApiServiceItem[];
  tenantConfirmedAt?: string;
};

type ContractListResponse = {
  success: boolean;
  data: ApiContract[];
  message?: string;
};

type ContractActionResponse = {
  success: boolean;
  message?: string;
};

const formatMoney = (value?: number) => {
  const amount = value || 0;
  return `${amount.toLocaleString("vi-VN")}đ`;
};

const formatDate = (value?: string) => {
  if (!value) return "Không có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }

  return date.toLocaleDateString("vi-VN");
};

const getMonthsDiff = (start: Date, end: Date) => {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
};

const getServicePrice = (services: ApiServiceItem[], keywords: string[]) => {
  const found = services.find((item) => {
    const name = item.serviceId?.name?.toLowerCase() || "";
    return keywords.some((keyword) => name.includes(keyword));
  });

  return found?.fixedPrice || 0;
};

const mapNumericStatus = (status: number): ContractStatus => {
  switch (status) {
    case 0: return "pending";          // Chờ khách ký
    case 1: return "active";           // Có hiệu lực
    case 2: return "expired";          // Hết hạn
    case 3: return "cancelled";        // Đã hủy
    case 4: return "awaiting_approval"; // Chờ chủ duyệt
    case 5: return "requesting_termination"; // Yêu cầu trả phòng
    default: return "pending";
  }
};

const mapApiContractToContract = (apiContract: ApiContract): Contract => {
  const services = apiContract.services || [];

  const startDate = new Date(apiContract.startDate);
  const endDate = new Date(apiContract.endDate);
  const now = new Date();

  const totalMonths = Math.max(getMonthsDiff(startDate, endDate), 1);
  const usedMonths = Math.max(getMonthsDiff(startDate, now), 0);
  const remainingMonths = Math.max(totalMonths - usedMonths, 0);

  const progressNumber = Math.min(
    Math.round((usedMonths / totalMonths) * 100),
    100
  );

  const electricPrice = getServicePrice(services, ["điện", "dien"]);
  const waterPrice = getServicePrice(services, ["nước", "nuoc"]);
  const parkingPrice = getServicePrice(services, ["xe", "parking"]);
  const internetPrice = getServicePrice(services, [
    "internet",
    "wifi",
    "mạng",
    "mang",
  ]);

  return {
    id: apiContract._id,
    room: apiContract.roomId?.roomCode || "N/A",
    tenantName: apiContract.tenantId?.fullName || "Người thuê",
    startDate: formatDate(apiContract.startDate),
    endDate: formatDate(apiContract.endDate),
    rentFee: `${formatMoney(apiContract.fixedRentPrice)} / tháng`,
    deposit: formatMoney(apiContract.fixedDeposit),
    status: mapNumericStatus(apiContract.status),
    rawStatus: apiContract.status,
    usedMonths,
    remainingMonths,
    progressPercent: `${progressNumber}%`,
    serviceFees: {
      electric: `${formatMoney(electricPrice)} / kWh`,
      water: `${formatMoney(waterPrice)} / m³`,
      parking: `${formatMoney(parkingPrice)} / tháng`,
      internet: `${formatMoney(internetPrice)} / tháng`,
    },
    note:
      "Người thuê cần thanh toán tiền phòng trước ngày 05 hằng tháng. Nếu có nhu cầu gia hạn hợp đồng, vui lòng liên hệ chủ trọ trước 30 ngày.",
  };
};

export const contractService = {
  // Lấy hợp đồng đang hiệu lực (dùng cho giao diện cũ)
  async getContract(): Promise<Contract | null> {
    try {
      const contracts = await this.getMyContracts();
      const activeContract = contracts.find((c) => c.status === "active") || contracts[0] || null;
      return activeContract;
    } catch (error) {
      console.log("Lỗi lấy hợp đồng từ API:", error);
      return null;
    }
  },

  // Lấy tất cả hợp đồng của người thuê đang đăng nhập
  async getMyContracts(): Promise<Contract[]> {
    try {
      const token = await authService.getToken();
      const authUser = await authService.getAuthUser();

      if (!token || !authUser) {
        throw new Error("Không tìm thấy thông tin đăng nhập");
      }

      // SỬ DỤNG ENDPOINT ME PORTAL HOẶC CONTRACTS TÙY THEO BACKEND
      // Gọi qua me portal là tốt nhất nhưng hiện tại đang gọi /contracts
      const response = await apiClient.get<ContractListResponse>(
        "/contracts",
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không lấy được danh sách hợp đồng");
      }

      const contracts = response.data || [];

      // Lọc hợp đồng thuộc về người thuê đang đăng nhập
      const myContracts = contracts.filter((item) => {
        return item.tenantId?._id === authUser.id;
      });

      return myContracts.map(mapApiContractToContract);
    } catch (error) {
      console.log("Lỗi lấy danh sách hợp đồng:", error);
      return [];
    }
  },

  // Người thuê ký xác nhận hợp đồng (status 0 → 4)
  async signContract(contractId: string): Promise<boolean> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      // Đã sửa lại endpoint để tương thích với backend trên Render
      const response = await apiClient.put<ContractActionResponse>(
        `/contracts/${contractId}/sign`,
        {},
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Ký hợp đồng thất bại");
      }

      return true;
    } catch (error) {
      console.log("Lỗi ký hợp đồng:", error);
      throw error;
    }
  },

  // Người thuê yêu cầu trả phòng (status 1 → 5)
  async requestTerminate(contractId: string): Promise<boolean> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.put<ContractActionResponse>(
        `/me/request-terminate/${contractId}`,
        {},
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Yêu cầu trả phòng thất bại");
      }

      return true;
    } catch (error: any) {
      console.log("Lỗi yêu cầu trả phòng:", error);
      throw error;
    }
  },
};