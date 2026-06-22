export const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export const appData = {
  accounts: [
    { email: "admin@trohub.vn", password: "123456", role: "admin", name: "Nguyễn Chủ Trọ" }
  ],
  landlord: {
    name: "Nguyễn Chủ Trọ",
    phone: "0900 000 000",
    email: "admin@trohub.vn",
    propertyName: "TroHub Nguyễn Văn Cừ",
    propertyStatus: "Đang hoạt động",
    address: "25 Nguyễn Văn Cừ, Quận 5, TP.HCM",
    bank: "VCB - 0123456789"
  },
  tenant: {
    id: "T001",
    name: "Nguyễn Văn A",
    phone: "0901 234 567",
    email: "tenant@trohub.vn",
    citizenId: "001202600001",
    roomId: "A101",
    startDate: "01/01/2026",
    status: "Đang thuê"
  },
  rooms: [
    { id: "A101", name: "Phòng A101", rent: 2500000, deposit: 2500000, area: 25, max: 3, occupantCount: 1, status: "Đang thuê", tenant: "Nguyễn Văn A", payment: "Chưa thanh toán", note: "Phòng có ban công, đầy đủ nội thất." },
    { id: "A102", name: "Phòng A102", rent: 2800000, deposit: 2800000, area: 28, max: 3, occupantCount: 1, status: "Đang thuê", tenant: "Trần Thị B", payment: "Đã thanh toán", note: "Gần cầu thang, thoáng mát." },
    { id: "B201", name: "Phòng B201", rent: 3000000, deposit: 3000000, area: 30, max: 4, occupantCount: 0, status: "Còn trống", tenant: "-", payment: "-", note: "Phòng lớn phù hợp gia đình nhỏ." },
    { id: "B202", name: "Phòng B202", rent: 2200000, deposit: 2200000, area: 22, max: 2, occupantCount: 0, status: "Bảo trì", tenant: "-", payment: "-", note: "Đang sửa hệ thống nước." },
    { id: "C301", name: "Phòng C301", rent: 3200000, deposit: 3200000, area: 32, max: 4, occupantCount: 2, status: "Đang thuê", tenant: "Lê Văn C", payment: "Quá hạn", note: "View thoáng, có cửa sổ lớn." },
    { id: "C302", name: "Phòng C302", rent: 2600000, deposit: 2600000, area: 26, max: 3, occupantCount: 0, status: "Còn trống", tenant: "-", payment: "-", note: "Nội thất cơ bản." }
  ],
  tenants: [
    { id: "T001", name: "Nguyễn Văn A", phone: "0901 234 567", room: "A101", citizenId: "001202600001", startDate: "01/01/2026", status: "Đang thuê" },
    { id: "T002", name: "Trần Thị B", phone: "0902 222 333", room: "A102", citizenId: "001202600002", startDate: "15/02/2026", status: "Đang thuê" },
    { id: "T003", name: "Lê Văn C", phone: "0909 999 888", room: "C301", citizenId: "001202600003", startDate: "20/03/2026", status: "Đang thuê" }
  ],
  contract: {
    id: "HD-A101-2026",
    room: "A101",
    tenant: "Nguyễn Văn A",
    signDate: "28/12/2025",
    rentStartDate: "01/01/2026",
    startDate: "01/01/2026",
    endDate: "30/12/2026",
    rent: 2500000,
    deposit: 2500000,
    electricityPrice: 4000,
    waterPrice: 15000,
    electricityStartIndex: 1200,
    waterStartIndex: 50,
    currentElectricityIndex: 1350,
    currentWaterIndex: 57,
    vehicleCount: 1,
    vehicleFee: 200000,
    internetFee: 100000,
    trashFee: 30000,
    tenantAccepted: true,
    landlordAccepted: false,
    status: "Còn hiệu lực"
  },
  contractHistory: [
    { id: "HD-A101-2025", room: "A101", tenant: "Trần Văn B", startDate: "01/01/2025", endDate: "31/12/2025", status: "Đã kết thúc", handoverDate: "31/12/2025" },
    { id: "HD-A101-2026", room: "A101", tenant: "Nguyễn Văn A", startDate: "01/01/2026", endDate: "30/12/2026", status: "Đang hiệu lực", handoverDate: "-" }
  ],
  invoices: [
    { id: "HD0526-A101", room: "A101", tenant: "Nguyễn Văn A", month: "05/2026", fromDate: "01/05/2026", toDate: "31/05/2026", dueDate: "05/06/2026", roomAmount: 2500000, electricityOld: 1270, electricityNew: 1350, electricity: 320000, waterOld: 50, waterNew: 57, water: 105000, services: 330000, discount: 0, penaltyDays: 0, penaltyRate: 0.1, penalty: 0, paymentMethod: "QR ngân hàng", transactionCode: "-", total: 3255000, status: "Chưa thanh toán" },
    { id: "HD0426-A101", room: "A101", tenant: "Nguyễn Văn A", month: "04/2026", fromDate: "01/04/2026", toDate: "30/04/2026", dueDate: "05/05/2026", roomAmount: 2500000, electricityOld: 1200, electricityNew: 1270, electricity: 280000, waterOld: 43, waterNew: 50, water: 105000, services: 330000, discount: 80000, penaltyDays: 0, penaltyRate: 0.1, penalty: 0, paymentMethod: "QR ngân hàng", transactionCode: "VCB0426A101", total: 3135000, status: "Đã thanh toán" },
    { id: "HD0526-A102", room: "A102", tenant: "Trần Thị B", month: "05/2026", fromDate: "01/05/2026", toDate: "31/05/2026", dueDate: "05/06/2026", roomAmount: 2800000, electricityOld: 900, electricityNew: 970, electricity: 280000, waterOld: 20, waterNew: 26, water: 90000, services: 330000, discount: 0, penaltyDays: 0, penaltyRate: 0.1, penalty: 0, paymentMethod: "VNPay", transactionCode: "VNP0526A102", total: 3500000, status: "Đã thanh toán" },
    { id: "HD0526-C301", room: "C301", tenant: "Lê Văn C", month: "05/2026", fromDate: "01/05/2026", toDate: "31/05/2026", dueDate: "05/06/2026", roomAmount: 3200000, electricityOld: 800, electricityNew: 900, electricity: 400000, waterOld: 60, waterNew: 68, water: 120000, services: 330000, discount: 0, penaltyDays: 3, penaltyRate: 0.1, penalty: 405000, paymentMethod: "Tiền mặt", transactionCode: "-", total: 4455000, status: "Quá hạn" }
  ],
  readings: {
    electricity: { previous: 1200, current: 1280, usage: 80, unitPrice: 4000, amount: 320000 },
    water: { previous: 50, current: 57, usage: 7, unitPrice: 15000, amount: 105000 }
  },
  utilityHistory: [
    { month: "12/2025", electricityOld: 910, electricityNew: 980, electricityUsage: 70, electricityAmount: 280000, waterOld: 18, waterNew: 24, waterUsage: 6, waterAmount: 90000, total: 370000 },
    { month: "01/2026", electricityOld: 980, electricityNew: 1052, electricityUsage: 72, electricityAmount: 288000, waterOld: 24, waterNew: 30, waterUsage: 6, waterAmount: 90000, total: 378000 },
    { month: "02/2026", electricityOld: 1052, electricityNew: 1128, electricityUsage: 76, electricityAmount: 304000, waterOld: 30, waterNew: 37, waterUsage: 7, waterAmount: 105000, total: 409000 },
    { month: "03/2026", electricityOld: 1128, electricityNew: 1200, electricityUsage: 72, electricityAmount: 288000, waterOld: 37, waterNew: 43, waterUsage: 6, waterAmount: 90000, total: 378000 },
    { month: "04/2026", electricityOld: 1200, electricityNew: 1270, electricityUsage: 70, electricityAmount: 280000, waterOld: 43, waterNew: 50, waterUsage: 7, waterAmount: 105000, total: 385000 },
    { month: "05/2026", electricityOld: 1270, electricityNew: 1350, electricityUsage: 80, electricityAmount: 320000, waterOld: 50, waterNew: 57, waterUsage: 7, waterAmount: 105000, total: 425000 }
  ],
  paymentHistory: [
    { id: "PAY-2025-12-A101", invoiceId: "HD1225-A101", room: "A101", tenant: "Nguyễn Văn A", month: "12/2025", date: "03/01/2026", method: "QR ngân hàng", amount: 3090000, status: "Đã thanh toán" },
    { id: "PAY-2026-01-A101", invoiceId: "HD0126-A101", room: "A101", tenant: "Nguyễn Văn A", month: "01/2026", date: "04/02/2026", method: "MoMo", amount: 3128000, status: "Đã thanh toán" },
    { id: "PAY-2026-02-A101", invoiceId: "HD0226-A101", room: "A101", tenant: "Nguyễn Văn A", month: "02/2026", date: "05/03/2026", method: "VNPay", amount: 3239000, status: "Đã thanh toán" },
    { id: "PAY-2026-03-A101", invoiceId: "HD0326-A101", room: "A101", tenant: "Nguyễn Văn A", month: "03/2026", date: "04/04/2026", method: "QR ngân hàng", amount: 3208000, status: "Đã thanh toán" },
    { id: "PAY-2026-04-A101", invoiceId: "HD0426-A101", room: "A101", tenant: "Nguyễn Văn A", month: "04/2026", date: "03/05/2026", method: "QR ngân hàng", amount: 3135000, status: "Đã thanh toán" },
    { id: "PAY-2026-05-A102", invoiceId: "HD0526-A102", room: "A102", tenant: "Trần Thị B", month: "05/2026", date: "02/06/2026", method: "VNPay", amount: 3500000, status: "Đã thanh toán" },
    { id: "PAY-2026-05-A101", invoiceId: "HD0526-A101", room: "A101", tenant: "Nguyễn Văn A", month: "05/2026", date: "-", method: "QR ngân hàng", amount: 3255000, status: "Chưa thanh toán" }
  ],
  paymentRevenue: [
    { month: "12/2025", value: 62000000 },
    { month: "01/2026", value: 69000000 },
    { month: "02/2026", value: 71000000 },
    { month: "03/2026", value: 76000000 },
    { month: "04/2026", value: 80500000 },
    { month: "05/2026", value: 86500000 }
  ],
  repairs: [
    { id: "YC001", room: "A101", sender: "Nguyễn Văn A", category: "Máy lạnh", priority: "Cao", priorityBy: "Admin", date: "01/05/2026", status: "Đang xử lý", description: "Máy lạnh bật nhưng không lạnh.", note: "Hẹn kỹ thuật 15:00 hôm nay.", images: ["may-lanh-1.jpg", "may-lanh-2.jpg"] },
    { id: "YC002", room: "B203", sender: "Trần Thị B", category: "Nước", priority: "Trung bình", priorityBy: "Admin", date: "20/04/2026", status: "Đã hoàn thành", description: "Rò rỉ nước tại lavabo.", note: "Đã thay ron.", images: ["ro-nuoc.jpg"] },
    { id: "YC003", room: "C301", sender: "Lê Văn C", category: "Internet", priority: "Thấp", priorityBy: "Admin", date: "18/04/2026", status: "Mới", description: "Internet chập chờn buổi tối.", note: "Đang kiểm tra.", images: [] },
    { id: "YC004", room: "A102", sender: "Trần Thị B", category: "Cửa / khóa", priority: "Cao", priorityBy: "Admin", date: "12/05/2026", status: "Mới", description: "Ổ khóa cửa bị kẹt.", note: "Chưa phân công.", images: ["khoa-1.jpg", "khoa-2.jpg", "khoa-3.jpg"] }
  ],
  revenue: [
    { month: "12/25", value: 62000000 },
    { month: "01/26", value: 69000000 },
    { month: "02/26", value: 71000000 },
    { month: "03/26", value: 76000000 },
    { month: "04/26", value: 80500000 },
    { month: "05/26", value: 86500000 }
  ]
};
