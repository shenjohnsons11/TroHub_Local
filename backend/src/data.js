export const db = {
  users: [
    { id: "U001", fullName: "Nguyễn Chủ Trọ", phone: "0900000000", email: "admin@trohub.vn", password: "123456", role: "LANDLORD", citizenId: "", bankName: "VCB", bankAccount: "0123456789", address: "25 Nguyễn Văn Cừ, Quận 5, TP.HCM", emergencyContact: "", status: "ACTIVE" },
    { id: "U002", fullName: "Nguyễn Văn A", phone: "0901234567", email: "tenant@trohub.vn", password: "123456", role: "TENANT", citizenId: "001202600001", bankName: "", bankAccount: "", address: "TP.HCM", emergencyContact: "0908888888", status: "ACTIVE" },
    { id: "U003", fullName: "Trần Thị B", phone: "0902222333", email: "tranb@trohub.vn", password: "123456", role: "TENANT", citizenId: "001202600002", bankName: "", bankAccount: "", address: "TP.HCM", emergencyContact: "0907777777", status: "ACTIVE" },
    { id: "U004", fullName: "Lê Văn C", phone: "0909999888", email: "levanc@trohub.vn", password: "123456", role: "TENANT", citizenId: "001202600003", bankName: "", bankAccount: "", address: "TP.HCM", emergencyContact: "0906666666", status: "ACTIVE" }
  ],
  boardingHouses: [
    { id: "H001", ownerUserId: "U001", name: "TroHub Nguyễn Văn Cừ", address: "25 Nguyễn Văn Cừ, Quận 5, TP.HCM", description: "Nhà trọ hiện đại, gần trung tâm.", status: "ACTIVE" }
  ],
  rooms: [
    { id: "R001", houseId: "H001", ownerUserId: "U001", code: "A101", name: "Phòng A101", areaM2: 25, rentPrice: 2500000, depositAmount: 2500000, maxOccupants: 3, currentOccupants: 1, status: "OCCUPIED", note: "Phòng có ban công, đầy đủ nội thất." },
    { id: "R002", houseId: "H001", ownerUserId: "U001", code: "A102", name: "Phòng A102", areaM2: 28, rentPrice: 2800000, depositAmount: 2800000, maxOccupants: 3, currentOccupants: 1, status: "OCCUPIED", note: "Gần cầu thang, thoáng mát." },
    { id: "R003", houseId: "H001", ownerUserId: "U001", code: "B201", name: "Phòng B201", areaM2: 30, rentPrice: 3000000, depositAmount: 3000000, maxOccupants: 4, currentOccupants: 0, status: "AVAILABLE", note: "Phòng lớn phù hợp gia đình nhỏ." },
    { id: "R004", houseId: "H001", ownerUserId: "U001", code: "B202", name: "Phòng B202", areaM2: 22, rentPrice: 2200000, depositAmount: 2200000, maxOccupants: 2, currentOccupants: 0, status: "MAINTENANCE", note: "Đang sửa hệ thống nước." },
    { id: "R005", houseId: "H001", ownerUserId: "U001", code: "C301", name: "Phòng C301", areaM2: 32, rentPrice: 3200000, depositAmount: 3200000, maxOccupants: 4, currentOccupants: 2, status: "OCCUPIED", note: "View thoáng, có cửa sổ lớn." }
  ],
  contracts: [
    {
      id: "C000",
      code: "HD-A101-2025",
      roomId: "R001",
      landlordUserId: "U001",
      tenantUserId: "U003",
      signDate: "2024-12-28",
      rentStartDate: "2025-01-01",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      rentPrice: 2400000,
      depositAmount: 2400000,
      electricityUnitPrice: 3800,
      waterUnitPrice: 14000,
      electricityStartIndex: 910,
      waterStartIndex: 18,
      electricityCurrentIndex: 1200,
      waterCurrentIndex: 43,
      vehicleCount: 1,
      vehicleFee: 180000,
      internetFee: 100000,
      trashFee: 30000,
      extraTerms: "Đã bàn giao phòng cuối kỳ.",
      tenantAcceptedAt: "2024-12-28T08:00:00.000Z",
      landlordAcceptedAt: "2024-12-28T08:15:00.000Z",
      status: "TERMINATED"
    },
    {
      id: "C001",
      code: "HD-A101-2026",
      roomId: "R001",
      landlordUserId: "U001",
      tenantUserId: "U002",
      signDate: "2025-12-28",
      rentStartDate: "2026-01-01",
      startDate: "2026-01-01",
      endDate: "2026-12-30",
      rentPrice: 2500000,
      depositAmount: 2500000,
      electricityUnitPrice: 4000,
      waterUnitPrice: 15000,
      electricityStartIndex: 1200,
      waterStartIndex: 43,
      electricityCurrentIndex: 1350,
      waterCurrentIndex: 57,
      vehicleCount: 1,
      vehicleFee: 200000,
      internetFee: 100000,
      trashFee: 30000,
      extraTerms: "Thanh toán trước ngày 05 hằng tháng.",
      tenantAcceptedAt: "2025-12-28T08:00:00.000Z",
      landlordAcceptedAt: null,
      status: "PENDING_LANDLORD"
    },
    {
      id: "C002",
      code: "HD-A102-2026",
      roomId: "R002",
      landlordUserId: "U001",
      tenantUserId: "U003",
      signDate: "2026-02-10",
      rentStartDate: "2026-02-15",
      startDate: "2026-02-15",
      endDate: "2027-02-14",
      rentPrice: 2800000,
      depositAmount: 2800000,
      electricityUnitPrice: 4000,
      waterUnitPrice: 15000,
      electricityStartIndex: 900,
      waterStartIndex: 20,
      electricityCurrentIndex: 970,
      waterCurrentIndex: 26,
      vehicleCount: 1,
      vehicleFee: 200000,
      internetFee: 100000,
      trashFee: 30000,
      extraTerms: "",
      tenantAcceptedAt: "2026-02-10T08:00:00.000Z",
      landlordAcceptedAt: "2026-02-10T08:15:00.000Z",
      status: "ACTIVE"
    }
  ],
  contractOccupants: [
    { id: "CO001", contractId: "C001", userId: "U002", fullName: "Nguyễn Văn A", phone: "0901234567", citizenId: "001202600001", relationship: "Người thuê chính" },
    { id: "CO002", contractId: "C002", userId: "U003", fullName: "Trần Thị B", phone: "0902222333", citizenId: "001202600002", relationship: "Người thuê chính" }
  ],
  services: [
    { id: "S001", name: "Tiền phòng", unit: "date-range", defaultPrice: 2500000 },
    { id: "S002", name: "Điện", unit: "kWh", defaultPrice: 4000 },
    { id: "S003", name: "Nước", unit: "m3", defaultPrice: 15000 },
    { id: "S004", name: "Phí xe", unit: "vehicle", defaultPrice: 200000 },
    { id: "S005", name: "Internet", unit: "date-range", defaultPrice: 100000 },
    { id: "S006", name: "Rác", unit: "date-range", defaultPrice: 30000 },
    { id: "S007", name: "Phí phạt trễ hạn", unit: "percent", defaultPrice: 0.1 }
  ],
  invoices: [
    { id: "I001", code: "HD0526-A101", roomId: "R001", landlordUserId: "U001", tenantUserId: "U002", contractId: "C001", fromDate: "2026-05-01", toDate: "2026-05-31", dueDate: "2026-06-05", roomAmount: 2500000, electricityAmount: 320000, waterAmount: 105000, serviceAmount: 330000, discountAmount: 0, penaltyDays: 0, penaltyRate: 0.1, penaltyAmount: 0, totalAmount: 3255000, paymentMethod: "BANK_QR", transactionCode: "", paidAt: null, status: "UNPAID" },
    { id: "I002", code: "HD0426-A101", roomId: "R001", landlordUserId: "U001", tenantUserId: "U002", contractId: "C001", fromDate: "2026-04-01", toDate: "2026-04-30", dueDate: "2026-05-05", roomAmount: 2500000, electricityAmount: 280000, waterAmount: 105000, serviceAmount: 330000, discountAmount: 80000, penaltyDays: 0, penaltyRate: 0.1, penaltyAmount: 0, totalAmount: 3135000, paymentMethod: "BANK_QR", transactionCode: "VCB0426A101", paidAt: "2026-05-03T09:00:00.000Z", status: "PAID" },
    { id: "I003", code: "HD0526-A102", roomId: "R002", landlordUserId: "U001", tenantUserId: "U003", contractId: "C002", fromDate: "2026-05-01", toDate: "2026-05-31", dueDate: "2026-06-05", roomAmount: 2800000, electricityAmount: 280000, waterAmount: 90000, serviceAmount: 330000, discountAmount: 0, penaltyDays: 0, penaltyRate: 0.1, penaltyAmount: 0, totalAmount: 3500000, paymentMethod: "VNPAY", transactionCode: "VNP0526A102", paidAt: "2026-06-02T08:30:00.000Z", status: "PAID" },
    { id: "I004", code: "HD0526-C301", roomId: "R005", landlordUserId: "U001", tenantUserId: "U004", contractId: null, fromDate: "2026-05-01", toDate: "2026-05-31", dueDate: "2026-06-05", roomAmount: 3200000, electricityAmount: 400000, waterAmount: 120000, serviceAmount: 330000, discountAmount: 0, penaltyDays: 3, penaltyRate: 0.1, penaltyAmount: 405000, totalAmount: 4455000, paymentMethod: "CASH", transactionCode: "", paidAt: null, status: "OVERDUE" }
  ],
  invoiceDetails: [
    { id: "ID001", invoiceId: "I001", serviceId: "S001", label: "Tiền phòng", quantity: 1, unitPrice: 2500000, amount: 2500000 },
    { id: "ID002", invoiceId: "I001", serviceId: "S002", label: "Điện", quantity: 80, unitPrice: 4000, amount: 320000 },
    { id: "ID003", invoiceId: "I001", serviceId: "S003", label: "Nước", quantity: 7, unitPrice: 15000, amount: 105000 },
    { id: "ID004", invoiceId: "I001", serviceId: "S004", label: "Phí xe", quantity: 1, unitPrice: 200000, amount: 200000 },
    { id: "ID005", invoiceId: "I001", serviceId: "S005", label: "Internet", quantity: 1, unitPrice: 100000, amount: 100000 },
    { id: "ID006", invoiceId: "I001", serviceId: "S006", label: "Rác", quantity: 1, unitPrice: 30000, amount: 30000 }
  ],
  meterReadings: [
    { id: "M001", roomId: "R001", contractId: "C001", invoiceId: null, type: "ELECTRICITY", fromDate: "2025-12-01", toDate: "2025-12-31", previousIndex: 910, currentIndex: 980, usageAmount: 70, unitPrice: 4000, amount: 280000, createdBy: "U001" },
    { id: "M002", roomId: "R001", contractId: "C001", invoiceId: null, type: "WATER", fromDate: "2025-12-01", toDate: "2025-12-31", previousIndex: 18, currentIndex: 24, usageAmount: 6, unitPrice: 15000, amount: 90000, createdBy: "U001" },
    { id: "M003", roomId: "R001", contractId: "C001", invoiceId: null, type: "ELECTRICITY", fromDate: "2026-01-01", toDate: "2026-01-31", previousIndex: 980, currentIndex: 1052, usageAmount: 72, unitPrice: 4000, amount: 288000, createdBy: "U001" },
    { id: "M004", roomId: "R001", contractId: "C001", invoiceId: null, type: "WATER", fromDate: "2026-01-01", toDate: "2026-01-31", previousIndex: 24, currentIndex: 30, usageAmount: 6, unitPrice: 15000, amount: 90000, createdBy: "U001" },
    { id: "M005", roomId: "R001", contractId: "C001", invoiceId: "I002", type: "ELECTRICITY", fromDate: "2026-04-01", toDate: "2026-04-30", previousIndex: 1200, currentIndex: 1270, usageAmount: 70, unitPrice: 4000, amount: 280000, createdBy: "U001" },
    { id: "M006", roomId: "R001", contractId: "C001", invoiceId: "I002", type: "WATER", fromDate: "2026-04-01", toDate: "2026-04-30", previousIndex: 43, currentIndex: 50, usageAmount: 7, unitPrice: 15000, amount: 105000, createdBy: "U001" },
    { id: "M007", roomId: "R001", contractId: "C001", invoiceId: "I001", type: "ELECTRICITY", fromDate: "2026-05-01", toDate: "2026-05-31", previousIndex: 1270, currentIndex: 1350, usageAmount: 80, unitPrice: 4000, amount: 320000, createdBy: "U001" },
    { id: "M008", roomId: "R001", contractId: "C001", invoiceId: "I001", type: "WATER", fromDate: "2026-05-01", toDate: "2026-05-31", previousIndex: 50, currentIndex: 57, usageAmount: 7, unitPrice: 15000, amount: 105000, createdBy: "U001" }
  ],
  payments: [
    { id: "PM001", invoiceId: "I002", payerUserId: "U002", method: "BANK_QR", amount: 3135000, transactionCode: "VCB0426A101", penaltyAmount: 0, paidAt: "2026-05-03T09:00:00.000Z", status: "SUCCESS" },
    { id: "PM002", invoiceId: "I001", payerUserId: "U002", method: "BANK_QR", amount: 3255000, transactionCode: "", penaltyAmount: 0, paidAt: null, status: "PENDING" },
    { id: "PM003", invoiceId: "I003", payerUserId: "U003", method: "VNPAY", amount: 3500000, transactionCode: "VNP0526A102", penaltyAmount: 0, paidAt: "2026-06-02T08:30:00.000Z", status: "SUCCESS" },
    { id: "PM004", invoiceId: "I004", payerUserId: "U004", method: "CASH", amount: 4455000, transactionCode: "", penaltyAmount: 405000, paidAt: null, status: "PENDING" }
  ],
  repairRequests: [
    { id: "RR001", code: "YC001", roomId: "R001", requesterUserId: "U002", category: "Máy lạnh", priority: "HIGH", prioritySetBy: "U001", description: "Máy lạnh bật nhưng không lạnh.", status: "IN_PROGRESS", landlordNote: "Hẹn kỹ thuật 15:00 hôm nay.", createdAt: "2026-05-01T08:00:00.000Z" },
    { id: "RR002", code: "YC002", roomId: "R002", requesterUserId: "U003", category: "Nước", priority: "MEDIUM", prioritySetBy: "U001", description: "Rò rỉ nước tại lavabo.", status: "COMPLETED", landlordNote: "Đã thay ron.", createdAt: "2026-04-20T09:00:00.000Z" },
    { id: "RR003", code: "YC003", roomId: "R005", requesterUserId: "U004", category: "Internet", priority: "LOW", prioritySetBy: "U001", description: "Internet chập chờn buổi tối.", status: "NEW", landlordNote: "Đang kiểm tra.", createdAt: "2026-04-18T10:00:00.000Z" }
  ],
  repairImages: [
    { id: "RI001", repairRequestId: "RR001", fileUrl: "/uploads/repairs/may-lanh-1.jpg", fileName: "may-lanh-1.jpg", mimeType: "image/jpeg", sortOrder: 1 },
    { id: "RI002", repairRequestId: "RR001", fileUrl: "/uploads/repairs/may-lanh-2.jpg", fileName: "may-lanh-2.jpg", mimeType: "image/jpeg", sortOrder: 2 },
    { id: "RI003", repairRequestId: "RR002", fileUrl: "/uploads/repairs/ro-nuoc.jpg", fileName: "ro-nuoc.jpg", mimeType: "image/jpeg", sortOrder: 1 }
  ],
  repairHistories: [],
  notifications: []
};

export const nextId = (prefix, list) => {
  const number = list.length + 1;
  return `${prefix}${String(number).padStart(3, "0")}`;
};
