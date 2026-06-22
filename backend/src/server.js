import http from "node:http";
import { URL, fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import connectMongo from "./config/dbMongo.js";
import { Room } from "./models/Room.js";
import { User } from "./models/User.js";
import { Contract } from "./models/Contract.js";
import { db, nextId } from "./data.js";
import { buildAppDataFromDatabase } from "./app-data-db.js";
import { checkDatabase } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const serveStatic = async (res, pathname) => {
  try {
    const ext = path.extname(pathname).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".svg": "image/svg+xml"
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const filePath = path.join(PUBLIC_DIR, pathname);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
    return true;
  } catch (err) {
    return false;
  }
};

const PORT = Number(process.env.PORT || 8080);

const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data, null, 2));
};

const readBody = async (req) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const getUserFromAuth = (req) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const [role, userId] = token.split(":");
  const user = db.users.find((item) => item.id === userId);
  if (!user || user.role !== role) return null;
  return user;
};

const publicUser = (user) => user && {
  id: user.id,
  fullName: user.fullName,
  phone: user.phone,
  email: user.email,
  role: user.role,
  citizenId: user.citizenId,
  status: user.status
};

const getTenantUser = (idOrEmail) =>
  db.users.find((user) => user.role === "TENANT" && (user.id === idOrEmail || user.email === idOrEmail));

const activeContractForRoom = (roomId) =>
  db.contracts.find((contract) => contract.roomId === roomId && ["ACTIVE", "PENDING_TENANT", "PENDING_LANDLORD"].includes(contract.status));

const activeContractForTenant = (tenantUserId) =>
  db.contracts.find((contract) => contract.tenantUserId === tenantUserId && ["ACTIVE", "PENDING_TENANT", "PENDING_LANDLORD"].includes(contract.status));

const toContractDto = (contract) => {
  const room = db.rooms.find((item) => item.id === contract.roomId);
  const landlord = db.users.find((item) => item.id === contract.landlordUserId);
  const tenant = db.users.find((item) => item.id === contract.tenantUserId);
  const occupants = db.contractOccupants.filter((item) => item.contractId === contract.id);
  return { ...contract, room, landlord: publicUser(landlord), tenant: publicUser(tenant), occupants };
};

const toRoomDto = (room) => {
  const contract = activeContractForRoom(room.id);
  const tenant = contract ? db.users.find((item) => item.id === contract.tenantUserId) : null;
  const latestInvoice = db.invoices
    .filter((invoice) => invoice.roomId === room.id)
    .sort((a, b) => b.toDate.localeCompare(a.toDate))[0] || null;
  return { ...room, activeContract: contract ? toContractDto(contract) : null, tenant: publicUser(tenant), latestInvoice };
};

const toTenantDto = (user) => {
  const contract = activeContractForTenant(user.id);
  const room = contract ? db.rooms.find((item) => item.id === contract.roomId) : null;
  return { ...publicUser(user), activeContract: contract ? toContractDto(contract) : null, room };
};

const toInvoiceDto = (invoice) => {
  const room = db.rooms.find((item) => item.id === invoice.roomId);
  const tenant = db.users.find((item) => item.id === invoice.tenantUserId);
  const landlord = db.users.find((item) => item.id === invoice.landlordUserId);
  const details = db.invoiceDetails
    .filter((item) => item.invoiceId === invoice.id)
    .map((item) => ({ ...item, service: db.services.find((service) => service.id === item.serviceId) || null }));
  const readings = db.meterReadings.filter((item) => item.invoiceId === invoice.id);
  const payments = db.payments.filter((item) => item.invoiceId === invoice.id);
  return { ...invoice, room, tenant: publicUser(tenant), landlord: publicUser(landlord), details, readings, payments };
};

const toRepairDto = (repair) => {
  const room = db.rooms.find((item) => item.id === repair.roomId);
  const requester = db.users.find((item) => item.id === repair.requesterUserId);
  const prioritySetter = db.users.find((item) => item.id === repair.prioritySetBy);
  const images = db.repairImages.filter((item) => item.repairRequestId === repair.id).sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...repair, room, requester: publicUser(requester), prioritySetter: publicUser(prioritySetter), images };
};

const toPaymentDto = (payment) => {
  const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
  const payer = db.users.find((item) => item.id === payment.payerUserId);
  const room = invoice ? db.rooms.find((item) => item.id === invoice.roomId) : null;
  return { ...payment, invoice, payer: publicUser(payer), room };
};

