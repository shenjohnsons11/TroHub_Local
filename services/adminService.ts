import { authService } from "./authService";
import { apiClient } from "./apiClient";

export type AdminRoom = {
  _id: string;
  roomCode: string;
  area: string;
  defaultRentPrice: number;
  defaultDeposit: number;
  status: number; // 0: Trống, 1: Đang thuê, 2: Đang sửa
  landlordId?: string;
  createdAt?: string;
};

export type AdminTenant = {
  _id: string;
  username: string;
  fullName: string;
  phone: string;
  email?: string;
  idCard?: string;
  role: number;
  status: number;
  createdAt?: string;
};

export type AdminContract = {
  _id: string;
  roomId: string | { _id: string; roomCode: string; defaultRentPrice: number };
  tenantId: string | { _id: string; fullName: string; phone: string };
  startDate: string;
  endDate: string;
  fixedRentPrice: number;
  fixedDeposit: number;
  status: number; // 0: Chờ xác nhận, 1: Hiệu lực, 2: Hết hạn, 3: Hủy
  services?: { serviceId: string; fixedPrice: number }[];
  createdAt?: string;
};

export type AdminInvoice = {
  _id: string;
  contractId: {
    _id: string;
    roomId: { _id: string; roomCode: string };
    tenantId: { _id: string; fullName: string };
  } | null;
  period: string;
  dueDate: string;
  totalAmount: number;
  status: number; // 0: Chưa thanh toán, 1: Đã thanh toán, 2: Quá hạn
  room?: string;
  tenant?: string;
  fromDate?: string;
  toDate?: string;
  roomAmount?: number;
  electricityOld?: number;
  electricityNew?: number;
  electricity?: number;
  waterOld?: number;
  waterNew?: number;
  water?: number;
  services?: number;
  discount?: number;
  penaltyDays?: number;
  penaltyRate?: number;
  penalty?: number;
  paymentMethod?: string;
  transactionCode?: string;
  details?: {
    serviceId: { _id: string; name: string; unit: string };
    oldIndex?: number;
    newIndex?: number;
    quantity: number;
    appliedPrice: number;
    amount: number;
  }[];
  createdAt?: string;
};

export type AdminRepair = {
  _id: string;
  contractId: {
    _id: string;
    roomId: { _id: string; roomCode: string };
    tenantId: { _id: string; fullName: string };
  };
  title: string;
  description: string;
  priority: number; // 1: Thấp, 2: Vừa, 3: Gấp
  status: number; // 0: Mới, 1: Đang xử lý, 2: Hoàn tất, 3: Hủy
  landlordNote?: string;
  images?: string[];
  createdAt?: string;
};

export type AdminDashboardStats = {
  totalRooms: number;
  occupiedRooms: number;
  totalTenants: number;
  pendingRepairs: number;
  totalRevenue: number;
};

export const adminService = {
  async getRooms(): Promise<AdminRoom[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminRoom[] }>("/rooms", token);
    return response.success ? response.data : [];
  },

  async createRoom(roomData: { roomCode: string; area: string; defaultRentPrice: number; defaultDeposit: number }): Promise<AdminRoom> {
    const token = await authService.getToken();
    const user = await authService.getAuthUser();
    const landlordId = user?.id || "";
    const response = await apiClient.post<{ success: boolean; data: AdminRoom }>("/rooms", {
      ...roomData,
      landlordId
    }, token);
    return response.data;
  },

  async getTenants(): Promise<AdminTenant[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminTenant[] }>("/tenants", token);
    return response.success ? response.data : [];
  },

  async createTenant(tenantData: { fullName: string; phone: string; email: string; roomCode: string; idCard: string; startDate: string; password?: string }): Promise<AdminTenant> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean; data: AdminTenant }>("/tenants", tenantData, token);
    return response.data;
  },

  async getInvoices(): Promise<AdminInvoice[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminInvoice[] }>("/invoices", token);
    return response.success ? response.data : [];
  },

  async createInvoice(invoiceData: any): Promise<AdminInvoice> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean; data: AdminInvoice }>("/invoices", invoiceData, token);
    return response.data;
  },

  async remindInvoice(invoiceId: string): Promise<boolean> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean }>(`/invoices/${invoiceId}/remind`, {}, token);
    return response.success;
  },

  async confirmPaidInvoice(invoiceId: string): Promise<boolean> {
    const token = await authService.getToken();
    // Assuming the API allows PUT to update invoice status
    const response = await apiClient.put<{ success: boolean }>(`/invoices/${invoiceId}`, { status: 2 }, token);
    return response.success;
  },

  async getContracts(): Promise<AdminContract[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminContract[] }>("/contracts", token);
    return response.success ? response.data : [];
  },

  async createContract(contractData: {
    roomId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    fixedRentPrice: number;
    fixedDeposit: number;
  }): Promise<AdminContract> {
    const token = await authService.getToken();

    // Fetch default services for landlord to populate contract.services
    let defaultServices: any[] = [];
    try {
      const servicesRes = await apiClient.get<{ success: boolean; data: any[] }>("/services", token);
      if (servicesRes.success) {
        defaultServices = servicesRes.data;
      }
    } catch (err) {
      console.log("Không lấy được danh sách dịch vụ mặc định:", err);
    }

    const contractServices = defaultServices.map(s => ({
      serviceId: s._id,
      fixedPrice: s.defaultPrice
    }));

    const response = await apiClient.post<{ success: boolean; data: AdminContract }>("/contracts", {
      ...contractData,
      services: contractServices
    }, token);
    return response.data;
  },

  async confirmContract(contractId: string): Promise<boolean> {
    const token = await authService.getToken();
    const response = await apiClient.put<{ success: boolean }>((`/contracts/${contractId}/confirm`), {}, token);
    return response.success;
  },

  async getRepairs(): Promise<AdminRepair[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminRepair[] }>("/repairs", token);
    return response.success ? response.data : [];
  },

  async updateRepair(repairId: string, updateData: { status?: number; priority?: number; landlordNote?: string }): Promise<AdminRepair> {
    const token = await authService.getToken();
    const response = await apiClient.put<{ success: boolean; data: AdminRepair }>(`/repairs/${repairId}`, updateData, token);
    return response.data;
  },

  async deleteRepair(repairId: string): Promise<boolean> {
    const token = await authService.getToken();
    const response = await apiClient.delete<{ success: boolean }>(`/repairs/${repairId}`, token);
    return response.success;
  },

  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const [rooms, tenants, repairs, invoices] = await Promise.all([
        this.getRooms(),
        this.getTenants(),
        this.getRepairs(),
        this.getInvoices(),
      ]);

      const occupiedRooms = rooms.filter(r => r.status === 1).length;
      const pendingRepairs = repairs.filter(r => r.status === 0 || r.status === 1).length;
      const totalRevenue = invoices
        .filter(inv => inv.status === 2)
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      return {
        totalRooms: rooms.length,
        occupiedRooms,
        totalTenants: tenants.length,
        pendingRepairs,
        totalRevenue,
      };
    } catch (error) {
      console.log("Lỗi tính toán thống kê admin:", error);
      return {
        totalRooms: 0,
        occupiedRooms: 0,
        totalTenants: 0,
        pendingRepairs: 0,
        totalRevenue: 0,
      };
    }
  }
};
