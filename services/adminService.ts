import { authService } from "./authService";
import { apiClient } from "./apiClient";

export type AdminRoom = {
  _id: string;
  roomCode: string;
  area: string;
  defaultRentPrice: number;
  defaultDeposit: number;
  floor: number;
  status: number; // 0: Trống, 1: Đang thuê, 2: Đang sửa
  landlordId?: string;
  lastElectricityReading?: number;
  lastWaterReading?: number;
  draftElectricity?: number;
  draftWater?: number;
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
  mustChangePassword?: boolean;
  createdAt?: string;
};

export type TenantLookupResult = {
  found: boolean;
  data: Pick<AdminTenant, "_id" | "fullName" | "phone" | "email" | "idCard"> | null;
};

export type AdminContract = {
  _id: string;
  roomId: string | { _id: string; roomCode: string; defaultRentPrice: number };
  tenantId: string | { _id: string; fullName: string; phone: string };
  startDate: string;
  endDate: string;
  fixedRentPrice: number;
  fixedDeposit: number;
  electricityPrice?: number;
  waterPrice?: number;
  initialElectricity?: number;
  initialWater?: number;
  status: number; // 0: Chờ ký, 1: Hiệu lực, 2: Đã kết thúc, 3: Hủy, 4: Chờ chủ duyệt, 5: Chờ trả phòng
  services?: { serviceId: string; fixedPrice: number }[];
  createdAt?: string;
};

export type CheckoutPreview = {
  roomCode: string;
  depositAmount: number;
  unpaidAmount: number;
  electricityOld: number;
  waterOld: number;
  electricityPrice: number;
  waterPrice: number;
};

export type CheckoutSettlement = CheckoutPreview & {
  electricityNew: number;
  electricityAmount: number;
  waterNew: number;
  waterAmount: number;
  utilitiesAmount: number;
  damageAmount: number;
  totalDebt: number;
  refundAmount: number;
  amountDue: number;
  finalInvoiceId?: string | null;
};

