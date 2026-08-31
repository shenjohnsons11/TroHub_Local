import { Invoice } from "../types/Invoice";
import { apiClient } from "./apiClient";
import { authService } from "./authService";
import { formatCurrency } from "../utils/formatters";

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
      landlordId?: {
        bankId?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
      };
    };
    tenantId?: {
      _id: string;
      fullName?: string;
      phone?: string;
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
  rent?: number;
  type?: "deposit" | "monthly";
  depositAmount?: number;
  tenantName?: string;
  tenantPhone?: string;
  roomName?: string;
  electricityOld?: number;
  electricityNew?: number;
  electricity?: number;
  electricityPrice?: number;
  waterOld?: number;
  waterNew?: number;
  water?: number;
  waterPrice?: number;
  services?: number;
  parking?: number;
  internet?: number;
  garbage?: number;
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

type CreateVietQRPaymentResponse = {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    invoiceId: string;
    amount: number;
    method: string;
    status: number;
    orderCode: string;
    description: string;
    qrUrl: string;
  };
};

type CreateVNPayResponse = {
  success: boolean;
  paymentUrl: string;
  transactionId: string;
  message?: string;
};

type PaymentStatusResponse = {
  success: boolean;
  data: {
    transactionId: string;
    invoiceId: string;
    amount: number;
    method: string;
    status: number;
    statusText: "pending" | "success" | "failed" | "cancelled";
    orderCode: string;
    description: string;
    qrUrl: string;
    gatewayReference?: string;
    paidAt?: string | null;
  };
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
  const oldGarbage = sumDetailByKeyword(detailsArr, ["rác", "rac", "vệ sinh", "ve sinh"]);
  const oldServicesTotal = (oldElec?.amount || 0) + (oldWater?.amount || 0) + oldParking + oldInternet + oldGarbage;

  const totalAmount = apiInvoice.totalAmount || 0;

  // Nếu có details thì lấy từ details, nếu không thì lấy trường phẳng
  const elecAmount = oldElec ? oldElec.amount : (apiInvoice.electricity || 0);
  const elecOldIndex = oldElec ? oldElec.oldIndex : (apiInvoice.electricityOld ?? null);
  const elecNewIndex = oldElec ? oldElec.newIndex : (apiInvoice.electricityNew ?? null);

  const waterAmount = oldWater ? oldWater.amount : (apiInvoice.water || 0);
  const waterOldIndex = oldWater ? oldWater.oldIndex : (apiInvoice.waterOld ?? null);
  const waterNewIndex = oldWater ? oldWater.newIndex : (apiInvoice.waterNew ?? null);

  const pAmount = detailsArr.length > 0 ? oldParking : (apiInvoice.parking || 0);
  const iAmount = detailsArr.length > 0 ? oldInternet : (apiInvoice.internet || 0);
  const gAmount = detailsArr.length > 0 ? oldGarbage : (apiInvoice.garbage || 0);
  const servicesAmount = detailsArr.length > 0 ? 0 : (apiInvoice.services || 0);
  
  const roomFee = apiInvoice.type === "deposit" ? 0 : (apiInvoice.rent ?? apiInvoice.roomAmount ?? (
    detailsArr.length > 0
      ? Math.max(totalAmount - oldServicesTotal, 0)
      : Math.max(totalAmount - elecAmount - waterAmount - pAmount - iAmount - gAmount - servicesAmount, 0)
  ));

  let bankId = undefined;
  let bankAccountNo = undefined;
  let bankAccountName = undefined;
  
  if (apiInvoice.contractId?.roomId?.landlordId) {
    const landlord = apiInvoice.contractId.roomId.landlordId;
    bankId = landlord.bankId;
    bankAccountNo = landlord.bankAccountNo;
    bankAccountName = landlord.bankAccountName;
  }

  return {
    id: apiInvoice._id,
    contractId: apiInvoice.contractId?._id,
    roomId: apiInvoice.contractId?.roomId?._id,
    type: apiInvoice.type,
    depositAmount: apiInvoice.depositAmount || 0,
    tenantName: apiInvoice.tenantName || apiInvoice.contractId?.tenantId?.fullName || "",
    tenantPhone: apiInvoice.tenantPhone || apiInvoice.contractId?.tenantId?.phone || "",
    month: apiInvoice.period,
    room: apiInvoice.roomName || apiInvoice.contractId?.roomId?.roomCode || apiInvoice.room || "Chưa rõ",
    amount: formatCurrency(totalAmount),
    numericAmount: totalAmount,
    status: apiInvoice.status === 2 ? "paid" : apiInvoice.status === 4 ? "settled" : "unpaid",
    statusText: apiInvoice.status === 2 ? "Đã thanh toán" : apiInvoice.status === 4 ? "Đã gộp quyết toán" : "Chưa thanh toán",
    dueDate: formatDate(apiInvoice.dueDate),
    bankId,
    bankAccountNo,
    bankAccountName,
    details: {
      roomFee: formatCurrency(roomFee),
      electric: {
        amount: formatCurrency(elecAmount),
        oldIndex: elecOldIndex,
        newIndex: elecNewIndex,
      },
      water: {
        amount: formatCurrency(waterAmount),
        oldIndex: waterOldIndex,
        newIndex: waterNewIndex,
      },
      parking: formatCurrency(pAmount),
      internet: formatCurrency(iAmount),
      garbage: formatCurrency(gAmount),
      otherServices: formatCurrency(servicesAmount),
    },
  };
};

export const invoiceService = {
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const token = await authService.getToken();
    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập");
    }
    const response = await apiClient.get<{
      success: boolean;
      data: ApiInvoice;
      message?: string;
    }>(`/invoices/${invoiceId}`, token);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Không tìm thấy hóa đơn tiền cọc");
    }
    return mapApiInvoiceToInvoice(response.data);
  },

  async getInvoices(roomId?: string): Promise<Invoice[]> {
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

      const invoices = response.data.map(mapApiInvoiceToInvoice);
      return roomId ? invoices.filter((invoice) => invoice.roomId === roomId) : invoices;
    } catch (error) {
      console.log("Lỗi lấy danh sách hóa đơn từ API:", error);
      throw error;
    }
  },

  async createVietQRPayment(invoiceId: string) {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.post<CreateVietQRPaymentResponse>(
        "/payments/vietqr/create",
        { invoiceId },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không tạo được mã VietQR");
      }

      return response.data;
    } catch (error) {
      console.log("Lỗi tạo thanh toán VietQR:", error);
      throw error;
    }
  },

  async createVNPayPayment(invoiceId: string) {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.post<CreateVNPayResponse>(
        "/payments/vnpay/create",
        { invoiceId },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Không tạo được URL VNPay");
      }

      return { paymentUrl: response.paymentUrl, transactionId: response.transactionId };
    } catch (error) {
      console.log("Lỗi tạo thanh toán VNPay:", error);
      throw error;
    }
  },

  async verifyVNPayReturn(queryString: string) {
    try {
      const response = await apiClient.get<any>(
        `/payments/vnpay/ipn?${queryString}`
      );
      return response;
    } catch (error) {
      console.log("Lỗi đồng bộ kết quả VNPay (IPN Local Proxy):", error);
      throw error;
    }
  },

  async getPaymentStatus(transactionId: string) {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.get<PaymentStatusResponse>(
        `/payments/${transactionId}/status`,
        token
      );

      if (!response.success) {
        throw new Error("Không kiểm tra được trạng thái thanh toán");
      }

      return response.data;
    } catch (error) {
      console.log("Lỗi kiểm tra trạng thái thanh toán:", error);
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
