import { ENV } from "./env.js?v=7";

export const API_CONFIG = {
  BASE_URL: ENV.API_URL,
  
  // Đường dẫn API (Endpoints)
  // Bạn có thể sửa đổi nếu Backend thay đổi cấu trúc URL
  ENDPOINTS: {
    login: "/auth/login",
    register: "/auth/register",
    dashboardStats: "/dashboard/stats",
    me: "/me",
    rooms: "/rooms",
    tenants: "/tenants",
    contracts: "/contracts",
    invoices: "/invoices",
    repairs: "/repairs",
    payments: "/payments",
    settings: "/settings"
  },

  // Hàm ánh xạ Dữ liệu (Mappers)
  // Biến dữ liệu thô từ API thành dữ liệu chuẩn cho Giao diện
  
  // Phòng trọ
  MAP_ROOM: (apiData) => ({
    id: apiData.roomCode || apiData._id || apiData.id || "",
    objectId: apiData._id || "",
    name: "Phòng " + (apiData.roomCode || apiData.name || ""),
    rent: apiData.defaultRentPrice || apiData.rent || 0,
    deposit: apiData.defaultDeposit || apiData.deposit || 0,
    area: apiData.area || 0,
    max: apiData.max || 1,
    occupantCount: apiData.occupantCount || 0,
    status: ["Còn trống", "Đang thuê", "Bảo trì"][apiData.status] || "Còn trống",
    tenant: apiData.tenant || "-",
    payment: apiData.payment || "-",
    note: apiData.note || ""
  }),

  // Khách thuê
  MAP_TENANT: (apiData) => ({
    id: apiData.username || apiData._id || apiData.id || "",
    objectId: apiData._id || "",
    name: apiData.fullName || apiData.name || "",
    phone: apiData.phone || "",
    email: apiData.email || "",
    room: apiData.room || "-", // Backend ko populate room
    citizenId: apiData.idCard || apiData.citizenId || "",
    startDate: apiData.startDate || "-",
    status: apiData.contractStatus === 5 ? "Yêu cầu trả phòng" : (apiData.status === 1 ? "Đang thuê" : "Ngừng thuê"),
    accountId: apiData._id || "",
    accountStatus: apiData.status === 1 ? "Đã tạo" : "Chưa tạo"
  }),

  // Hóa đơn
  MAP_INVOICE: (apiData) => ({
    id: apiData.invoiceCode || apiData._id || apiData.id || "",
    objectId: apiData._id || apiData.id,
    room: apiData.room || apiData.contractId?.roomId?.roomCode || apiData.contractId?.roomId?.name || "-",
    tenant: apiData.tenant || apiData.contractId?.tenantId?.fullName || apiData.contractId?.tenantId?.name || "-",
    month: apiData.period || apiData.month || "",
    fromDate: apiData.fromDate || "",
    toDate: apiData.toDate || "",
    dueDate: apiData.dueDate ? new Date(apiData.dueDate).toLocaleDateString("vi-VN") : "",
    roomAmount: apiData.roomAmount || apiData.contractId?.fixedRentPrice || 0,
    electricityOld: apiData.oldElectricityIndex || apiData.electricityOld || 0,
    electricityNew: apiData.newElectricityIndex || apiData.electricityNew || 0,
    electricity: apiData.electricity || 0,
    waterOld: apiData.oldWaterIndex || apiData.waterOld || 0,
    waterNew: apiData.newWaterIndex || apiData.waterNew || 0,
    water: apiData.water || 0,
    parking: apiData.parking || 0,
    internet: apiData.internet || 0,
    garbage: apiData.garbage || 0,
    services: apiData.services || 0,
    discount: apiData.discount || 0,
    penaltyDays: apiData.penaltyDays || 0,
    penaltyRate: 0.1,
    penalty: apiData.penalty || 0,
    paymentMethod: apiData.paymentMethod || "",
    transactionCode: apiData.transactionCode || "-",
    total: apiData.totalAmount || apiData.total || 0,
    status: ["Nháp", "Chưa thanh toán", "Đã thanh toán", "Quá hạn"][apiData.status] || "Chưa thanh toán"
  }),

  // Yêu cầu sửa chữa
  MAP_REPAIR: (apiData) => ({
    id: apiData.repairCode || apiData._id || apiData.id || "",
    objectId: apiData._id || apiData.id || "",
    room: apiData.room || "-",
    sender: apiData.sender || "-",
    category: apiData.title || apiData.category || "",
    priority: ["Chưa phân loại", "Thấp", "Trung bình", "Cao"][apiData.priority] || "Chưa phân loại",
    priorityBy: "Admin",
    date: apiData.createdAt ? new Date(apiData.createdAt).toLocaleDateString("vi-VN") : "",
    status: ["Mới", "Đang xử lý", "Đã hoàn thành", "Đã hủy"][apiData.status] || "Mới",
    description: apiData.content || apiData.description || "",
    note: apiData.landlordNote || apiData.note || "",
    images: apiData.images || []
  }),

  // Hợp đồng
  MAP_CONTRACT: (apiData) => ({
    id: apiData._id || apiData.id || "",
    room: apiData.roomId?.roomCode || apiData.roomId || apiData.room || "",
    tenant: apiData.tenantId?.fullName || apiData.tenantId || apiData.tenant || "",
    tenantId: apiData.tenantId?._id || apiData.tenantId || "",
    startDate: apiData.startDate ? new Date(apiData.startDate).toLocaleDateString("vi-VN") : "",
    endDate: apiData.endDate ? new Date(apiData.endDate).toLocaleDateString("vi-VN") : "",
    rent: apiData.fixedRentPrice || apiData.rent || 0,
    deposit: apiData.fixedDeposit || apiData.deposit || 0,
    status: ["Chờ ký", "Đang hiệu lực", "Đã kết thúc", "Đã hủy", "Chờ duyệt", "Yêu cầu trả phòng"][apiData.status] || "Chờ ký",
    tenantAccepted: apiData.status > 0,
    services: apiData.services || []
  }),

  // ============================================
  // REVERSE MAPPERS: TỪ GIAO DIỆN -> BACKEND
  // ============================================

  MAP_ROOM_PAYLOAD: (uiData) => ({
    roomCode: uiData.name ? uiData.name.replace("Phòng ", "") : (uiData.id || "Mới"),
    area: uiData.area || 0,
    defaultRentPrice: uiData.rent || 0,
    defaultDeposit: uiData.deposit || 0,
    status: uiData.status === "Đang thuê" ? 1 : uiData.status === "Bảo trì" ? 2 : 0,
    note: uiData.note || ""
  }),

  MAP_TENANT_PAYLOAD: (uiData) => ({
    fullName: uiData.name || "",
    phone: uiData.phone || "",
    email: uiData.email || "",
    idCard: uiData.citizenId || "",
    password: uiData.password || "",
    roomCode: uiData.room || "",
    startDate: uiData.startDate && uiData.startDate.includes("/") ? new Date(`${uiData.startDate.split("/")[2]}-${uiData.startDate.split("/")[1]}-${uiData.startDate.split("/")[0]}T00:00:00.000Z`).toISOString() : (uiData.startDate || new Date().toISOString()),
    role: 2,
    status: uiData.status === "Ngừng thuê" ? 0 : 1
  }),

  MAP_CONTRACT_PAYLOAD: (uiData) => {
    // Map text status to number
    const statusMap = {
      "Chờ ký": 0,
      "Đang hiệu lực": 1,
      "Đã kết thúc": 2,
      "Đã hủy": 3,
      "Chờ duyệt": 4
    };
    
    let statusCode = 0;
    if (typeof uiData.status === "string" && statusMap[uiData.status] !== undefined) {
        statusCode = statusMap[uiData.status];
    } else if (typeof uiData.status === "number") {
        statusCode = uiData.status;
    }

    return {
      roomId: uiData.room || "",
      tenantId: uiData.tenant || "",
      startDate: uiData.startDate && uiData.startDate.includes("/") ? new Date(`${uiData.startDate.split("/")[2]}-${uiData.startDate.split("/")[1]}-${uiData.startDate.split("/")[0]}T00:00:00.000Z`).toISOString() : (uiData.startDate || new Date().toISOString()),
      endDate: uiData.endDate && uiData.endDate.includes("/") ? new Date(`${uiData.endDate.split("/")[2]}-${uiData.endDate.split("/")[1]}-${uiData.endDate.split("/")[0]}T00:00:00.000Z`).toISOString() : (uiData.endDate || new Date().toISOString()),
      fixedRentPrice: uiData.rent || 0,
      fixedDeposit: uiData.deposit || 0,
      status: statusCode
    };
  },

  MAP_REPAIR_PAYLOAD: (uiData) => ({
    title: uiData.category || "Yêu cầu sửa chữa",
    content: uiData.description || "",
    priority: 0,
    images: uiData.images || []
  }),

  // Thanh toán
  MAP_PAYMENT: (apiData) => ({
    id: apiData.transactionCode || apiData._id || apiData.id || "",
    invoiceId: apiData.invoiceId || "",
    room: apiData.room || "-",
    tenant: apiData.tenant || "-",
    month: apiData.month || "",
    date: apiData.createdAt ? new Date(apiData.createdAt).toLocaleDateString("vi-VN") : "-",
    method: apiData.method || "",
    amount: apiData.amount || 0,
    status: ["Thất bại", "Thành công"][apiData.status] || "Chưa thanh toán"
  })
};