const revenueByMonth = (from, to) => {
  const result = new Map();
  for (const payment of db.payments) {
    if (payment.status !== "SUCCESS" || !payment.paidAt) continue;
    const day = payment.paidAt.slice(0, 10);
    if (from && day < from) continue;
    if (to && day > to) continue;
    const month = payment.paidAt.slice(0, 7);
    result.set(month, (result.get(month) || 0) + payment.amount);
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value }));
};

const utilitiesByRoom = (roomId) => {
  const months = [...new Set(db.meterReadings.filter((item) => item.roomId === roomId).map((item) => item.fromDate.slice(0, 7)))].sort();
  return months.map((month) => {
    const electricity = db.meterReadings.find((item) => item.roomId === roomId && item.fromDate.startsWith(month) && item.type === "ELECTRICITY");
    const water = db.meterReadings.find((item) => item.roomId === roomId && item.fromDate.startsWith(month) && item.type === "WATER");
    return { month, electricity, water, totalAmount: Number(electricity?.amount || 0) + Number(water?.amount || 0) };
  });
};

const daysBetweenIso = (from, to) => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;
  return Math.max(0, Math.floor((toDate - fromDate) / 86400000));
};

const notFound = (res) => json(res, 404, { message: "Resource not found" });

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathUrl = url.pathname;
  const parts = pathUrl.split("/").filter(Boolean);
  const method = req.method;

  if (parts[0] !== "api") {
    let filePath = pathUrl;
    if (filePath === "/") filePath = "/index.html";
    const served = await serveStatic(res, filePath);
    if (served) return;
  }

  try {
    if (pathUrl === "/api/health" && method === "GET") {
      let database = null;
      try {
        database = await checkDatabase();
      } catch (error) {
        database = { status: "disconnected", detail: error.message };
      }
      return json(res, 200, { status: "ok", service: "trohub-api", database, time: new Date().toISOString() });
    }

    if (pathUrl === "/api/db/health" && method === "GET") {
      return json(res, 200, { status: "ok", database: await checkDatabase() });
    }

    if (pathUrl === "/api/app-data" && method === "GET") {
      const data = await buildAppDataFromDatabase();
      return json(res, 200, { source: "postgres", data });
    }

    if (pathUrl === "/api/auth/login" && method === "POST") {
      const body = await readBody(req);
      // Query MongoDB
      let user = await User.findOne({ email: body.email, password: body.password }).lean();
      
      // Fallback for legacy static data testing
      if (!user) {
        const legacyUser = db.users.find((item) => item.email === body.email && item.password === body.password);
        if (legacyUser) user = legacyUser;
      }
      
      if (!user) return json(res, 401, { message: "Invalid email or password" });
      return json(res, 200, { token: `${user.role}:${user.id}`, user: publicUser(user) });
    }

    if (pathUrl === "/api/me" && method === "GET") {
      const user = getUserFromAuth(req);
      if (!user) return json(res, 401, { message: "Unauthorized" });
      return json(res, 200, { user: publicUser(user) });
    }

    if (pathUrl === "/api/dashboard" && method === "GET") {
      const totalRooms = db.rooms.length;
      const occupiedRooms = db.rooms.filter((room) => room.status === "OCCUPIED").length;
      const vacantRooms = db.rooms.filter((room) => room.status === "AVAILABLE").length;
      const unpaidInvoices = db.invoices.filter((invoice) => invoice.status !== "PAID").length;
      const monthlyRevenue = db.invoices.filter((invoice) => invoice.fromDate.startsWith("2026-05")).reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const unpaidRooms = db.rooms.filter((room) => {
        const latest = db.invoices.filter((invoice) => invoice.roomId === room.id).sort((a, b) => b.toDate.localeCompare(a.toDate))[0];
        return latest && latest.status !== "PAID";
      });
      return json(res, 200, {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        unpaidInvoices,
        monthlyRevenue,
        repairRequestCount: db.repairRequests.length,
        unpaidRooms: unpaidRooms.map(toRoomDto),
        paymentStatus: db.invoices.map(toInvoiceDto),
        newRepairRequests: db.repairRequests.slice(0, 5).map(toRepairDto)
      });
    }

    if (pathUrl === "/api/analytics/revenue" && method === "GET") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const data = revenueByMonth(from, to);
      return json(res, 200, {
        data,
        summary: {
          totalRevenue: data.reduce((sum, item) => sum + item.value, 0),
          vacantRooms: db.rooms.filter((room) => room.status === "AVAILABLE").length,
          repairRequestCount: db.repairRequests.length,
          successfulPayments: db.payments.filter((item) => item.status === "SUCCESS").length,
          pendingPayments: db.payments.filter((item) => item.status === "PENDING").length
        }
      });
    }

    if (pathUrl === "/api/payments" && method === "GET") {
      const payerUserId = url.searchParams.get("payerUserId") || url.searchParams.get("tenantUserId");
      const status = url.searchParams.get("status");
      const payments = db.payments
        .filter((payment) => !payerUserId || payment.payerUserId === payerUserId)
        .filter((payment) => !status || payment.status === status);
      return json(res, 200, { data: payments.map(toPaymentDto) });
    }

    if (pathUrl === "/api/rooms" && method === "GET") {
      const status = url.searchParams.get("status");
      const keyword = (url.searchParams.get("q") || "").toLowerCase();
      
      // Query from MongoDB
      const query = {};
      if (status) query.status = status;
      if (keyword) {
        query.$or = [
          { code: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } }
        ];
      }
      const rooms = await Room.find(query).lean();
      
      // Merge with legacy format if needed, but we'll return raw for now
      return json(res, 200, { data: rooms });
    }

    if (pathUrl === "/api/rooms" && method === "POST") {
      const body = await readBody(req);
      const roomCount = await Room.countDocuments();
      const newRoom = new Room({
        id: `R${Date.now()}`,
        houseId: body.houseId || "H001",
        ownerUserId: body.ownerUserId || "U001",
        code: body.code || `P${roomCount + 1}`,
        name: body.name || `Phòng ${roomCount + 1}`,
        areaM2: Number(body.areaM2 || 0),
        rentPrice: Number(body.rentPrice || 0),
        depositAmount: Number(body.depositAmount || 0),
        maxOccupants: Number(body.maxOccupants || 1),
        currentOccupants: Number(body.currentOccupants || 0),
        status: body.status || "AVAILABLE",
        note: body.note || ""
      });
      await newRoom.save();
      
      // Push to memory for legacy compatibility
      db.rooms.push(newRoom.toObject());
      
      return json(res, 201, { data: newRoom });
    }

    if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && method === "GET") {
      const room = db.rooms.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!room) return notFound(res);
      return json(res, 200, { data: toRoomDto(room) });
    }

    if (parts[0] === "api" && parts[1] === "rooms" && parts[2] && method === "PATCH") {
      const room = db.rooms.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!room) return notFound(res);
      Object.assign(room, await readBody(req));
      return json(res, 200, { data: toRoomDto(room) });
    }

    if (pathUrl === "/api/tenants" && method === "GET") {
      return json(res, 200, { data: db.users.filter((user) => user.role === "TENANT").map(toTenantDto) });
    }

    if (pathUrl === "/api/tenants" && method === "POST") {
      const body = await readBody(req);
      const userCount = await User.countDocuments();
      const newUser = new User({
        id: `U${Date.now()}`,
        fullName: body.fullName || "Khách Mới",
        phone: body.phone || "",
        email: body.email || `khach${userCount}@trohub.vn`,
        password: body.password || "123456",
        role: "TENANT",
        citizenId: body.citizenId || "",
        address: body.address || "",
        status: "ACTIVE"
      });
      await newUser.save();
      
      // Update memory for legacy compatibility
      db.users.push(newUser.toObject());
      
      return json(res, 201, { data: publicUser(newUser) });
    }

    if (pathUrl === "/api/contracts" && method === "GET") {
      return json(res, 200, { data: db.contracts.map(toContractDto) });
    }

    if (pathUrl === "/api/contracts" && method === "POST") {
      const body = await readBody(req);
      
      const newContract = new Contract({
        id: `C${Date.now()}`,
        code: body.code || `HD-${Date.now()}`,
        roomId: body.roomId,
        landlordUserId: body.landlordUserId || "U001",
        tenantUserId: body.tenantUserId,
        startDate: body.startDate || new Date().toISOString().split("T")[0],
        endDate: body.endDate || "2027-01-01",
        rentPrice: Number(body.rentPrice || 0),
        depositAmount: Number(body.depositAmount || 0),
        electricityUnitPrice: Number(body.electricityUnitPrice || 0),
        waterUnitPrice: Number(body.waterUnitPrice || 0),
        status: "ACTIVE" // For simplicity in this demo, activate immediately
      });
      await newContract.save();
      
      // Update the room's status to OCCUPIED in MongoDB
      if (body.roomId) {
        await Room.findOneAndUpdate({ id: body.roomId }, { status: "OCCUPIED" });
      }
      
      // Update memory for legacy compatibility
      db.contracts.push(newContract.toObject());
      const memoryRoom = db.rooms.find(r => r.id === body.roomId);
      if (memoryRoom) memoryRoom.status = "OCCUPIED";

      return json(res, 201, { data: newContract });
    }

    if (parts[0] === "api" && parts[1] === "contracts" && parts[2] && parts.length === 3 && method === "GET") {
      const contract = db.contracts.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!contract) return notFound(res);
      return json(res, 200, { data: toContractDto(contract) });
    }

    if (parts[0] === "api" && parts[1] === "contracts" && parts[2] && parts[3] === "tenant-approve" && method === "POST") {
      const contract = db.contracts.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!contract) return notFound(res);
      contract.tenantAcceptedAt = new Date().toISOString();
      contract.status = "PENDING_LANDLORD";
      return json(res, 200, { data: toContractDto(contract), message: "Tenant approved contract" });
    }

    if (parts[0] === "api" && parts[1] === "contracts" && parts[2] && parts[3] === "landlord-approve" && method === "POST") {
      const contract = db.contracts.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!contract) return notFound(res);
      contract.landlordAcceptedAt = new Date().toISOString();
      contract.status = "ACTIVE";
      return json(res, 200, { data: toContractDto(contract), message: "Landlord approved contract" });
    }

    if (pathUrl === "/api/invoices" && method === "GET") {
      const status = url.searchParams.get("status");
      const tenantUserId = url.searchParams.get("tenantUserId");
      const roomId = url.searchParams.get("roomId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const invoices = db.invoices
        .filter((invoice) => !status || invoice.status === status)
        .filter((invoice) => !tenantUserId || invoice.tenantUserId === tenantUserId)
        .filter((invoice) => !roomId || invoice.roomId === roomId)
        .filter((invoice) => !from || invoice.toDate >= from)
        .filter((invoice) => !to || invoice.fromDate <= to);
      return json(res, 200, { data: invoices.map(toInvoiceDto) });
    }

    if (pathUrl === "/api/invoices" && method === "POST") {
      const body = await readBody(req);
      const subtotal = Math.max(0, Number(body.roomAmount || 0) + Number(body.electricityAmount || 0) + Number(body.waterAmount || 0) + Number(body.serviceAmount || 0) - Number(body.discountAmount || 0));
      const exportDate = body.exportDate || body.issuedDate || body.dueDate;
      const checkDate = body.checkDate || body.paymentCheckDate || new Date().toISOString().slice(0, 10);
      const daysAfterExport = daysBetweenIso(exportDate, checkDate);
      const unpaid = !["PAID", "SUCCESS"].includes(body.status || body.paidStatus || "UNPAID");
      const penaltyDays = unpaid ? Math.max(0, daysAfterExport - 7) : 0;
      const penaltyRate = 0.1;
      const penaltyAmount = body.penaltyAmount !== undefined ? Number(body.penaltyAmount) : (penaltyDays > 0 ? Math.round(subtotal * penaltyRate) : 0);
      const totalAmount = subtotal + penaltyAmount;
      const invoice = {
        id: nextId("I", db.invoices),
        code: body.code || `HD-${Date.now()}`,
        roomId: body.roomId,
        landlordUserId: body.landlordUserId || "U001",
        tenantUserId: body.tenantUserId,
        contractId: body.contractId || null,
        fromDate: body.fromDate,
        toDate: body.toDate,
        dueDate: body.dueDate,
        roomAmount: Number(body.roomAmount || 0),
        electricityAmount: Number(body.electricityAmount || 0),
        waterAmount: Number(body.waterAmount || 0),
        serviceAmount: Number(body.serviceAmount || 0),
        discountAmount: Number(body.discountAmount || 0),
        penaltyDays,
        penaltyRate,
        penaltyAmount,
        totalAmount,
        paymentMethod: body.paymentMethod || null,
        transactionCode: body.transactionCode || "",
        paidAt: null,
        status: "UNPAID"
      };
      db.invoices.push(invoice);

      for (const reading of body.meterReadings || []) {
        const usageAmount = Number(reading.currentIndex || 0) - Number(reading.previousIndex || 0);
        db.meterReadings.push({
          id: nextId("M", db.meterReadings),
          roomId: invoice.roomId,
          contractId: invoice.contractId,
          invoiceId: invoice.id,
          type: reading.type,
          fromDate: invoice.fromDate,
          toDate: invoice.toDate,
          previousIndex: Number(reading.previousIndex || 0),
          currentIndex: Number(reading.currentIndex || 0),
          usageAmount,
          unitPrice: Number(reading.unitPrice || 0),
          amount: usageAmount * Number(reading.unitPrice || 0),
          createdBy: invoice.landlordUserId
        });
      }

      return json(res, 201, { data: toInvoiceDto(invoice) });
    }

    if (parts[0] === "api" && parts[1] === "invoices" && parts[2] && parts.length === 3 && method === "GET") {
      const invoice = db.invoices.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!invoice) return notFound(res);
      return json(res, 200, { data: toInvoiceDto(invoice) });
    }

    if (parts[0] === "api" && parts[1] === "invoices" && parts[2] && parts[3] === "mark-paid" && method === "POST") {
      const invoice = db.invoices.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!invoice) return notFound(res);
      invoice.status = "PAID";
      invoice.paidAt = new Date().toISOString();
      return json(res, 200, { data: toInvoiceDto(invoice), message: "Invoice marked as paid" });
    }

    if (parts[0] === "api" && parts[1] === "invoices" && parts[2] && parts[3] === "remind" && method === "POST") {
      const invoice = db.invoices.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!invoice) return notFound(res);
      const notification = { id: nextId("N", db.notifications), userId: invoice.tenantUserId, title: "Nhắc thanh toán", message: `Vui lòng thanh toán hóa đơn ${invoice.code}`, createdAt: new Date().toISOString(), status: "SENT" };
      db.notifications.push(notification);
      return json(res, 200, { data: notification });
    }

    if (parts[0] === "api" && parts[1] === "invoices" && parts[2] && parts[3] === "pay" && method === "POST") {
      const invoice = db.invoices.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!invoice) return notFound(res);
      const body = await readBody(req);
      const payment = {
        id: nextId("PM", db.payments),
        invoiceId: invoice.id,
        payerUserId: invoice.tenantUserId,
        method: body.method || invoice.paymentMethod || "BANK_QR",
        amount: Number(body.amount || invoice.totalAmount),
        transactionCode: body.transactionCode || `TXN${Date.now()}`,
        penaltyAmount: Number(body.penaltyAmount || invoice.penaltyAmount || 0),
        paidAt: new Date().toISOString(),
        status: "SUCCESS"
      };
      db.payments.push(payment);
      invoice.status = "PAID";
      invoice.paymentMethod = payment.method;
      invoice.transactionCode = payment.transactionCode;
      invoice.paidAt = payment.paidAt;
      return json(res, 201, { data: toPaymentDto(payment), invoice: toInvoiceDto(invoice) });
    }

    if (pathUrl === "/api/meter-readings" && method === "GET") {
      const roomId = url.searchParams.get("roomId");
      const month = url.searchParams.get("month");
      const readings = db.meterReadings.filter((item) => (!roomId || item.roomId === roomId) && (!month || item.fromDate.startsWith(month)));
      return json(res, 200, { data: readings });
    }

    if (pathUrl === "/api/meter-readings" && method === "POST") {
      const body = await readBody(req);
      const usageAmount = Number(body.currentIndex || 0) - Number(body.previousIndex || 0);
      const reading = {
        id: nextId("M", db.meterReadings),
        roomId: body.roomId,
        contractId: body.contractId || null,
        invoiceId: body.invoiceId || null,
        type: body.type,
        fromDate: body.fromDate,
        toDate: body.toDate,
        previousIndex: Number(body.previousIndex || 0),
        currentIndex: Number(body.currentIndex || 0),
        usageAmount,
        unitPrice: Number(body.unitPrice || 0),
        amount: usageAmount * Number(body.unitPrice || 0),
        createdBy: body.createdBy || "U001"
      };
      db.meterReadings.push(reading);
      return json(res, 201, { data: reading });
    }

    if (pathUrl === "/api/repairs" && method === "GET") {
      const requesterUserId = url.searchParams.get("requesterUserId") || url.searchParams.get("tenantUserId");
      const page = Number(url.searchParams.get("page") || 1);
      const limit = Number(url.searchParams.get("limit") || 10);
      const filtered = db.repairRequests.filter((item) => !requesterUserId || item.requesterUserId === requesterUserId);
      const start = (page - 1) * limit;
      return json(res, 200, { data: filtered.slice(start, start + limit).map(toRepairDto), page, limit, total: filtered.length });
    }

    if (pathUrl === "/api/repairs" && method === "POST") {
      const body = await readBody(req);
      const repair = {
        id: nextId("RR", db.repairRequests),
        code: `YC${String(db.repairRequests.length + 1).padStart(3, "0")}`,
        roomId: body.roomId,
        requesterUserId: body.requesterUserId,
        category: body.category,
        priority: "UNSET",
        prioritySetBy: null,
        description: body.description || "",
        status: "NEW",
        landlordNote: "",
        createdAt: new Date().toISOString()
      };
      db.repairRequests.push(repair);
      for (const [index, image] of (body.images || []).entries()) {
        db.repairImages.push({
          id: nextId("RI", db.repairImages),
          repairRequestId: repair.id,
          fileUrl: image.fileUrl || image.url || image,
          fileName: image.fileName || `repair-${index + 1}.jpg`,
          mimeType: image.mimeType || "image/jpeg",
          sortOrder: index + 1
        });
      }
      return json(res, 201, { data: toRepairDto(repair) });
    }

    if (parts[0] === "api" && parts[1] === "repairs" && parts[2] && method === "PATCH") {
      const repair = db.repairRequests.find((item) => item.id === parts[2] || item.code === parts[2]);
      if (!repair) return notFound(res);
      const body = await readBody(req);
      if (body.priority) {
        repair.priority = body.priority;
        repair.prioritySetBy = body.prioritySetBy || "U001";
      }
      Object.assign(repair, {
        status: body.status || repair.status,
        landlordNote: body.landlordNote ?? repair.landlordNote
      });
      return json(res, 200, { data: toRepairDto(repair) });
    }

    if (pathUrl === "/api/mobile/home" && method === "GET") {
      const tenantUserId = url.searchParams.get("tenantUserId") || "U002";
      const user = getTenantUser(tenantUserId);
      if (!user) return notFound(res);
      const contract = activeContractForTenant(user.id);
      const room = contract ? db.rooms.find((item) => item.id === contract.roomId) : null;
      const currentInvoice = db.invoices.find((item) => item.tenantUserId === user.id && item.fromDate.startsWith("2026-05"));
      const latestRepair = db.repairRequests.find((item) => item.requesterUserId === user.id);
      return json(res, 200, { tenant: toTenantDto(user), room, currentInvoice, contract: contract ? toContractDto(contract) : null, latestRepair: latestRepair ? toRepairDto(latestRepair) : null });
    }

    if (pathUrl === "/api/mobile/payment-summary" && method === "GET") {
      const tenantUserId = url.searchParams.get("tenantUserId") || "U002";
      const payments = db.payments.filter((item) => item.payerUserId === tenantUserId);
      const paidChart = payments
        .filter((item) => item.status === "SUCCESS")
        .map((item) => ({ month: item.paidAt ? item.paidAt.slice(0, 7) : "", amount: item.amount, method: item.method, invoiceId: item.invoiceId }));
      return json(res, 200, {
        data: {
          payments: payments.map(toPaymentDto),
          paidChart,
          totalPaid: payments.filter((item) => item.status === "SUCCESS").reduce((sum, item) => sum + item.amount, 0),
          totalPending: payments.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.amount, 0)
        }
      });
    }

    if (pathUrl === "/api/mobile/utilities" && method === "GET") {
      const tenantUserId = url.searchParams.get("tenantUserId") || "U002";
      const contract = activeContractForTenant(tenantUserId);
      if (!contract) return notFound(res);
      return json(res, 200, { data: utilitiesByRoom(contract.roomId) });
    }

    if (pathUrl === "/api/settings" && method === "GET") {
      return json(res, 200, { data: { landlord: publicUser(db.users.find((item) => item.id === "U001")), house: db.boardingHouses[0] } });
    }

    if (pathUrl === "/api/settings" && method === "PATCH") {
      const body = await readBody(req);
      Object.assign(db.users.find((item) => item.id === "U001"), body.landlord || {});
      Object.assign(db.boardingHouses[0], body.house || {});
      return json(res, 200, { data: { landlord: publicUser(db.users.find((item) => item.id === "U001")), house: db.boardingHouses[0] } });
    }

    return notFound(res);
  } catch (error) {
    return json(res, 500, { message: "Internal server error", detail: error.message });
  }
});

// Connect to MongoDB then start server
connectMongo().then(() => {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`TroHub API is running at http://127.0.0.1:${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
  });
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});
