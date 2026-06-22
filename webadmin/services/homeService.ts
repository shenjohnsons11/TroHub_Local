import { HomeData } from "../types/HomeData";
import { userService } from "./userService";
import { invoiceService } from "./invoiceService";
import { repairService } from "./repairService";
import { contractService } from "./contractService";

const getRepairStatusText = (status?: string) => {
  if (status === "pending") return "Chờ tiếp nhận";
  if (status === "processing") return "Đang xử lý";
  if (status === "done") return "Đã hoàn thành";
  return "Không có";
};

export const homeService = {
  async getHomeData(): Promise<HomeData> {
    try {
      const [profile, invoices, repairs, contract] = await Promise.all([
        userService.getProfile(),
        invoiceService.getInvoices(),
        repairService.getRequests(),
        contractService.getContract(),
      ]);

      const unpaidInvoice = invoices.find((item) => item.status === "unpaid");
      const latestRepair = repairs[0];

      const isSigned = contract && ["active", "awaiting_approval", "requesting_termination"].includes(contract.status);

      return {
        tenantName: profile.fullName || "Người thuê",
        room: isSigned ? contract.room : "Chưa có phòng",

        totalAmount: unpaidInvoice?.amount || "0đ",
        paymentStatus: unpaidInvoice ? "unpaid" : "paid",
        paymentStatusText: unpaidInvoice ? "Chưa thanh toán" : "Đã thanh toán",
        dueDate: unpaidInvoice?.dueDate || "Không có",

        contractEndDate: contract?.endDate || "Không có",

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