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
  const details = apiInvoice.details || [];

  const getDetailInfo = (keywords: string[]) => {
    const detail = details.find(d => keywords.some(k => getServiceName(d).includes(k)));
    if (!detail) return { amount: 0, oldIndex: null, newIndex: null };
    return {
      amount: detail.amount || 0,
      oldIndex: detail.oldIndex ?? null,
      newIndex: detail.newIndex ?? null,
    };
  };

  const electricInfo = getDetailInfo(["điện", "dien"]);
  const waterInfo = getDetailInfo(["nước", "nuoc"]);

  const parkingAmount = sumDetailByKeyword(details, ["xe", "parking"]);
  const internetAmount = sumDetailByKeyword(details, [
    "internet",
    "wifi",
    "mạng",
    "mang",
  ]);

  const serviceTotal =
    electricInfo.amount + waterInfo.amount + parkingAmount + internetAmount;

  const totalAmount = apiInvoice.totalAmount || 0;
  const roomFee = Math.max(totalAmount - serviceTotal, 0);

  const isPaid = apiInvoice.status === 2;
  let statusText = "Chưa thanh toán";
  if (apiInvoice.status === 2) statusText = "Đã thanh toán";
  else if (apiInvoice.status === 3) statusText = "Quá hạn";
  else if (apiInvoice.status === 0) statusText = "Nháp";

  return {
    id: apiInvoice._id,
    month: apiInvoice.period,
    room: apiInvoice.contractId?.roomId?.roomCode || "A101",
    amount: formatMoney(totalAmount),
    status: isPaid ? "paid" : "unpaid",
    statusText,
    dueDate: formatDate(apiInvoice.dueDate),
    details: {
      roomFee: formatMoney(roomFee),
      electric: {
        amount: formatMoney(electricInfo.amount),
        oldIndex: electricInfo.oldIndex,
        newIndex: electricInfo.newIndex,
      },
      water: {
        amount: formatMoney(waterInfo.amount),
        oldIndex: waterInfo.oldIndex,
        newIndex: waterInfo.newIndex,
      },
      parking: formatMoney(parkingAmount),
      internet: formatMoney(internetAmount),
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