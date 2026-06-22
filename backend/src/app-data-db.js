import { query } from "./db.js";

const moneyNumber = (value) => Number(value || 0);
const pad = (value) => String(value).padStart(2, "0");

const dateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const viDate = (value) => {
  const date = dateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "-";
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
};

const viMonth = (value) => {
  const date = dateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "-";
  return `${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
};

const roomStatusVi = {
  OCCUPIED: "Đang thuê",
  AVAILABLE: "Còn trống",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngừng dùng"
};

const invoiceStatusVi = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  OVERDUE: "Quá hạn",
  DRAFT: "Nháp",
  CANCELLED: "Đã hủy"
};

const paymentStatusVi = {
  SUCCESS: "Đã thanh toán",
  PENDING: "Chưa thanh toán",
  FAILED: "Thất bại",
  REFUNDED: "Hoàn tiền"
};

const repairStatusVi = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy"
};

const priorityVi = {
  UNSET: "Chưa đặt",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao"
};

const contractStatusVi = {
  ACTIVE: "Còn hiệu lực",
  PENDING_TENANT: "Chờ khách đồng ý",
  PENDING_LANDLORD: "Chờ chủ trọ xác nhận",
  EXPIRED: "Hết hạn",
  TERMINATED: "Đã kết thúc",
  DRAFT: "Nháp"
};

const firstBy = (items, predicate) => items.find(predicate) || {};

const groupRevenue = (payments) => {
  const groups = new Map();
  for (const payment of payments) {
    if (payment.status !== "SUCCESS" || !payment.paid_at) continue;
    const month = viMonth(payment.paid_at);
    groups.set(month, (groups.get(month) || 0) + moneyNumber(payment.amount));
  }
  const rows = [...groups.entries()].map(([month, value]) => ({ month, value }));
  return rows.length ? rows : [
    { month: "03/2026", value: 76000000 },
    { month: "04/2026", value: 80500000 },
    { month: "05/2026", value: 86500000 }
  ];
};

const buildUtilityHistory = (readings) => {
  const groups = new Map();
  for (const reading of readings) {
    const month = viMonth(reading.from_date);
    const item = groups.get(month) || {
      month,
      electricityOld: 0,
      electricityNew: 0,
      electricityUsage: 0,
      electricityAmount: 0,
      waterOld: 0,
      waterNew: 0,
      waterUsage: 0,
      waterAmount: 0,
      total: 0
    };
    if (reading.type === "ELECTRICITY") {
      item.electricityOld = moneyNumber(reading.previous_index);
      item.electricityNew = moneyNumber(reading.current_index);
      item.electricityUsage = moneyNumber(reading.usage_amount);
      item.electricityAmount = moneyNumber(reading.amount);
    }
    if (reading.type === "WATER") {
      item.waterOld = moneyNumber(reading.previous_index);
      item.waterNew = moneyNumber(reading.current_index);
      item.waterUsage = moneyNumber(reading.usage_amount);
      item.waterAmount = moneyNumber(reading.amount);
    }
    item.total = item.electricityAmount + item.waterAmount;
    groups.set(month, item);
  }
  return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
};

export const buildAppDataFromDatabase = async () => {
  const [
    usersResult,
    housesResult,
    roomsResult,
    contractsResult,
    occupantsResult,
    invoicesResult,
    readingsResult,
    paymentsResult,
    repairsResult,
    repairImagesResult
  ] = await Promise.all([
    query("select * from users order by id"),
    query("select * from boarding_houses order by id"),
    query("select * from rooms order by code"),
    query("select * from contracts order by start_date desc"),
    query("select * from contract_occupants order by id"),
    query(`
      select i.*, r.code as room_code, u.full_name as tenant_name
      from invoices i
      join rooms r on r.id = i.room_id
      join users u on u.id = i.tenant_user_id
      order by i.from_date desc, i.code desc
    `),
    query("select * from meter_readings order by from_date"),
    query("select * from payments order by paid_at nulls last, id"),
    query(`
      select rr.*, r.code as room_code, requester.full_name as requester_name, setter.full_name as priority_setter_name
      from repair_requests rr
      join rooms r on r.id = rr.room_id
      join users requester on requester.id = rr.requester_user_id
      left join users setter on setter.id = rr.priority_set_by
      order by rr.created_at desc
    `),
    query("select * from repair_images order by sort_order, id")
  ]);

  const users = usersResult.rows;
  const houses = housesResult.rows;
  const dbRooms = roomsResult.rows;
  const contracts = contractsResult.rows;
  const occupants = occupantsResult.rows;
  const invoices = invoicesResult.rows;
  const readings = readingsResult.rows;
  const payments = paymentsResult.rows;
  const repairs = repairsResult.rows;
  const repairImages = repairImagesResult.rows;

  const landlordUser = users.find((user) => user.role === "LANDLORD") || users[0] || {};
  const tenantUser = users.find((user) => user.email === "tenant@trohub.vn") || users.find((user) => user.role === "TENANT") || {};
  const house = houses[0] || {};
  const activeContract = contracts.find((contract) => contract.tenant_user_id === tenantUser.id && ["ACTIVE", "PENDING_TENANT", "PENDING_LANDLORD"].includes(contract.status)) || contracts[0] || {};
  const tenantRoom = dbRooms.find((room) => room.id === activeContract.room_id) || dbRooms[0] || {};

  const invoiceDtos = invoices.map((invoice) => {
    const electricity = firstBy(readings, (reading) => reading.invoice_id === invoice.id && reading.type === "ELECTRICITY");
    const water = firstBy(readings, (reading) => reading.invoice_id === invoice.id && reading.type === "WATER");
    return {
      id: invoice.code,
      room: invoice.room_code,
      tenant: invoice.tenant_name,
      month: viMonth(invoice.from_date),
      fromDate: viDate(invoice.from_date),
      toDate: viDate(invoice.to_date),
      dueDate: viDate(invoice.due_date),
      roomAmount: moneyNumber(invoice.room_amount),
      electricityOld: moneyNumber(electricity.previous_index),
      electricityNew: moneyNumber(electricity.current_index),
      electricity: moneyNumber(invoice.electricity_amount),
      waterOld: moneyNumber(water.previous_index),
      waterNew: moneyNumber(water.current_index),
      water: moneyNumber(invoice.water_amount),
      services: moneyNumber(invoice.service_amount),
      discount: moneyNumber(invoice.discount_amount),
      penaltyDays: moneyNumber(invoice.penalty_days),
      penaltyRate: moneyNumber(invoice.penalty_rate),
      penalty: moneyNumber(invoice.penalty_amount),
      paymentMethod: invoice.payment_method || "-",
      transactionCode: invoice.transaction_code || "-",
      total: moneyNumber(invoice.total_amount),
      status: invoiceStatusVi[invoice.status] || invoice.status
    };
  });

  const latestInvoiceByRoom = new Map();
  for (const invoice of invoiceDtos) {
    if (!latestInvoiceByRoom.has(invoice.room)) latestInvoiceByRoom.set(invoice.room, invoice);
  }

  const roomDtos = dbRooms.map((room) => {
    const contract = contracts.find((item) => item.room_id === room.id && ["ACTIVE", "PENDING_TENANT", "PENDING_LANDLORD"].includes(item.status));
    const tenant = users.find((user) => user.id === contract?.tenant_user_id);
    const latestInvoice = latestInvoiceByRoom.get(room.code);
    return {
      id: room.code,
      name: room.name,
      rent: moneyNumber(room.rent_price),
      deposit: moneyNumber(room.deposit_amount),
      area: moneyNumber(room.area_m2),
      max: moneyNumber(room.max_occupants),
      occupantCount: moneyNumber(room.current_occupants),
      status: roomStatusVi[room.status] || room.status,
      tenant: tenant?.full_name || "-",
      payment: latestInvoice?.status || "-",
      note: room.note || ""
    };
  });

  const tenantDtos = users.filter((user) => user.role === "TENANT").map((user) => {
    const contract = contracts.find((item) => item.tenant_user_id === user.id && ["ACTIVE", "PENDING_TENANT", "PENDING_LANDLORD"].includes(item.status));
    const room = dbRooms.find((item) => item.id === contract?.room_id);
    return {
      id: user.id,
      name: user.full_name,
      phone: user.phone,
      room: room?.code || "-",
      citizenId: user.citizen_id || "-",
      startDate: viDate(contract?.rent_start_date),
      status: user.status === "ACTIVE" ? "Đang thuê" : "Ngừng thuê"
    };
  });

  const utilityHistory = buildUtilityHistory(readings.filter((reading) => reading.room_id === tenantRoom.id));
  const latestElectricity = [...readings].reverse().find((reading) => reading.room_id === tenantRoom.id && reading.type === "ELECTRICITY") || {};
  const latestWater = [...readings].reverse().find((reading) => reading.room_id === tenantRoom.id && reading.type === "WATER") || {};
  const revenue = groupRevenue(payments);

  return {
    accounts: users.map((user) => ({
      email: user.email,
      password: "123456",
      role: user.role === "LANDLORD" ? "admin" : "tenant",
      name: user.full_name
    })),
    landlord: {
      name: landlordUser.full_name || "Chủ trọ",
      phone: landlordUser.phone || "",
      email: landlordUser.email || "",
      propertyName: house.name || "TroHub",
      propertyStatus: house.status === "ACTIVE" ? "Đang hoạt động" : house.status,
      address: house.address || landlordUser.address || "",
      bank: `${landlordUser.bank_name || ""} - ${landlordUser.bank_account || ""}`.trim()
    },
    tenant: {
      id: tenantUser.id,
      name: tenantUser.full_name,
      phone: tenantUser.phone,
      email: tenantUser.email,
      citizenId: tenantUser.citizen_id,
      roomId: tenantRoom.code,
      startDate: viDate(activeContract.rent_start_date),
      status: "Đang thuê"
    },
    rooms: roomDtos,
    tenants: tenantDtos,
    contract: {
      id: activeContract.code,
      room: tenantRoom.code,
      tenant: tenantUser.full_name,
      signDate: viDate(activeContract.sign_date),
      rentStartDate: viDate(activeContract.rent_start_date),
      startDate: viDate(activeContract.start_date),
      endDate: viDate(activeContract.end_date),
      rent: moneyNumber(activeContract.rent_price),
      deposit: moneyNumber(activeContract.deposit_amount),
      electricityPrice: moneyNumber(activeContract.electricity_unit_price),
      waterPrice: moneyNumber(activeContract.water_unit_price),
      electricityStartIndex: moneyNumber(activeContract.electricity_start_index),
      waterStartIndex: moneyNumber(activeContract.water_start_index),
      currentElectricityIndex: moneyNumber(activeContract.electricity_current_index),
      currentWaterIndex: moneyNumber(activeContract.water_current_index),
      vehicleCount: moneyNumber(activeContract.vehicle_count),
      vehicleFee: moneyNumber(activeContract.vehicle_fee),
      internetFee: moneyNumber(activeContract.internet_fee),
      trashFee: moneyNumber(activeContract.trash_fee),
      tenantAccepted: Boolean(activeContract.tenant_accepted_at),
      landlordAccepted: Boolean(activeContract.landlord_accepted_at),
      status: contractStatusVi[activeContract.status] || activeContract.status
    },
    contractHistory: contracts.map((contract) => ({
      id: contract.code,
      room: dbRooms.find((room) => room.id === contract.room_id)?.code || "-",
      tenant: users.find((user) => user.id === contract.tenant_user_id)?.full_name || "-",
      startDate: viDate(contract.start_date),
      endDate: viDate(contract.end_date),
      status: contractStatusVi[contract.status] || contract.status,
      handoverDate: contract.status === "TERMINATED" ? viDate(contract.end_date) : "-"
    })),
    invoices: invoiceDtos,
    readings: {
      electricity: {
        previous: moneyNumber(latestElectricity.previous_index),
        current: moneyNumber(latestElectricity.current_index),
        usage: moneyNumber(latestElectricity.usage_amount),
        unitPrice: moneyNumber(latestElectricity.unit_price),
        amount: moneyNumber(latestElectricity.amount)
      },
      water: {
        previous: moneyNumber(latestWater.previous_index),
        current: moneyNumber(latestWater.current_index),
        usage: moneyNumber(latestWater.usage_amount),
        unitPrice: moneyNumber(latestWater.unit_price),
        amount: moneyNumber(latestWater.amount)
      }
    },
    utilityHistory,
    paymentHistory: payments.map((payment) => {
      const invoice = invoices.find((item) => item.id === payment.invoice_id);
      const room = dbRooms.find((item) => item.id === invoice?.room_id);
      const payer = users.find((user) => user.id === payment.payer_user_id);
      return {
        id: payment.id,
        invoiceId: invoice?.code || payment.invoice_id,
        room: room?.code || "-",
        tenant: payer?.full_name || "-",
        month: viMonth(invoice?.from_date),
        date: payment.paid_at ? viDate(payment.paid_at) : "-",
        method: payment.method,
        amount: moneyNumber(payment.amount),
        status: paymentStatusVi[payment.status] || payment.status
      };
    }),
    paymentRevenue: revenue,
    repairs: repairs.map((repair) => ({
      id: repair.code,
      room: repair.room_code,
      sender: repair.requester_name,
      category: repair.category,
      priority: priorityVi[repair.priority] || repair.priority,
      priorityBy: repair.priority_setter_name || "Admin",
      date: viDate(repair.created_at),
      status: repairStatusVi[repair.status] || repair.status,
      description: repair.description,
      note: repair.landlord_note || "",
      images: repairImages.filter((image) => image.repair_request_id === repair.id).map((image) => image.file_name || image.file_url)
    })),
    revenue: revenue.map((item) => ({ month: item.month.slice(0, 5), value: item.value }))
  };
};
