import { UtilityRecord } from "../types/UtilityRecord";
import { apiClient } from "./apiClient";
import { authService } from "./authService";

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

const formatMoney = (value?: number) => {
  const amount = value || 0;
  return `${amount.toLocaleString("vi-VN")}đ`;
};

const getServiceName = (detail: ApiInvoiceDetail) => {
  if (!detail.serviceId || typeof detail.serviceId === "string") {
    return "";
  }

  return (detail.serviceId.name || "").toLowerCase();
};

const isElectricDetail = (detail: ApiInvoiceDetail) => {
  const name = getServiceName(detail);
  return name.includes("điện") || name.includes("dien");
};

const isWaterDetail = (detail: ApiInvoiceDetail) => {
  const name = getServiceName(detail);
  return name.includes("nước") || name.includes("nuoc");
};

const mapInvoiceToUtility = (invoice: ApiInvoice): UtilityRecord => {
  const details = invoice.details || [];

  const electricDetail = details.find(isElectricDetail);
  const waterDetail = details.find(isWaterDetail);

  return {
    id: invoice._id,
    month: invoice.period,

    electricOld: electricDetail?.oldIndex || 0,
    electricNew: electricDetail?.newIndex || 0,
    electricUsed: electricDetail?.quantity || 0,

    waterOld: waterDetail?.oldIndex || 0,
    waterNew: waterDetail?.newIndex || 0,
    waterUsed: waterDetail?.quantity || 0,

    electricMoney: formatMoney(electricDetail?.amount),
    waterMoney: formatMoney(waterDetail?.amount),
  };
};

export const utilityService = {
  async getUtilities(): Promise<UtilityRecord[]> {
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
        throw new Error(response.message || "Không lấy được dữ liệu điện nước");
      }

      const invoices = response.data || [];

      return invoices.map(mapInvoiceToUtility);
    } catch (error) {
      console.log("Lỗi lấy dữ liệu điện nước từ API:", error);
      throw error;
    }
  },
};