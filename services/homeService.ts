import { HomeData } from "../types/HomeData";
import { userService } from "./userService";
import { invoiceService } from "./invoiceService";
import { repairService } from "./repairService";
import { contractService } from "./contractService";
import { authService } from "./authService";
import { apiClient } from "./apiClient";
import { formatCurrency } from "../utils/formatters";

const getRepairStatusText = (status?: string) => {
  if (status === "pending") return "Chờ tiếp nhận";
  if (status === "processing") return "Đang xử lý";
  if (status === "done") return "Đã hoàn thành";
  return "Không có";
};

type TenantPortalResponse = {
  success: boolean;
  data?: { property?: { propertyAddress?: string; propertyLatitude?: number; propertyLongitude?: number } | null };
};

const getProperty = async () => {
  const token = await authService.getToken();
  if (!token) return undefined;
  const response = await apiClient.get<TenantPortalResponse>("/me", token);
  return response.data?.property || undefined;
};

export const homeService = {
  async getHomeData(): Promise<HomeData> {
    try {
      const [profile, invoices, repairs, contract, property] = await Promise.all([
        userService.getProfile(),
        invoiceService.getInvoices(),
        repairService.getRequests(),
        contractService.getContract(),
        getProperty(),
      ]);

      const activeContracts = await contractService.getMyContracts();
      const currentContracts = activeContracts.filter(c => ["active", "awaiting_approval", "requesting_termination"].includes(c.status));
      const roomNames = currentContracts.map(c => c.room).filter(Boolean);
      const isSigned = currentContracts.length > 0;

      const unpaidInvoices = invoices.filter((item) => item.status === "unpaid");
      const totalAmountNum = unpaidInvoices.reduce((sum, inv) => sum + (inv.numericAmount || 0), 0);
      
      const latestRepair = repairs[0];

      return {
        tenantName: profile.fullName || "Người thuê",
        room: isSigned ? roomNames.join(", ") : "Chưa có phòng",

        totalAmount: formatCurrency(totalAmountNum),
        paymentStatus: unpaidInvoices.length > 0 ? "unpaid" : "paid",
        paymentStatusText: unpaidInvoices.length > 0 ? "Chưa thanh toán" : "Đã thanh toán",
        dueDate: unpaidInvoices.length > 0 ? unpaidInvoices[0].dueDate : "Không có",

        contractEndDate: contract?.endDate || "Không có",
        propertyAddress: property?.propertyAddress,
        propertyLatitude: property?.propertyLatitude,
        propertyLongitude: property?.propertyLongitude,

        recentRepair: {
          title: latestRepair?.description || "Không có yêu cầu sửa chữa",
          status: getRepairStatusText(latestRepair?.status),
        },
      };
    } catch (error) {
      console.log("Lỗi lấy dữ liệu trang chủ:", error);

      return {
        tenantName: "Người thuê",
        room: "Chưa có phòng",
        totalAmount: "0đ",
        paymentStatus: "paid",
        paymentStatusText: "Đã thanh toán",
        dueDate: "Không có",
        contractEndDate: "Không có",
        recentRepair: {
          title: "Không có yêu cầu sửa chữa",
          status: "Không có",
        },
      };
    }
  },
};
