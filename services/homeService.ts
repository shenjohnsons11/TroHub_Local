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
  async getHomeData(selectedRoomId?: string): Promise<HomeData> {
    try {
      const [profile, invoices, repairs, contracts, property] = await Promise.all([
        userService.getProfile(),
        invoiceService.getInvoices(),
        repairService.getRequests(),
        contractService.getMyContracts(),
        getProperty(),
      ]);

      const currentContracts = contracts.filter(c => ["active", "reserved", "awaiting_approval", "requesting_termination"].includes(c.status));
      const selectedContract = (selectedRoomId && currentContracts.find((contract) => contract.roomId === selectedRoomId))
        || currentContracts.find((contract) => contract.status === "active")
        || currentContracts[0]
        || contracts.find((contract) => contract.status === "pending")
        || null;
      const selectedRoom = selectedContract?.room;
      const selectedRoomCode = selectedContract?.room;
      const visibleInvoices = selectedRoomId
        ? invoices.filter((invoice) => invoice.roomId === selectedRoomId)
        : selectedRoomCode
          ? invoices.filter((invoice) => invoice.room === selectedRoomCode)
          : invoices;
      const visibleRepairs = selectedRoomId
        ? repairs.filter((repair) => repair.roomId === selectedRoomId)
        : selectedRoomCode
          ? repairs.filter((repair) => repair.room === selectedRoomCode)
          : repairs;

      const unpaidInvoices = visibleInvoices.filter((item) => item.status === "unpaid");
      const totalAmountNum = unpaidInvoices.reduce((sum, inv) => sum + (inv.numericAmount || 0), 0);
      
      const latestRepair = visibleRepairs[0];

      return {
        tenantName: profile.fullName || "Người thuê",
        room: selectedRoom || "Chưa có phòng",

        totalAmount: formatCurrency(totalAmountNum),
        paymentStatus: unpaidInvoices.length > 0 ? "unpaid" : "paid",
        paymentStatusText: unpaidInvoices.length > 0 ? "Chưa thanh toán" : "Đã thanh toán",
        dueDate: unpaidInvoices.length > 0 ? unpaidInvoices[0].dueDate : "Không có",

        contractEndDate: selectedContract?.endDate || "Không có",
        contracts,
        myInvoices: unpaidInvoices,
        activeContract: selectedContract,
        activeRepairs: visibleRepairs.filter((repair) => repair.status !== "done"),
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
        myInvoices: [],
        contracts: [],
        activeContract: null,
        activeRepairs: [],
        recentRepair: {
          title: "Không có yêu cầu sửa chữa",
          status: "Không có",
        },
      };
    }
  },
};
