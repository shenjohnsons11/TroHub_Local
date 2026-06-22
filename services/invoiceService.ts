import { Invoice } from "../types/Invoice";
import { authService } from "./authService";
import { apiClient } from "./apiClient";

type ApiService = {
  _id: string;
  name?: string;
  unit?: string;
  type?: number;
};

type ApiInvoiceDetail = {
  serviceId?: ApiService | string;
  oldIndex?: number | null;
  newIndex?: number | null;
  quantity?: number;
  appliedPrice?: number;
  amount?: number;
};

type ApiInvoice = {
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
    };
    fixedRentPrice?: number;
  };
  period: string;
  dueDate?: string;
  totalAmount?: number;
  status: number;
  details?: ApiInvoiceDetail[];
  
  room?: string;
  roomAmount?: number;
  electricityOld?: number;
  electricityNew?: number;
  electricityPrice?: number;
  waterOld?: number;
  waterNew?: number;
  waterPrice?: number;
  services?: number;
};

type InvoiceListResponse = {
  success: boolean;
  data: ApiInvoice[];
  message?: string;
};

type PayInvoiceResponse = {
  success: boolean;
  message: string;
  transaction?: unknown;
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

const getServiceName = (detail: ApiInvoiceDetail) => {
  if (!detail.serviceId || typeof detail.serviceId === "string") {
    return "";
  }

  return (detail.serviceId.name || "").toLowerCase();
};

const sumDetailByKeyword = (details: ApiInvoiceDetail[], keywords: string[]) => {
  return details
    .filter((detail) => {
      const name = getServiceName(detail);
      return keywords.some((keyword) => name.includes(keyword));
    })
    .reduce((total, detail) => total + (detail.amount || 0), 0);
};

const mapApiInvoiceToInvoice = (apiInvoice: ApiInvoice): Invoice => {
  const detailsArr = apiInvoice.details || [];
  
  const getDetailInfo = (keywords: string[]) => {
    const detail = detailsArr.find(d => keywords.some(k => getServiceName(d).includes(k)));
    if (!detail) return null;
    return {
      amount: detail.amount || 0,
      oldIndex: detail.oldIndex ?? null,
      newIndex: detail.newIndex ?? null,
    };
  };

  const oldElec = getDetailInfo(["điện", "dien"]);
  const oldWater = getDetailInfo(["nước", "nuoc"]);
  const oldParking = sumDetailByKeyword(detailsArr, ["xe", "parking"]);
  const oldInternet = sumDetailByKeyword(detailsArr, ["internet", "wifi", "mạng", "mang"]);
  const oldServicesTotal = (oldElec?.amount || 0) + (oldWater?.amount || 0) + oldParking + oldInternet;

  const totalAmount = apiInvoice.totalAmount || 0;

  // Nếu có details thì lấy từ details, nếu không thì lấy trường phẳng
  const elecAmount = oldElec ? oldElec.amount : (apiInvoice.electricity || 0);
  const elecOldIndex = oldElec ? oldElec.oldIndex : (apiInvoice.electricityOld ?? null);
  const elecNewIndex = oldElec ? oldElec.newIndex : (apiInvoice.electricityNew ?? null);

  const waterAmount = oldWater ? oldWater.amount : (apiInvoice.water || 0);
  const waterOldIndex = oldWater ? oldWater.oldIndex : (apiInvoice.waterOld ?? null);
  const waterNewIndex = oldWater ? oldWater.newIndex : (apiInvoice.waterNew ?? null);

  const servicesAmount = detailsArr.length > 0 ? (oldParking + oldInternet) : (apiInvoice.services || 0);
  
  const roomFee = detailsArr.length > 0 
    ? Math.max(totalAmount - oldServicesTotal, 0)
    : (apiInvoice.roomAmount || Math.max(totalAmount - elecAmount - waterAmount - servicesAmount, 0));

  const isPaid = apiInvoice.status === 2;
  let statusText = "Chưa thanh toán";
  if (apiInvoice.status === 2) statusText = "Đã thanh toán";
  else if (apiInvoice.status === 3) statusText = "Quá hạn";
  else if (apiInvoice.status === 0) statusText = "Nháp";

  return {
    id: apiInvoice._id,
    month: apiInvoice.period,
    room: apiInvoice.room || apiInvoice.contractId?.roomId?.roomCode || "A101",
    amount: formatMoney(totalAmount),
    status: isPaid ? "paid" : "unpaid",
    statusText,
    dueDate: formatDate(apiInvoice.dueDate),
    details: {
      roomFee: formatMoney(roomFee),
      electric: {
        amount: formatMoney(elecAmount),
        oldIndex: elecOldIndex,
        newIndex: elecNewIndex,
      },
      water: {
        amount: formatMoney(waterAmount),
        oldIndex: waterOldIndex,
        newIndex: waterNewIndex,
      },
      parking: formatMoney(detailsArr.length > 0 ? oldParking : 0),
      internet: formatMoney(servicesAmount),
    },
  };
};

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.get<InvoiceListResponse>(
        "/invoices",
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không lấy được danh sách hóa đơn");
      }

      return response.data.map(mapApiInvoiceToInvoice);
    } catch (error) {
      console.log("Lỗi lấy danh sách hóa đơn từ API:", error);
      throw error;
    }
  },

  async payInvoice(invoiceId: string): Promise<Invoice[]> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.put<PayInvoiceResponse>(
        `/invoices/${invoiceId}/pay`,
        {
          method: "Mobile App",
          gatewayReference: `TROHUB_${Date.now()}`,
        },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Thanh toán hóa đơn thất bại");
      }

      return await this.getInvoices();
    } catch (error) {
      console.log("Lỗi thanh toán hóa đơn qua API:", error);
      throw error;
    }
  },

  async getBulkPreview(): Promise<any[]> {
    try {
      const token = await authService.getToken();
      if (!token) throw new Error("Không tìm thấy token");
      const response = await apiClient.get<{ success: boolean; data?: any[]; message?: string }>(
        "/invoices/bulk-preview",
        token
      );
      if (!response.success) throw new Error(response.message || "Lỗi tải preview");
      return response.data || [];
    } catch (e) {
      throw e;
    }
  },

  async bulkCreate(payload: { invoices: any[] }): Promise<void> {
    try {
      const token = await authService.getToken();
      if (!token) throw new Error("Không tìm thấy token");
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        "/invoices/bulk",
        payload,
        token
      );
      if (!response.success) throw new Error(response.message || "Lỗi tạo hóa đơn đồng loạt");
    } catch (e) {
      throw e;
    }
  },
};