export type AdminInvoice = {
  _id: string;
  invoiceCode?: string;
  roomCode?: string;
  nguoiThue?: string;
  statusLabel?: string;
  contractId: {
    _id: string;
    roomId: { _id: string; roomCode: string; defaultRentPrice?: number };
    tenantId: { _id: string; fullName: string; phone?: string };
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
  rent?: number;
  type?: "deposit" | "monthly";
  depositAmount?: number;
  tenantName?: string;
  tenantPhone?: string;
  roomName?: string;
  electricityOld?: number;
  electricityNew?: number;
  electricity?: number;
  waterOld?: number;
  waterNew?: number;
  water?: number;
  services?: number;
  parking?: number;
  internet?: number;
  garbage?: number;
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
  vacantRooms?: number;
  maintenanceRooms?: number;
  totalTenants: number;
  pendingRepairs: number;
  pendingContracts?: number;
  totalRevenue: number;
  outstandingDebt?: number;
  utilityReadingProgress?: string;
};

export type BillingAutomationPolicy = {
  autoInvoiceEnabled: boolean;
  invoiceDay: number;
  dueDay: number;
  autoRemindEnabled: boolean;
  remindDaysBeforeDue: number;
};

export const adminService = {
  async getBillingAutomationPolicy(): Promise<BillingAutomationPolicy> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: BillingAutomationPolicy }>(
      "/settings/billing-policy",
      token,
    );
    return response.data;
  },

  async updateBillingAutomationPolicy(policy: BillingAutomationPolicy): Promise<BillingAutomationPolicy> {
    const token = await authService.getToken();
    const response = await apiClient.put<{ success: boolean; data: BillingAutomationPolicy }>(
      "/settings/billing-policy",
      policy,
      token,
    );
    return response.data;
  },

  async getRooms(): Promise<AdminRoom[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminRoom[] }>("/rooms", token);
    return response.success ? response.data : [];
  },

  async createRoom(roomData: { roomCode: string; area: string; defaultRentPrice: number; defaultDeposit: number; floor: number }): Promise<AdminRoom> {
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

  async lookupTenant(identifier: string): Promise<TenantLookupResult> {
    const token = await authService.getToken();
    return apiClient.get<TenantLookupResult>(`/tenants/lookup?identifier=${encodeURIComponent(identifier)}`, token);
  },

  async createTenant(tenantData: { fullName: string; phone: string; email: string; idCard: string; roomCode: string }): Promise<AdminTenant> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean; data: AdminTenant }>("/tenants", tenantData, token);
    return response.data;
  },

  async getInvoices(): Promise<AdminInvoice[]> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: AdminInvoice[] }>("/invoices", token);
    return response.success ? response.data : [];
  },
  async checkTenantDuplicate(field: string, value: string): Promise<{ isDuplicate: boolean; message?: string }> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean; isDuplicate: boolean; message?: string }>(
      "/tenants/check-duplicate",
      { field, value },
      token
    );
    return {
      isDuplicate: response.isDuplicate || false,
      message: response.message
    };
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
    electricityPrice: number;
    waterPrice: number;
    initialElectricity: number;
    initialWater: number;
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

  async checkoutContract(contractId: string, data: {
    finalElectricity: number;
    finalWater: number;
    damageAmount: number;
    note: string;
  }): Promise<CheckoutSettlement> {
    const token = await authService.getToken();
    const response = await apiClient.put<{
      success: boolean;
      settlement: CheckoutSettlement;
    }>(`/contracts/${contractId}/checkout`, data, token);
    return response.settlement;
  },

  async getCheckoutPreview(contractId: string): Promise<CheckoutPreview> {
    const token = await authService.getToken();
    const response = await apiClient.get<{ success: boolean; data: CheckoutPreview }>(
      `/contracts/${contractId}/checkout-preview`,
      token
    );
    return response.data;
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

  async reportUtilityReading(data: { roomId: string; electricity?: number; water?: number }): Promise<boolean> {
    const token = await authService.getToken();
    const payload: any = {};
    if (data.electricity !== undefined) payload.draftElectricity = data.electricity;
    if (data.water !== undefined) payload.draftWater = data.water;

    const response = await apiClient.post<{ success: boolean }>(
      `/rooms/${data.roomId}/report-utility`,
      payload,
      token
    );
    return response.success;
  },

  async reportBulkUtilities(utilities: { roomId: string; draftElectricity?: number; draftWater?: number }[]): Promise<boolean> {
    const token = await authService.getToken();
    const response = await apiClient.post<{ success: boolean }>(
      "/rooms/bulk-report-utility",
      { utilities },
      token
    );
    return response.success;
  },

  async getDashboardStats(): Promise<AdminDashboardStats> {

    try {
      const response = await apiClient.get<{ success: boolean; data: AdminDashboardStats }>("/landlord/stats");
      const data = response.data || (response as unknown as AdminDashboardStats);
      return {
        totalRooms: data.totalRooms || 0,
        occupiedRooms: data.occupiedRooms || 0,
        vacantRooms: data.vacantRooms || 0,
        maintenanceRooms: data.maintenanceRooms || 0,
        totalTenants: data.totalTenants || 0,
        pendingRepairs: data.pendingRepairs || 0,
        pendingContracts: data.pendingContracts || 0,
        totalRevenue: data.totalRevenue || 0,
        outstandingDebt: data.outstandingDebt || 0,
        utilityReadingProgress: data.utilityReadingProgress || "0/0",
      };
    } catch (error) {
      console.log("Lỗi tải thống kê admin:", error);
      return {
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        maintenanceRooms: 0,
        totalTenants: 0,
        pendingRepairs: 0,
        pendingContracts: 0,
        totalRevenue: 0,
        outstandingDebt: 0,
        utilityReadingProgress: "0/0",
      };
    }
  }
};
