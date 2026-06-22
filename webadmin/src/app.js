import { appData, money } from "./data.js";

const formatPhone = (val) => {
  if (!val) return "-";
  let v = String(val).replace(/\D/g, "");
  if (v.length > 7) return v.replace(/(\d{4})(\d{3})(\d+)/, "$1.$2.$3");
  if (v.length > 4) return v.replace(/(\d{4})(\d+)/, "$1.$2");
  return v;
};

const formatCCCD = (val) => {
  if (!val) return "-";
  let v = String(val).replace(/\D/g, "");
  if (v.length > 8) return v.replace(/(\d{4})(\d{4})(\d+)/, "$1.$2.$3");
  if (v.length > 4) return v.replace(/(\d{4})(\d+)/, "$1.$2");
  return v;
};
import { api } from "./api.js?v=21";

const app = document.querySelector("#app");

let state = {
  role: "guest",
  user: null,
  adminPage: "dashboard",
  tenantPage: "overview",
  selectedRoom: "A101",
  selectedTenant: "",
  selectedInvoice: "HD0526-A101",
  selectedRepair: "",
  selectedContract: "",
  dashboardFrom: "01/05/2026",
  dashboardTo: "31/05/2026",
  invoiceFrom: "01/05/2026",
  invoiceTo: "31/05/2026",
  createFrom: "01/05/2026",
  createTo: "31/05/2026",
  createDue: "05/06/2026",
  createExportDate: "05/06/2026",
  createCheckDate: "13/06/2026",
  calcRoomAmount: 2500000,
  calcElectricityOld: 1270,
  calcElectricityNew: 1350,
  calcElectricityPrice: 4000,
  calcWaterOld: 50,
  calcWaterNew: 57,
  calcWaterPrice: 15000,
  calcServiceAmount: 330000,
  calcDiscount: 0,
  calcPaidStatus: "Chưa thanh toán",
  activeCalendar: "",
  calendarView: {},
  toast: "",
  apiOnline: false,
  landlord: appData.landlord,
  roomsData: null,
  tenantsData: null,
  contractsData: null,
  contractHistoryData: null,
  invoicesData: null,
  repairsData: null,
  paymentHistoryData: null,
  tenantPortal: null,
  roomFilter: "Tất cả",
  searchQuery: "",
  showRegister: false,
  contractStartDate: (() => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })(),
  contractEndDate: (() => { const d = new Date(); d.setFullYear(d.getFullYear()+1); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()
};

const arrays = {
  rooms: () => state.roomsData || [],
  tenants: () => state.tenantsData || [],
  contracts: () => state.contractsData || [],
  contractHistory: () => state.contractHistoryData || [],
  invoices: () => state.invoicesData || [],
  repairs: () => state.repairsData || [],
  payments: () => state.paymentHistoryData || []
};

const statusClass = (status = "") => {
  if (status.includes("Đã") || status.includes("Còn hiệu lực") || status.includes("hoàn thành")) return "success";
  if (status.includes("Quá") || status.includes("Ngừng")) return "danger";
  if (status.includes("Đang") || status.includes("Chưa") || status.includes("Nháp")) return "warning";
  return "info";
};

const setState = (patch) => {
  state = { ...state, ...patch };
  render();
};

const showToast = (message) => {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2400);
};

const numberValue = (value) => Number(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
const shortMoney = (value) => `${Math.round(numberValue(value) / 100000) / 10}tr`;
const penaltyRateText = (value) => Number(value) <= 1 ? `${Math.round(Number(value) * 100)}%` : money(value);
const badge = (label) => `<span class="badge ${statusClass(label)}">${label}</span>`;
const button = (label, action, variant = "primary") => `<button class="btn ${variant}" data-action="${action}">${label}</button>`;

const parseDate = (value) => {
  const [day, month, year] = String(value || "").split("/").map(Number);
  if (!day || !month || !year) return new Date(2026, 4, 1);
  return new Date(year, month - 1, day);
};

const formatDate = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const daysBetween = (from, to) => Math.max(0, Math.floor((parseDate(to) - parseDate(from)) / 86400000));

const findRoom = () => arrays.rooms().find((room) => room.id === state.selectedRoom) || arrays.rooms()[0] || {};
const findTenant = () => arrays.tenants().find((tenant) => tenant.id === state.selectedTenant) || {};
const findInvoice = () => arrays.invoices().find((invoice) => invoice.id === state.selectedInvoice) || arrays.invoices()[0] || {};
const findRepair = () => arrays.repairs().find((repair) => repair.id === state.selectedRepair) || sortedRepairs()[0] || {};
const findContract = () => {
  if (state.selectedContract === "") {
    const r = arrays.rooms().find(r => r.id === state.contractSelectedRoom) || arrays.rooms()[0] || {};
    return { id: "", room: r.id || "", tenant: "", rent: r.rent || 0, deposit: r.deposit || 0, status: "Nháp" };
  }
  return arrays.contracts().find((contract) => contract.id === state.selectedContract) || arrays.contracts()[0] || { id: "", room: "", tenant: "", rent: 0, deposit: 0, status: "Nháp" };
};
const tenantPortal = () => state.tenantPortal || {};
const tenantInvoices = () => tenantPortal().invoices || [];
const tenantPayments = () => tenantPortal().payments || [];
const tenantRepairs = () => tenantPortal().repairs || [];
const tenantContracts = () => tenantPortal().contracts || [];
const tenantUnpaidInvoices = () => tenantInvoices().filter((invoice) => invoice.status !== "Đã thanh toán");
const activeTenantContract = () => tenantContracts().find((contract) => contract.status !== "Đã kết thúc") || tenantContracts()[0] || {};

const calculateInvoice = () => {
  const electricityUsage = Math.max(0, numberValue(state.calcElectricityNew) - numberValue(state.calcElectricityOld));
  const waterUsage = Math.max(0, numberValue(state.calcWaterNew) - numberValue(state.calcWaterOld));
  const electricityAmount = electricityUsage * numberValue(state.calcElectricityPrice);
  const waterAmount = waterUsage * numberValue(state.calcWaterPrice);
  const subtotal = Math.max(0, numberValue(state.calcRoomAmount) + electricityAmount + waterAmount + numberValue(state.calcServiceAmount) - numberValue(state.calcDiscount));
  const daysAfterExport = daysBetween(state.createExportDate, state.createCheckDate);
  const isLate = state.calcPaidStatus !== "Đã thanh toán" && daysAfterExport > 7;
  const penalty = isLate ? Math.round(subtotal * 0.1) : 0;
  return {
    electricityUsage,
    waterUsage,
    electricityAmount,
    waterAmount,
    subtotal,
    daysAfterExport,
    lateDays: Math.max(0, daysAfterExport - 7),
    penalty,
    total: subtotal + penalty,
    isLate
  };
};

const sortedRepairs = () => [...arrays.repairs()].sort((a, b) => parseDate(b.date) - parseDate(a.date));

const shiftedMonth = (key, fallback, diff) => {
  const [year, month] = (state.calendarView[key] || monthKey(parseDate(fallback))).split("-").map(Number);
  const next = new Date(year, month - 1 + diff, 1);
  return monthKey(next);
};

const renderCalendar = (key, value) => {
  const selected = parseDate(value);
  const [year, month] = (state.calendarView[key] || monthKey(selected)).split("-").map(Number);
  const viewDate = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstOffset = (viewDate.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstOffset; i += 1) cells.push("");
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push("");
  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return `
    <div class="calendar-popover">
      <div class="calendar-head">
        <button type="button" data-calendar-shift="${key}" data-calendar-dir="-1">‹</button>
        <strong>Tháng ${String(month).padStart(2, "0")}/${year}</strong>
        <button type="button" data-calendar-shift="${key}" data-calendar-dir="1">›</button>
      </div>
      <table class="calendar-table">
        <thead><tr>${weekDays.map((day) => `<th>${day}</th>`).join("")}</tr></thead>
        <tbody>
          ${Array.from({ length: cells.length / 7 }, (_, rowIndex) => `
            <tr>
              ${cells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                if (!day) return "<td></td>";
                const date = new Date(year, month - 1, day);
                const dateText = formatDate(date);
                const isSelected = dateText === value;
                return `<td><button type="button" class="${isSelected ? "selected" : ""}" data-date-pick="${key}" data-date-value="${dateText}">${day}</button></td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
};

const renderBarChart = (items, valueKey = "value", labelKey = "month", formatter = shortMoney, maxHeight = 220) => {
  const safeItems = items.length ? items : [{ month: "-", value: 0 }];
  const max = Math.max(...safeItems.map((item) => numberValue(item[valueKey])), 1);
  return `
    <div class="bar-chart analytics-chart">
      ${safeItems.map((item) => `
        <div class="bar-item">
          <div class="bar-value">${formatter(item[valueKey])}</div>
          <div class="bar" style="height:${Math.max(14, Math.round(numberValue(item[valueKey]) / max * maxHeight))}px"></div>
          <span>${item[labelKey]}</span>
        </div>
      `).join("")}
    </div>
  `;
};

const field = (label, value = "", type = "text", name = "", extra = "") => {
  let displayValue = value ?? "";
  if (name === "phone") {
    displayValue = formatPhone(displayValue);
  } else if (name === "citizenId") {
    displayValue = formatCCCD(displayValue);
  }
  return `
  <label class="field">
    <span>${label}</span>
    <input type="${type}" value="${displayValue}" ${name ? `data-field="${name}"` : ""} ${extra} />
  </label>
`};

const moneyInputField = (label, value = "", name = "", placeholder = "") => `
  <label class="field money-field">
    <span>${label}</span>
    <div style="position:relative; display:flex; align-items:center;">
      <input type="text" data-type="money" value="${value ? new Intl.NumberFormat("vi-VN").format(numberValue(value)) : ""}" ${name ? `data-field="${name}"` : ""} placeholder="${placeholder}" style="padding-right:30px; width:100%" />
      <span style="position:absolute; right:12px; color:var(--muted); pointer-events:none">₫</span>
    </div>
  </label>
`;

const textareaField = (label, value = "", name = "") => `
  <label class="field full-line">
    <span>${label}</span>
    <textarea ${name ? `data-field="${name}"` : ""}>${value ?? ""}</textarea>
  </label>
`;

const selectField = (label, value, options, name = "") => `
  <label class="field">
    <span>${label}</span>
    <select ${name ? `data-field="${name}"` : ""}>
      ${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
    </select>
  </label>
`;

const calcField = (label, key, type = "number") => `
  <label class="field">
    <span>${label}</span>
    <input type="${type}" value="${state[key]}" data-calc-field="${key}" />
  </label>
`;

const dateField = (label, value, key) => `
  <label class="field date-field">
    <span>${label}</span>
    <div class="date-input-wrap">
      <input type="text" value="${value}" readonly />
      <button type="button" class="date-trigger" data-calendar-toggle="${key}" aria-label="Chọn ${label}">Lịch</button>
    </div>
    ${state.activeCalendar === key ? renderCalendar(key, value) : ""}
  </label>
`;

const calcSelectField = (label, key, options) => `
  <label class="field">
    <span>${label}</span>
    <select data-calc-field="${key}">
      ${options.map((option) => `<option ${option === state[key] ? "selected" : ""}>${option}</option>`).join("")}
    </select>
  </label>
`;

const calcOutput = (key, value) => `<b data-calc-output="${key}">${value}</b>`;

const shell = (content) => `
  <main class="app-shell">
    ${content}
    ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
  </main>
`;

const renderLogin = () => shell(`
  <section class="login">
    <div class="login-brand">
      <div class="brand-mark large">TH</div>
      <h1>Quản lý phòng trọ dễ dàng hơn</h1>
      <p>TroHub giúp chủ trọ và khách thuê theo dõi phòng, hợp đồng, hóa đơn, điện nước và sửa chữa trong một hệ thống thống nhất.</p>
      <div class="building-art">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
    <div class="login-panel card">
      <div class="brand-row">
        <div class="brand-mark">TH</div>
        <strong>TroHub</strong>
      </div>
      <div class="login-tabs">
        <button class="chip ${!state.showRegister ? 'active' : ''}" data-action="show-login">Đăng nhập</button>
        <button class="chip ${state.showRegister ? 'active' : ''}" data-action="show-register">Đăng ký</button>
      </div>
      ${!state.showRegister ? `
        <h2>Đăng nhập hệ thống</h2>
        <p class="muted">Đăng nhập bằng tài khoản chủ trọ hoặc người thuê.</p>
        <label class="field"><span>Tên đăng nhập</span><input id="login-email" value="admin@trohub.vn" /></label>
        <label class="field"><span>Mật khẩu</span><input id="login-password" type="password" value="123456" /></label>
        <div class="login-meta">
          <label><input type="checkbox" checked /> Ghi nhớ đăng nhập</label>
        </div>
        <button class="btn primary full" data-login>Đăng nhập</button>
        <div class="demo-note">
          <b>Tài khoản mẫu</b>
          <span>Admin: admin@trohub.vn / 123456</span>
          <span>Khách: tenant@trohub.vn / 123456</span>
        </div>
      ` : `
        <h2>Đăng ký tài khoản mới</h2>
        <p class="muted">Đăng ký tài khoản chủ trọ hoặc người thuê.</p>
        <label class="field"><span>Họ tên *</span><input id="reg-fullName" placeholder="Nguyễn Văn A" /></label>
        <label class="field"><span>Số điện thoại *</span><input id="reg-phone" placeholder="0901234567" /></label>
        <label class="field"><span>Email (Đồng thời là tên đăng nhập) *</span><input id="reg-email" type="email" placeholder="email@example.com" /></label>
        <label class="field"><span>CCCD</span><input id="reg-idCard" placeholder="079012345678" /></label>
        <label class="field"><span>Mật khẩu *</span><input id="reg-password" type="password" placeholder="Ít nhất 6 ký tự" /></label>
        <label class="field">
          <span>Loại tài khoản</span>
          <select id="reg-role">
            <option value="1">Chủ trọ</option>
            <option value="2" selected>Người thuê</option>
          </select>
        </label>
        <button class="btn primary full" data-register>Đăng ký</button>
      `}
    </div>
  </section>
`);

const sidebarItems = [
  ["dashboard", "Dashboard"],
  ["rooms", "Phòng trọ"],
  ["tenants", "Khách thuê"],
  ["contract", "Hợp đồng"],
  ["invoices", "Hóa đơn"],
  ["payments", "Lịch sử thanh toán"],
  ["repairs", "Sửa chữa"],
  ["settings", "Cài đặt"]
];

const renderAdminShell = (title, content, action = "Tạo hóa đơn") => `
  <section class="admin-layout">
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand-mark">TH</div>
        <strong>TroHub</strong>
      </div>
      <nav>
        ${sidebarItems.map(([id, label]) => `
          <button class="${state.adminPage === id ? "active" : ""}" data-admin-nav="${id}">${label}</button>
        `).join("")}
      </nav>
      <button class="btn outline full" data-logout>Đăng xuất</button>
    </aside>
    <section class="admin-main">
      <header class="topbar">
        <div>
          <h1>${title}</h1>
        </div>
        <div class="topbar-actions">
          <div class="search wide"><input type="text" placeholder="🔍 Tìm kiếm phòng, khách, hóa đơn..." value="${state.searchQuery}" data-global-search /></div>
          ${button(action, action.includes("phòng") ? "add-room" : action.includes("biểu đồ") ? "export-revenue-chart" : "create-invoice")}
          <span style="font-weight: 500; margin-left: 10px; color: var(--primary);">Xin chào Chủ trọ ${state.user?.fullName || state.user?.username || ''}</span>
          <button class="icon-btn">N</button>
          <div class="avatar">A</div>
        </div>
      </header>
      <div class="admin-content">${content}</div>
    </section>
  </section>
  ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
`;

const revenueSeries = () => {
  const totals = new Map();
  arrays.payments()
    .filter((payment) => payment.status === 1 || payment.status === "1" || payment.status === "Thành công" || payment.status === "Đã thanh toán")
    .forEach((payment) => totals.set(payment.month, (totals.get(payment.month) || 0) + numberValue(payment.amount)));
  
  let series = [...totals.entries()]
    .filter(([month]) => month && month.includes('/'))
    .map(([month, value]) => ({ month, value, sortKey: month.split('/').reverse().join('') }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ month, value }) => ({ month, value }));
    
  if (series.length === 0) return []; // KHÔNG HIỂN THỊ GIẢ
  
  const limit = parseInt(state.revenueFilter || "6", 10);
  return series.slice(-limit);
};

const renderDashboard = () => {
  const rooms = arrays.rooms();
  const invoices = arrays.invoices();
  const repairs = arrays.repairs();
  const totalRooms = rooms.length || 1;
  const occupied = rooms.filter((room) => room.status === "Đang thuê").length;
  const vacant = rooms.filter((room) => room.status === "Còn trống").length;
  const unpaidRooms = rooms.filter((room) => ["Chưa thanh toán", "Quá hạn"].includes(room.payment));
  const series = revenueSeries();
  const revenue = series.at(-1)?.value || 0;

  return renderAdminShell("Dashboard", `
    <div class="filter-row">
      <button class="chip ${state.revenueFilter === '1' ? 'active' : ''}" data-action="filter-rev-1">Tháng này</button>
      <button class="chip ${state.revenueFilter === '3' ? 'active' : ''}" data-action="filter-rev-3">3 tháng</button>
      <button class="chip ${(!state.revenueFilter || state.revenueFilter === '6') ? 'active' : ''}" data-action="filter-rev-6">6 tháng</button>
    </div>
    <div class="metric-grid">
      <article class="metric card"><span>Tổng số phòng</span><strong>${rooms.length}</strong><small>Toàn bộ hệ thống</small></article>
      <article class="metric card"><span>Phòng đang thuê</span><strong>${occupied}</strong><small>${Math.round((occupied / totalRooms) * 100)}% công suất</small></article>
      <article class="metric card"><span>Phòng trống</span><strong>${vacant}</strong><small>Cần đăng tin / cho thuê</small></article>
      <article class="metric card"><span>Yêu cầu sửa chữa</span><strong>${repairs.length}</strong><small>Admin phân độ ưu tiên</small></article>
    </div>
    
    <h2 style="margin: 24px 0 16px;">Lối tắt nhanh</h2>
    <div class="metric-grid" style="margin-bottom: 24px;">
      <article class="metric card" style="cursor:pointer; align-items:center;" data-action="add-room">
        <strong>Thêm phòng</strong><small>Tạo phòng mới</small>
      </article>
      <article class="metric card" style="cursor:pointer; align-items:center;" data-action="add-contract">
        <strong>Tạo hợp đồng</strong><small>Cho khách mới</small>
      </article>
      <article class="metric card" style="cursor:pointer; align-items:center;" data-action="create-invoice">
        <strong>Tạo hóa đơn</strong><small>Ghi điện nước</small>
      </article>
      <article class="metric card" style="cursor:pointer; align-items:center;" data-admin-nav="repairs">
        <strong>Sửa chữa</strong><small>Xử lý sự cố</small>
      </article>
    </div>
    <div class="dash-grid">
      <article class="card panel">
        <div class="panel-head"><h2>Biểu đồ doanh thu</h2><span class="muted">Từ dữ liệu thanh toán</span></div>
        ${renderBarChart(series)}
        <div class="chart-summary">
          <div><span>Doanh thu gần nhất</span><b>${money(revenue)}</b></div>
          <div><span>Phòng trống</span><b>${vacant} phòng</b></div>
          <div><span>Hóa đơn chưa thanh toán</span><b>${invoices.filter((invoice) => invoice.status !== "Đã thanh toán").length}</b></div>
        </div>
      </article>
      <article class="card panel">
        <div class="panel-head"><h2>Xem nhanh phòng chưa thanh toán</h2>${button("Xem hóa đơn", "create-invoice", "outline")}</div>
        <div class="repair-list">
          ${unpaidRooms.map((room) => `
            <button class="repair-row" data-admin-nav="invoices">
              <strong>${room.id} - ${room.tenant}</strong>
              <span>${room.payment} • Tiền thuê ${money(room.rent)}</span>
              ${badge(room.payment)}
            </button>
          `).join("") || "<p class='muted'>Không có phòng đang nợ.</p>"}
        </div>
      </article>
    </div>
    <div class="dash-grid">
      <article class="card panel">
        <div class="panel-head"><h2>Yêu cầu sửa chữa mới</h2>${button("Xem tất cả", "go-repairs", "outline")}</div>
        <div class="repair-list">
          ${sortedRepairs().slice(0, 3).map((repair) => `
            <button class="repair-row" data-admin-nav="repairs">
              <strong>${repair.category} - ${repair.room}</strong>
              <span>${repair.description}</span>
              ${badge(repair.status)} ${badge(`Ưu tiên: ${repair.priority}`)}
            </button>
          `).join("") || "<p class='muted'>Chưa có yêu cầu sửa chữa.</p>"}
        </div>
      </article>
      <article class="card panel">
        <h2>Ghi chú nghiệp vụ hợp đồng</h2>
        <p class="muted">Khi đổi khách thuê, hợp đồng cũ kết thúc và tạo hợp đồng mới. Chỉ số điện nước bàn giao được lưu theo hợp đồng và dùng làm chỉ số đầu kỳ cho hóa đơn tiếp theo.</p>
      </article>
    </div>
    <article class="card panel">
      <div class="panel-head"><h2>Tình trạng thanh toán từng phòng</h2>${button("Tạo hóa đơn", "create-invoice")}</div>
      ${renderInvoiceTable(invoices)}
    </article>
  `);
};

const renderRoomCard = (room) => `
  <article class="room-card card">
    <div class="card-title">
      <h3>${room.name}</h3>
      ${badge(room.status)}
    </div>
    <dl>
      <div><dt>Giá thuê</dt><dd>${money(room.rent)}</dd></div>
      <div><dt>Diện tích</dt><dd>${room.area}m2</dd></div>
      <div><dt>Số người</dt><dd>${room.occupantCount}/${room.max}</dd></div>
      <div><dt>Khách thuê</dt><dd>${room.tenant}</dd></div>
      <div><dt>Thanh toán</dt><dd>${room.payment}</dd></div>
    </dl>
    <button class="btn outline full" data-room-detail="${room.id}">Xem chi tiết</button>
  </article>
`;

const renderRooms = () => {
  const filterMap = { "Tất cả": null, "Đang thuê": "Đang thuê", "Còn trống": "Còn trống", "Bảo trì": "Bảo trì" };
  const q = state.searchQuery.toLowerCase();
  let rooms = arrays.rooms();
  if (state.roomFilter !== "Tất cả") rooms = rooms.filter(r => r.status === filterMap[state.roomFilter]);
  if (q) rooms = rooms.filter(r => (r.name + r.tenant + r.id).toLowerCase().includes(q));
  return renderAdminShell("Quản lý phòng", `
  <div class="filter-row">
    ${["Tất cả", "Đang thuê", "Còn trống", "Bảo trì"].map(f => `<button class="chip ${state.roomFilter === f ? 'active' : ''}" data-room-filter="${f}">${f}</button>`).join("")}
    <div class="search wide"><input type="text" placeholder="Tìm theo mã phòng / tên khách" value="${state.searchQuery}" data-search-rooms /></div>
  </div>
  <div class="room-grid">
    ${rooms.map(renderRoomCard).join("") || "<p class='muted'>Không tìm thấy phòng nào.</p>"}
  </div>
`, "+ Thêm phòng");
};

const renderRoomDetail = () => {
  const room = findRoom();
  const invoices = arrays.invoices().filter((invoice) => invoice.room === room.id);
  return renderAdminShell(room.name || "Chi tiết phòng", `
    <div class="detail-header card">
      <div>
        <h2>${room.name || "-"}</h2>
        ${badge(room.status || "-")}
      </div>
      <div class="actions">
        ${button("Sửa phòng", "edit-room", "outline")}
        ${button("Xóa phòng", "delete-room", "danger")}
        ${button("Tạo hóa đơn", "create-invoice")}
      </div>
    </div>
    <div class="tabs"><button class="active">Tổng quan</button><button>Khách thuê</button><button>Hợp đồng</button><button>Điện nước</button><button>Hóa đơn</button><button>Sửa chữa</button></div>
    <div class="two-col">
      <article class="card panel">
        <h2>Tổng quan phòng</h2>
        <dl class="info-list">
          <div><dt>Giá thuê</dt><dd>${money(room.rent || 0)}</dd></div>
          <div><dt>Tiền cọc</dt><dd>${money(room.deposit || 0)}</dd></div>
          <div><dt>Diện tích</dt><dd>${room.area || 0}m2</dd></div>
          <div><dt>Số người tối đa</dt><dd>${room.max || 0}</dd></div>
          <div><dt>Trạng thái</dt><dd>${room.status || "-"}</dd></div>
          <div><dt>Ghi chú</dt><dd>${room.note || "-"}</dd></div>
        </dl>
      </article>
      <article class="card panel">
        <h2>Hóa đơn gần nhất</h2>
        ${renderInvoiceTable(invoices)}
      </article>
    </div>
  `);
};

const renderRoomForm = () => {
  const isNew = !state.selectedRoom;
  const room = isNew ? { id: "", name: "", area: "", rent: "", deposit: "", max: 1, occupantCount: 0, status: "Còn trống", tenant: "-", note: "" } : findRoom();
  return renderAdminShell(isNew ? "Thêm phòng" : "Sửa phòng", `
    <article class="card form-card" data-form="room">
      <div class="form-grid">
        ${field("Mã phòng *", isNew ? "" : room.id, "text", "id", isNew ? 'placeholder="VD: B202"' : "readonly")}
        ${field("Diện tích (m2) *", room.area, "number", "area", 'placeholder="25"')}
        ${moneyInputField("Giá thuê *", room.rent, "rent", "2.500.000")}
        ${moneyInputField("Tiền cọc *", room.deposit, "deposit", "2.500.000")}
        ${!isNew ? `
          ${selectField("Trạng thái", room.status, ["Đang thuê", "Còn trống", "Bảo trì"], "status")}
        ` : ""}
      </div>
      ${!isNew ? textareaField("Ghi chú", room.note, "note") : ""}
      <div class="form-actions">
        ${button("Hủy", "cancel-room", "outline")}
        ${button("Lưu phòng", "save-room")}
      </div>
    </article>
  `, "Lưu phòng");
};

const renderTenants = () => {
  const q = state.searchQuery.toLowerCase();
  const tenants = q ? arrays.tenants().filter(t => (t.name + t.phone + t.room + t.email).toLowerCase().includes(q)) : arrays.tenants();
  return renderAdminShell("Quản lý khách thuê", `
  <article class="card panel">
    <div class="panel-head"><h2>Danh sách khách thuê</h2>${button("+ Thêm khách", "add-tenant")}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Họ tên</th><th>Email đăng nhập</th><th>Số điện thoại</th><th>Phòng</th><th>CCCD</th><th>Ngày bắt đầu</th><th>Tài khoản</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          ${tenants.map((tenant) => `
            <tr data-tenant-detail-row="${tenant.id}" style="cursor:pointer">
              <td><b>${tenant.name}</b></td>
              <td>${tenant.email || "-"}</td>
              <td>${formatPhone(tenant.phone)}</td>
              <td>${tenant.room}</td>
              <td>${formatCCCD(tenant.citizenId)}</td>
              <td>${tenant.startDate}</td>
              <td>${badge(tenant.accountStatus || "Chưa tạo")}</td>
              <td>${badge(tenant.status)}</td>
              <td class="table-actions">
                <button data-tenant-edit="${tenant.id}">Sửa</button>
                <button data-tenant-account="${tenant.id}">Tạo TK</button>
                <button data-tenant-invite="${tenant.id}">Mời ký</button>
                ${tenant.status === "Yêu cầu trả phòng" ? `<button style="background:var(--danger);color:#fff;border-color:var(--danger)" data-tenant-stop="${tenant.id}">Duyệt trả phòng</button>` : `<button data-tenant-stop="${tenant.id}">Ngừng thuê</button>`}
              </td>
            </tr>
          `).join("") || `<tr><td colspan="9">${q ? 'Không tìm thấy khách thuê nào.' : 'Chưa có khách thuê.'}</td></tr>`}
        </tbody>
      </table>
    </div>
  </article>
`);
};

const renderTenantForm = () => {
  const isNew = !state.selectedTenant;
  const tenant = isNew ? { id: "", name: "", phone: "", email: "", room: state.selectedRoom || "", citizenId: "", startDate: formatDate(new Date()), status: "Đang thuê" } : findTenant();
  return renderAdminShell(isNew ? "Thêm khách thuê" : "Sửa khách thuê", `
    <article class="card form-card narrow" data-form="tenant">
      ${!isNew ? field("Mã khách (Hệ thống)", tenant.id, "text", "id", "readonly") : ""}
      ${field("Email *", tenant.email || "", "email", "email", "placeholder='Nhập Email cốt lõi để tìm hoặc tạo mới'")}
      ${field("Số điện thoại", tenant.phone, "text", "phone", isNew ? "placeholder='Bắt buộc 10 số (Nếu chưa có App)'" : "")}
      ${field("Họ tên", tenant.name, "text", "name", isNew ? "placeholder='Có thể bỏ trống nếu khách đã có App'" : "")}
      ${field("CCCD", tenant.citizenId, "text", "citizenId", isNew ? "placeholder='Bắt buộc 12 số (Nếu chưa có App)'" : "")}
      ${!isNew ? selectField("Trạng thái", tenant.status, ["Đang thuê", "Ngừng thuê"], "status") : ""}
      <div class="form-actions">
        ${button("Hủy", "cancel-tenant", "outline")}
        ${button("Lưu khách thuê", "save-tenant")}
      </div>
    </article>
  `, "Lưu khách thuê");
};

const renderContract = () => {
  const c = findContract();
  const allContracts = arrays.contracts();
  return renderAdminShell("Quản lý hợp đồng", `
    <div class="contract-layout" data-form="contract">
      <article class="card panel">
        <div class="panel-head"><h2>Danh sách hợp đồng</h2></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Phòng</th><th>Khách thuê</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
            <tbody>
              ${allContracts.map(ct => `
                <tr data-contract-select="${ct.id}" style="cursor:pointer;${state.selectedContract === ct.id ? 'background:var(--accent-bg)' : ''}">
                  <td>${ct.room}</td>
                  <td>${ct.tenant}</td>
                  <td>${ct.startDate || '-'}</td>
                  <td>${ct.endDate || '-'}</td>
                  <td>${badge(ct.status || 'Chờ ký')}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">Chưa có hợp đồng.</td></tr>'}
            </tbody>
          </table>
        </div>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
        <h2>Thông tin hợp đồng</h2>
        <div class="form-grid one" data-form="contract">
          ${field("Mã hợp đồng", c.id, "text", "id")}
          ${selectField("Chọn phòng", c.room, arrays.rooms().filter(r => r.status === "Còn trống" || r.id === c.room).map(r => r.id), "room")}
          ${selectField("Chọn khách thuê", c.tenant, arrays.tenants().map(t => t.name), "tenant")}
          ${dateField("Ngày bắt đầu", state.contractStartDate, "contractStartDate")}
          ${dateField("Ngày kết thúc", state.contractEndDate, "contractEndDate")}
          ${moneyInputField("Tiền thuê", c.rent, "rent")}
          ${moneyInputField("Tiền cọc", c.deposit, "deposit")}
          ${selectField("Trạng thái", c.status || "Chờ ký", ["Chờ ký", "Đang hiệu lực", "Đã kết thúc"], "status")}
        </div>
        <div class="form-actions" style="margin-top:16px;">
          ${button("Lưu nháp", "draft-contract", "outline")}
          ${button("Tạo hợp đồng", "create-contract")}
          ${button("+ Tạo hợp đồng mới", "add-contract", "secondary")}
        </div>
      </article>
      ${(!state.selectedContract || c.status !== "Đang hiệu lực") ? `
      <article class="card contract-preview">
        <h2>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h2>
        <p><b>Bên cho thuê:</b> ${state.landlord.name}</p>
        <p><b>Bên thuê:</b> ${c.tenant}</p>
        <p><b>Phòng:</b> ${c.room}, thời hạn từ ${c.startDate || state.contractStartDate} đến ${c.endDate || state.contractEndDate}.</p>
        <p><b>Chi phí:</b> tiền thuê ${money(c.rent || 0)}, tiền cọc ${money(c.deposit || 0)}.</p>
        <p><b>Trạng thái:</b> ${c.status || "Chờ ký"} • Khách thuê ${c.tenantAccepted ? "đã đồng ý" : "chưa đồng ý"}.</p>
        <div class="card panel soft-panel">
          <h3>Lịch sử thuê phòng</h3>
          ${arrays.contractHistory().map((item) => `<p>${item.id}: ${item.tenant} • ${item.startDate} - ${item.endDate} • ${item.status}</p>`).join("") || "<p>Chưa có lịch sử.</p>"}
        </div>
        <div class="form-actions">
          ${c.status === "Chờ duyệt" ? button("Admin xác nhận hợp đồng", "admin-approve-contract") : ""}
          ${c.status === "Yêu cầu trả phòng" ? `<button class="btn delete" data-tenant-stop="${c.tenantId}">Duyệt trả phòng</button>` : ""}
          ${c.status === "Đang hiệu lực" ? `<button class="btn delete" data-tenant-stop="${c.tenantId}">Ngừng thuê</button>` : ""}
          ${button("Xuất PDF", "export-pdf", "secondary")}
        </div>
      </article>
      ` : ''}
    </div>
  `, "Xuất PDF");
};

const renderInvoiceTable = (invoices) => `
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Mã hóa đơn</th><th>Phòng</th><th>Khách thuê</th><th>Từ ngày</th><th>Đến ngày</th><th>Tiền phòng</th><th>Điện</th><th>Nước</th><th>Phạt</th><th>Tổng</th><th>Trạng thái</th></tr>
      </thead>
      <tbody>
        ${invoices.map((invoice) => `
          <tr data-invoice-detail="${invoice.id}">
            <td><b>${invoice.id}</b></td>
            <td>${invoice.room}</td>
            <td>${invoice.tenant}</td>
            <td>${invoice.fromDate}</td>
            <td>${invoice.toDate}</td>
            <td>${money(invoice.roomAmount)}</td>
            <td>${money(invoice.electricity)}</td>
            <td>${money(invoice.water)}</td>
            <td>${money(invoice.penalty)}</td>
            <td><b>${money(invoice.total)}</b></td>
            <td>${badge(invoice.status)}</td>
          </tr>
        `).join("") || `<tr><td colspan="11">Chưa có hóa đơn.</td></tr>`}
      </tbody>
    </table>
  </div>
`;

const renderInvoices = () => renderAdminShell("Quản lý hóa đơn", `
  <div class="filter-row">
    ${dateField("Từ ngày", state.invoiceFrom, "invoiceFrom")}
    ${dateField("Đến ngày", state.invoiceTo, "invoiceTo")}
    ${selectField("Trạng thái", "Tất cả", ["Tất cả", "Chưa thanh toán", "Đã thanh toán", "Quá hạn"])}
    ${field("Phòng", "A101")}
    ${field("Khách thuê", "")}
    ${button("Lọc", "apply-invoice-filter")}
    ${button("Đặt lại", "reset-invoice-filter", "secondary")}
    ${button("Lập HĐ hàng loạt", "nav-invoice-bulk", "primary")}
    ${button("Xuất Excel", "export-excel", "outline")}
  </div>
  <article class="card panel">
    ${renderInvoiceTable(arrays.invoices())}
  </article>
`, "+ Tạo hóa đơn");

const renderInvoiceCreate = () => {
  let roomName = state.room || state.selectedRoom || "";
  let tenantName = "";
  let autoRent = 0;
  let autoElectricityOld = 0;
  let autoWaterOld = 0;
  let autoElectricityPrice = 3500;
  let autoWaterPrice = 20000;
  let autoServiceAmount = 150000;

  if (roomName) {
    const allRoomContracts = arrays.contracts().filter(c => c.room === roomName);
    const activeContract = allRoomContracts.find(c => c.status === "Đang hiệu lực") 
                        || allRoomContracts.find(c => c.status === "Chờ duyệt")
                        || allRoomContracts.find(c => c.status === "Chờ ký")
                        || allRoomContracts[0];
    if (activeContract) {
      tenantName = activeContract.tenant;
      autoRent = activeContract.rent;
      if (activeContract.services && activeContract.services.length > 0) {
        let otherServiceTotal = 0;
        for (const s of activeContract.services) {
          if (!s.serviceId) continue;
          const name = (s.serviceId.name || "").toLowerCase();
          const price = s.fixedPrice || s.serviceId.defaultPrice || 0;
          if (name.includes("điện")) {
            autoElectricityPrice = price;
          } else if (name.includes("nước")) {
            autoWaterPrice = price;
          } else {
            otherServiceTotal += price;
          }
        }
        if (otherServiceTotal > 0) {
          autoServiceAmount = otherServiceTotal;
        }
      }
    } else {
      const roomObj = arrays.rooms().find(r => r.id === roomName);
      if (roomObj && roomObj.tenant) tenantName = roomObj.tenant;
      if (roomObj && roomObj.rent) autoRent = roomObj.rent;
    }

    // Tự động kéo chỉ số điện/nước mới của tháng trước sang tháng này
    const allRoomInvoices = arrays.invoices().filter(inv => inv.room === roomName).sort((a, b) => b.id.localeCompare(a.id));
    if (allRoomInvoices.length > 0) {
      autoElectricityOld = allRoomInvoices[0].electricityNew || 0;
      autoWaterOld = allRoomInvoices[0].waterNew || 0;
    }
  }

  // Auto-populate rent and old indexes when room changes
  if (roomName !== state.lastInvoiceRoom) {
      state.calcRoomAmount = autoRent || 0;
      state.calcElectricityOld = autoElectricityOld;
      state.calcWaterOld = autoWaterOld;
      state.calcElectricityPrice = autoElectricityPrice;
      state.calcWaterPrice = autoWaterPrice;
      state.calcServiceAmount = autoServiceAmount;
      state.lastInvoiceRoom = roomName;
  }

  const calc = calculateInvoice();

  return renderAdminShell("Tạo hóa đơn", `
    <div class="two-col invoice-builder" data-form="invoice">
      <article class="card form-card invoice-form-card">
        <h2>Xuất hóa đơn tháng này</h2>
        <p class="muted">Nhập chỉ số điện nước cũ / mới, hệ thống tự tính tiêu thụ và tổng tiền hóa đơn.</p>
        <div class="form-grid">
          ${selectField("Chọn phòng", roomName, ["", ...arrays.rooms().map(r => r.id)], "room")}
          ${field("Khách thuê", tenantName, "text", "tenant")}
          ${dateField("Từ ngày", state.createFrom, "createFrom")}
          ${dateField("Đến ngày", state.createTo, "createTo")}
          ${dateField("Hạn thanh toán", state.createDue, "createDue")}
          ${dateField("Ngày xuất hóa đơn", state.createExportDate, "createExportDate")}
          ${dateField("Ngày kiểm tra thanh toán", state.createCheckDate, "createCheckDate")}
          ${calcSelectField("Trạng thái thanh toán", "calcPaidStatus", ["Chưa thanh toán"])}
          ${calcField("Tiền phòng", "calcRoomAmount")}
          ${calcField("Chỉ số điện cũ", "calcElectricityOld")}
          ${calcField("Chỉ số điện mới", "calcElectricityNew")}
          ${calcField("Đơn giá điện / kWh", "calcElectricityPrice")}
          ${calcField("Chỉ số nước cũ", "calcWaterOld")}
          ${calcField("Chỉ số nước mới", "calcWaterNew")}
          ${calcField("Đơn giá nước / m3", "calcWaterPrice")}
          ${calcField("Phí xe + internet + rác", "calcServiceAmount")}
          ${calcField("Giảm giá", "calcDiscount")}

        </div>
        <div class="calc-rule">
          <b>Quy tắc phạt:</b> sau khi xuất hóa đơn, nếu chưa thanh toán trong vòng 7 ngày thì phạt 10% tổng tiền trước phạt.
        </div>
      </article>
      <article class="card panel invoice-calc-summary">
        <h2>Bảng tự tính hóa đơn</h2>
        <div class="amount-list">
          <div><span>Điện tiêu thụ</span>${calcOutput("electricityUsage", `${calc.electricityUsage} kWh`)}</div>
          <div><span>Tiền điện</span>${calcOutput("electricityAmount", money(calc.electricityAmount))}</div>
          <div><span>Nước tiêu thụ</span>${calcOutput("waterUsage", `${calc.waterUsage} m3`)}</div>
          <div><span>Tiền nước</span>${calcOutput("waterAmount", money(calc.waterAmount))}</div>
          <div><span>Tiền phòng</span>${calcOutput("roomAmount", money(numberValue(state.calcRoomAmount)))}</div>
          <div><span>Dịch vụ</span>${calcOutput("serviceAmount", money(numberValue(state.calcServiceAmount)))}</div>
          <div><span>Giảm giá</span>${calcOutput("discount", money(numberValue(state.calcDiscount)))}</div>
          <div><span>Tạm tính trước phạt</span>${calcOutput("subtotal", money(calc.subtotal))}</div>
          <div><span>Số ngày sau khi xuất</span>${calcOutput("daysAfterExport", `${calc.daysAfterExport} ngày`)}</div>
          <div><span>Ngày trễ tính phạt</span>${calcOutput("lateDays", `${calc.lateDays} ngày`)}</div>
          <div><span>Phí phạt 10%</span>${calcOutput("penalty", money(calc.penalty))}</div>
        </div>
        <div class="total-line auto-total">
          <span>Tổng phải thu</span>
          <strong data-calc-output="total">${money(calc.total)}</strong>
        </div>
        <p class="muted" data-calc-output="penaltyNote">${calc.isLate ? "Hóa đơn đã quá 7 ngày và chưa thanh toán, hệ thống áp dụng phạt 10%." : "Chưa áp dụng phạt vì còn trong 7 ngày hoặc đã thanh toán."}</p>
        <div class="form-actions">
          ${button("Tạo hóa đơn", "export-month-invoice")}
          ${button("Xuất PDF", "export-invoice-pdf", "secondary")}
        </div>
      </article>
    </div>
  `);
};

const renderInvoiceDetail = () => {
  const invoice = findInvoice();
  const items = [
    ["Tiền phòng", invoice.roomAmount],
    ["Tiền điện", invoice.electricity],
    ["Tiền nước", invoice.water],
    ["Phí xe + internet + rác", invoice.services],
    ["Giảm giá", invoice.discount],
    ["Phí phạt", invoice.penalty]
  ];
  return renderAdminShell("Chi tiết hóa đơn", `
    <div class="detail-header card">
      <div>
        <h2>${invoice.id || "-"}</h2>
        ${badge(invoice.status || "-")}
      </div>
      <div class="actions">
        ${invoice.status !== "Đã thanh toán" ? button("Đánh dấu đã thu", "mark-paid") : ""}
        ${button("Sửa", "edit-invoice", "outline")}
        ${button("In", "print-invoice", "outline")}
      </div>
    </div>
    <div class="two-col">
      <article class="card panel">
        <h2>Thông tin hóa đơn</h2>
        <dl class="info-list">
          <div><dt>Mã hóa đơn</dt><dd>${invoice.id}</dd></div>
          <div><dt>Phòng</dt><dd>${invoice.room}</dd></div>
          <div><dt>Khách thuê</dt><dd>${invoice.tenant}</dd></div>
          <div><dt>Từ ngày</dt><dd>${invoice.fromDate}</dd></div>
          <div><dt>Đến ngày</dt><dd>${invoice.toDate}</dd></div>
          <div><dt>Hạn thanh toán</dt><dd>${invoice.dueDate}</dd></div>
          <div><dt>Trạng thái</dt><dd>${badge(invoice.status || "-")}</dd></div>
          <div><dt>Phương thức TT</dt><dd>${invoice.paymentMethod || "-"}</dd></div>
          <div><dt>Mã giao dịch</dt><dd>${invoice.transactionCode || "-"}</dd></div>
        </dl>

      </article>
      <article class="card panel">
        <h2>Chi tiết tiền</h2>
        <dl class="info-list meter-list">
          <div><dt>Điện cũ / mới</dt><dd>${invoice.electricityOld} → ${invoice.electricityNew}</dd></div>
          <div><dt>Nước cũ / mới</dt><dd>${invoice.waterOld} → ${invoice.waterNew}</dd></div>
          <div><dt>Số ngày trễ</dt><dd>${invoice.penaltyDays} ngày</dd></div>
          <div><dt>Mức phạt sau 7 ngày</dt><dd>${penaltyRateText(invoice.penaltyRate)}</dd></div>
        </dl>
        <div class="amount-list">
          ${items.map(([label, value]) => `<div><span>${label}</span><b>${money(value || 0)}</b></div>`).join("")}
        </div>
        <div class="total-line"><span>Tổng cộng</span><strong>${money(invoice.total || 0)}</strong></div>
        <div class="form-actions">
          ${button("Xuất PDF", "export-invoice-pdf", "outline")}
          ${button("Gửi nhắc thanh toán", "send-reminder", "secondary")}
        </div>
      </article>
    </div>
  `, "Gửi nhắc");
};

const renderPaymentHistory = () => {
  const payments = arrays.payments();
  const paidPayments = payments.filter((payment) => payment.status === "Đã thanh toán");
  const totalPaid = paidPayments.reduce((sum, payment) => sum + numberValue(payment.amount), 0);
  const currentMonth = paidPayments.at(-1)?.month || "05/2026";
  const currentMonthPaid = paidPayments.filter((payment) => payment.month === currentMonth).reduce((sum, payment) => sum + numberValue(payment.amount), 0);
  const unpaidAmount = payments.filter((payment) => payment.status !== "Đã thanh toán").reduce((sum, payment) => sum + numberValue(payment.amount), 0);

  return renderAdminShell("Lịch sử thanh toán", `
    <div class="metric-grid payment-metrics">
      <article class="metric card"><span>Tổng đã thu</span><strong>${money(totalPaid)}</strong><small>Từ các giao dịch đã thanh toán</small></article>
      <article class="metric card"><span>Đã thu tháng gần nhất</span><strong>${money(currentMonthPaid)}</strong><small>Giao dịch tháng ${currentMonth}</small></article>
      <article class="metric card"><span>Chưa thu</span><strong>${money(unpaidAmount)}</strong><small>Hóa đơn còn chờ thanh toán</small></article>
      <article class="metric card"><span>Số giao dịch</span><strong>${paidPayments.length}</strong><small>Giao dịch thành công</small></article>
    </div>
    <div class="two-col analytics-layout">
      <article class="card panel">
        <div class="panel-head">
          <div>
            <h2>Biểu đồ doanh thu</h2>
            <p class="muted">Doanh thu đã thu theo tháng</p>
          </div>
          ${button("Xuất biểu đồ", "export-revenue-chart", "outline")}
        </div>
        ${renderBarChart(revenueSeries())}
      </article>
      <article class="card panel">
        <div class="panel-head">
          <div>
            <h2>Phương thức thanh toán</h2>
            <p class="muted">Tổng hợp giao dịch</p>
          </div>
        </div>
        <div class="method-list">
          ${["QR ngân hàng", "MoMo", "VNPay", "Tiền mặt"].map((method) => `<div><span>${method}</span><b>${payments.filter((payment) => payment.method === method).length} giao dịch</b></div>`).join("")}
        </div>
      </article>
    </div>
    <article class="card panel">
      <div class="panel-head">
        <h2>Bảng lịch sử thanh toán</h2>
        ${button("Xuất Excel", "export-payment-excel", "outline")}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Mã giao dịch</th><th>Hóa đơn</th><th>Phòng</th><th>Khách thuê</th><th>Tháng</th><th>Ngày thanh toán</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            ${payments.map((payment) => `
              <tr>
                <td><b>${payment.id}</b></td>
                <td>${payment.invoiceId}</td>
                <td>${payment.room}</td>
                <td>${payment.tenant}</td>
                <td>${payment.month}</td>
                <td>${payment.date}</td>
                <td>${payment.method}</td>
                <td><b>${money(payment.amount)}</b></td>
                <td>${badge(payment.status)}</td>
              </tr>
            `).join("") || `<tr><td colspan="9">Chưa có thanh toán.</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `, "Xuất biểu đồ");
};

const renderRepairs = () => {
  const repairs = sortedRepairs();
  const selected = findRepair();
  const selectedImages = selected.images || [];
  return renderAdminShell("Yêu cầu sửa chữa", `
    <div class="repair-admin-grid">
      <article class="card panel">
        <div class="panel-head">
          <div>
            <h2>Danh sách yêu cầu</h2>
            <p class="muted">Khách gửi mô tả và ảnh, admin phân độ ưu tiên.</p>
          </div>
          <div style="display:flex; gap: 8px; align-items:center;">
            ${(state.selectedRepairsForDelete || []).length > 0 ? `<button data-action="delete-multiple-repairs" style="background:var(--danger); color:white; border:none; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Xóa ${(state.selectedRepairsForDelete || []).length} mục đã chọn</button>` : ""}
            ${badge(`${repairs.length} yêu cầu`)}
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" data-action="toggle-all-repairs" ${state.selectedRepairsForDelete?.length === repairs.length && repairs.length > 0 ? "checked" : ""} title="Chọn tất cả"></th>
              <th>Mã YC</th><th>Phòng</th><th>Người gửi</th><th>Loại sự cố</th><th>Ưu tiên</th><th>Người đặt</th><th>Ảnh</th><th>Ngày gửi</th><th>Trạng thái</th>
            </tr></thead>
            <tbody>
              ${repairs.map((repair) => `
                <tr data-repair-select="${repair.id}" style="${(state.selectedRepairsForDelete || []).includes(repair.id) ? 'background: var(--surface-2);' : ''}">
                  <td style="text-align: center;" onclick="event.stopPropagation()"><input type="checkbox" data-action="toggle-repair" data-id="${repair.id}" ${(state.selectedRepairsForDelete || []).includes(repair.id) ? "checked" : ""}></td>
                  <td><b>${repair.id}</b></td>
                  <td>${repair.room}</td>
                  <td>${repair.sender}</td>
                  <td>${repair.category}</td>
                  <td>${badge(repair.priority)}</td>
                  <td>${repair.priorityBy}</td>
                  <td>${(repair.images || []).length} ảnh</td>
                  <td>${repair.date}</td>
                  <td>${badge(repair.status)}</td>
                </tr>
              `).join("") || `<tr><td colspan="9">Chưa có yêu cầu.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>
      ${state.selectedRepair ? `
      <article class="card panel" data-form="repair">
        <h2>Chi tiết request</h2>
        <div class="repair-images" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;">
          ${selectedImages.map((image, index) => `<img src="${image}" alt="Ảnh sự cố ${index + 1}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);" />`).join("") || "<span class='muted'>Chưa có ảnh đính kèm</span>"}
        </div>
        <p><b>Người gửi:</b> ${selected.sender || '-'} • Phòng ${selected.room || '-'}</p>
        <p><b>Mô tả:</b> ${selected.description || "-"}</p>
        <p><b>Ghi chú xử lý:</b> ${selected.note || "Chưa có ghi chú"}</p>
        ${selectField("Admin đặt độ ưu tiên", selected.priority || "Chưa phân loại", ["Chưa phân loại", "Thấp", "Trung bình", "Cao"], "priority")}
        ${selectField("Cập nhật trạng thái", selected.status || "Mới", ["Mới", "Đang xử lý", "Đã hoàn thành", "Đã hủy"], "status")}
        ${textareaField("Ghi chú của chủ trọ", selected.note || "", "note")}
        <div class="form-actions">
          ${button("Lưu cập nhật", "save-repair")}
          ${selected.status !== "Đã hoàn thành" ? button("✓ Hoàn thành", "complete-repair", "outline") : ""}
          ${button("Xóa yêu cầu", "delete-repair-admin", "outline", "style='color:var(--danger); border-color:var(--danger);'")}
        </div>
      </article>
      ` : `
      <article class="card panel" style="display:flex; align-items:center; justify-content:center; text-align:center;">
        <p class="muted">Vui lòng chọn một yêu cầu từ danh sách<br/>để xem chi tiết và xử lý.</p>
      </article>
      `}
    </div>
  `, "Cập nhật");
};

const renderSettings = () => renderAdminShell("Cài đặt tài khoản", `
  <article class="card form-card narrow" data-form="settings">
    <h2>Thông tin chủ trọ</h2>
    ${field("Họ tên", state.landlord.name, "text", "name")}
    ${field("Email", state.landlord.email, "email", "email")}
    ${field("Số điện thoại", state.landlord.phone, "text", "phone")}
    ${field("Tên nhà trọ", state.landlord.propertyName, "text", "propertyName")}
    ${selectField("Trạng thái nhà trọ", state.landlord.propertyStatus, ["Đang hoạt động", "Tạm dừng", "Đã bán"], "propertyStatus")}
    ${field("Địa chỉ", state.landlord.address, "text", "address")}
    ${field("Ngân hàng", state.landlord.bank, "text", "bank")}
    ${field("Mật khẩu mới", "", "password", "password")}
    <div class="form-actions">${button("Lưu thay đổi", "save-settings")}</div>
  </article>
`, "Lưu thay đổi");

const tenantSidebarItems = [
  ["overview", "Tổng quan"],
  ["contract", "Hợp đồng"],
  ["invoices", "Hóa đơn"],
  ["utilities", "Điện nước"],
  ["payments", "Thanh toán"],
  ["repairs", "Sửa chữa"],
  ["stats", "Thống kê phí"]
];

const renderTenantShell = (title, content) => {
  const portal = tenantPortal();
  const tenant = portal.tenant || {};
  return `
    <section class="admin-layout tenant-layout">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark">TH</div>
          <strong>TroHub</strong>
        </div>
        <nav>
          ${tenantSidebarItems.map(([id, label]) => `
            <button class="${state.tenantPage === id ? "active" : ""}" data-tenant-nav="${id}">${label}</button>
          `).join("")}
        </nav>
        <button class="btn outline full" data-logout>Đăng xuất</button>
      </aside>
      <section class="admin-main">
        <header class="topbar">
          <div>
            <h1>${title}</h1>
            <p>Xin chào Người thuê ${tenant.name || state.user?.fullName || state.user?.username || "Ẩn danh"} • Phòng ${tenant.room || "-"}</p>
          </div>
          <div class="topbar-actions">
            <div class="search">Hợp đồng, hóa đơn, sửa chữa...</div>
            <div class="avatar">T</div>
          </div>
        </header>
        <div class="admin-content">${content}</div>
      </section>
    </section>
    ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
    ${renderQRModal()}
  `;
};

const renderQRModal = () => {
  if (!state.showQRForInvoice) return "";
  const invoice = tenantInvoices().find((i) => i.id === state.showQRForInvoice);
  if (!invoice) return "";
  
  const bankInfo = (state.landlordData || appData.landlord).bank || "VCB - 0123456789";
  const parts = bankInfo.split("-").map(s => s.trim());
  const bankCode = parts[0] || "VCB";
  const bankAcc = parts[1] || "0123456789";
  const amount = invoice.total || 0;
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAcc}-compact.png?amount=${amount}&addInfo=${invoice.id}`;

  return `
    <div class="modal-overlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div class="card panel" style="padding:2rem; text-align:center; max-width:400px; width:90%;">
        <h2 style="margin-bottom:0.5rem">Thanh toán Hóa đơn</h2>
        <p class="muted">Quét mã QR bằng ứng dụng ngân hàng</p>
        <div style="background:#fff; padding:1rem; border-radius:12px; margin:1.5rem auto; display:inline-block;">
          <img src="${qrUrl}" alt="QR Code" style="width:100%; max-width:250px; display:block;" />
        </div>
        <div style="text-align:left; background:var(--bg, #1a1b1e); padding:1rem; border-radius:8px; margin-bottom:1.5rem; line-height:1.6;">
          <div><b>Ngân hàng:</b> ${bankCode}</div>
          <div><b>Tài khoản:</b> ${bankAcc}</div>
          <div><b>Số tiền:</b> <span style="color:var(--primary); font-weight:bold; font-size:1.1em">${money(amount)}</span></div>
          <div><b>Nội dung CK:</b> ${invoice.id}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn full" data-confirm-pay="${invoice.objectId || invoice.id}">Xác nhận đã thanh toán</button>
          <button class="btn outline full" data-close-qr>Đóng</button>
        </div>
      </div>
    </div>
  `;
};

const renderTenantOverview = () => {
  const portal = tenantPortal();
  const room = portal.room || {};
  const stats = portal.stats || {};
  const contract = activeTenantContract();
  const nextInvoice = tenantUnpaidInvoices()[0] || tenantInvoices()[0] || {};
  return renderTenantShell("Tổng quan người thuê", `
    <div class="metric-grid">
      <article class="metric card"><span>Phòng đang thuê</span><strong>${room.id || "-"}</strong><small>${room.name || "Chưa gán phòng"}</small></article>
      <article class="metric card"><span>Hóa đơn chưa thanh toán</span><strong>${stats.unpaidInvoiceCount || 0}</strong><small>${money(stats.unpaidTotal || 0)}</small></article>
      <article class="metric card"><span>Đã thanh toán</span><strong>${money(stats.paidTotal || 0)}</strong><small>Tổng giao dịch thành công</small></article>
      <article class="metric card"><span>Phí phạt</span><strong>${money(stats.penaltyTotal || 0)}</strong><small>Tổng phí phạt phát sinh</small></article>
    </div>
    <div class="two-col">
      <article class="card panel">
        <h2>Thông tin phòng</h2>
        <dl class="info-list">
          <div><dt>Mã phòng</dt><dd>${room.id || "-"}</dd></div>
          <div><dt>Giá thuê</dt><dd>${money(room.rent || 0)}</dd></div>
          <div><dt>Tiền cọc</dt><dd>${money(room.deposit || 0)}</dd></div>
          <div><dt>Diện tích</dt><dd>${room.area || 0}m2</dd></div>
          <div><dt>Trạng thái</dt><dd>${badge(room.status || "-")}</dd></div>
        </dl>
      </article>
      <article class="card panel">
        <h2>Việc cần làm</h2>
        <div class="amount-list">
          <div><span>Hợp đồng</span><b>${contract.tenantAccepted ? "Đã ký" : contract.id ? "Chờ ký" : "Chưa có"}</b></div>
          <div><span>Hóa đơn gần nhất</span><b>${nextInvoice.id || "-"}</b></div>
          <div><span>Tổng cần thanh toán</span><b>${money(stats.unpaidTotal || 0)}</b></div>
        </div>
        <div class="form-actions">
          ${contract.id && !contract.tenantAccepted ? `<button class="btn primary" data-tenant-sign="${contract.id}">Ký hợp đồng</button>` : ""}
          ${nextInvoice.id && nextInvoice.status !== "Đã thanh toán" ? `<button class="btn outline" data-tenant-pay="${nextInvoice.id}">Thanh toán hóa đơn</button>` : ""}
        </div>
      </article>
    </div>
  `);
};

const renderTenantContract = () => {
  const contract = activeTenantContract();
  return renderTenantShell("Hợp đồng của tôi", `
    <article class="card contract-preview">
      <h2>${contract.id || "Chưa có hợp đồng"}</h2>
      ${contract.id ? `
        <p><b>Phòng:</b> ${contract.room}</p>
        <p><b>Người thuê:</b> ${contract.tenant}</p>
        <p><b>Thời hạn:</b> ${contract.startDate || "-"} đến ${contract.endDate || "-"}</p>
        <p><b>Tiền thuê:</b> ${money(contract.rent || 0)} • <b>Tiền cọc:</b> ${money(contract.deposit || 0)}</p>
        <p><b>Điện:</b> ${money(contract.electricityPrice || 0)}/kWh • <b>Nước:</b> ${money(contract.waterPrice || 0)}/m3</p>
        <p><b>Phí dịch vụ:</b> xe ${money(contract.vehicleFee || 0)}, internet ${money(contract.internetFee || 0)}, rác ${money(contract.trashFee || 0)}</p>
        <p><b>Trạng thái:</b> ${badge(contract.status || "-")} ${contract.tenantAccepted ? badge("Người thuê đã ký") : badge("Chờ người thuê ký")}</p>
        <div class="form-actions">
          ${!contract.tenantAccepted ? `<button class="btn primary" data-tenant-sign="${contract.id}">Tôi đồng ý ký hợp đồng</button>` : ""}
          ${contract.status === "Đang hiệu lực" ? `<button class="btn outline" style="color:var(--danger)" data-tenant-request-terminate="${contract.id}">Yêu cầu trả phòng</button>` : ""}
        </div>
      ` : `<p class="muted">Chủ trọ chưa gửi lời mời ký hợp đồng.</p>`}
    </article>
  `);
};

const renderTenantInvoiceTable = () => `
  <div class="table-wrap">
    <table>
      <thead><tr><th>Mã hóa đơn</th><th>Tháng</th><th>Tiền phòng</th><th>Điện</th><th>Nước</th><th>Dịch vụ</th><th>Phạt</th><th>Tổng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>
        ${tenantInvoices().map((invoice) => `
          <tr>
            <td><b>${invoice.id}</b></td>
            <td>${invoice.month}</td>
            <td>${money(invoice.roomAmount || 0)}</td>
            <td>${money(invoice.electricity || 0)}</td>
            <td>${money(invoice.water || 0)}</td>
            <td>${money(invoice.services || 0)}</td>
            <td>${money(invoice.penalty || 0)}</td>
            <td><b>${money(invoice.total || 0)}</b></td>
            <td>${badge(invoice.status)}</td>
            <td>${invoice.status !== "Đã thanh toán" ? `<button data-tenant-pay="${invoice.id}">Thanh toán</button>` : "-"}</td>
          </tr>
        `).join("") || `<tr><td colspan="10">Chưa có hóa đơn.</td></tr>`}
      </tbody>
    </table>
  </div>
`;

const renderTenantInvoices = () => {
  const now = new Date();
  const filterRange = state.tenantInvoiceFilter || 'month';
  let fromDate, toDate;
  if (filterRange === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (filterRange === '3month') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (filterRange === '6month') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (filterRange === 'custom') {
    fromDate = parseDate(state.tenantInvoiceFrom || formatDate(new Date(now.getFullYear(), now.getMonth(), 1)));
    toDate = parseDate(state.tenantInvoiceTo || formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  } else {
    fromDate = new Date(2020, 0, 1);
    toDate = new Date(2099, 11, 31);
  }

  return renderTenantShell("Hóa đơn và phí", `
  <div class="filter-row">
    ${button("Tháng này", "tenant-filter-month", filterRange === 'month' ? 'primary' : 'outline')}
    ${button("3 tháng", "tenant-filter-3month", filterRange === '3month' ? 'primary' : 'outline')}
    ${button("6 tháng", "tenant-filter-6month", filterRange === '6month' ? 'primary' : 'outline')}
    ${button("Tùy chọn ngày", "tenant-filter-custom", filterRange === 'custom' ? 'primary' : 'outline')}
    ${filterRange === 'custom' ? `
      ${dateField("", state.tenantInvoiceFrom || formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), "tenantInvoiceFrom")}
      ${dateField("", state.tenantInvoiceTo || formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)), "tenantInvoiceTo")}
      ${button("Áp dụng", "tenant-filter-apply")}
    ` : ''}
    ${button("Đặt lại", "tenant-filter-reset", "secondary")}
  </div>
  <article class="card panel">
    <div class="panel-head">
      <div>
        <h2>Chi tiết các khoản phí</h2>
        <p class="muted">Chỉ hiển thị hóa đơn của bạn. Bao gồm tiền phòng, điện, nước, dịch vụ và phí phạt nếu quá hạn.</p>
      </div>
    </div>
    ${renderTenantInvoiceTable()}
  </article>
`);
};

const renderTenantPayments = () => renderTenantShell("Lịch sử thanh toán", `
  <div class="metric-grid">
    <article class="metric card"><span>Tổng đã thanh toán</span><strong>${money((tenantPortal().stats || {}).paidTotal || 0)}</strong><small>Tất cả giao dịch thành công</small></article>
    <article class="metric card"><span>Chưa thanh toán</span><strong>${money((tenantPortal().stats || {}).unpaidTotal || 0)}</strong><small>Còn phải thu</small></article>
    <article class="metric card"><span>Giao dịch</span><strong>${tenantPayments().length}</strong><small>Lịch sử của tôi</small></article>
    <article class="metric card"><span>Phí phạt</span><strong>${money((tenantPortal().stats || {}).penaltyTotal || 0)}</strong><small>Theo hóa đơn</small></article>
  </div>
  <article class="card panel">
    <h2>Giao dịch của tôi</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mã giao dịch</th><th>Hóa đơn</th><th>Tháng</th><th>Ngày</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
        <tbody>
          ${tenantPayments().map((payment) => `
            <tr><td><b>${payment.id}</b></td><td>${payment.invoiceId}</td><td>${payment.month}</td><td>${payment.date}</td><td>${payment.method}</td><td>${money(payment.amount || 0)}</td><td>${badge(payment.status)}</td></tr>
          `).join("") || `<tr><td colspan="7">Chưa có thanh toán.</td></tr>`}
        </tbody>
      </table>
    </div>
  </article>
`);

const renderTenantRepairs = () => renderTenantShell("Yêu cầu sửa chữa", `
  <div class="two-col">
    <article class="card form-card" data-form="tenant-repair">
      <h2>Gửi yêu cầu mới</h2>
      ${selectField("Loại sự cố", "", ["Điện", "Nước", "Tường/Trần", "Thiết bị", "Nội thất", "Khác"], "category")}
      ${textareaField("Mô tả chi tiết", "", "description")}
      <label class="field">
        <span>Đính kèm hình ảnh minh chứng</span>
        <input type="file" data-field="images" accept="image/*" multiple style="padding: 10px; border: 1px dashed var(--border); border-radius: 8px; width: 100%; box-sizing: border-box;" />
      </label>
      <div class="form-actions">${button("Gửi yêu cầu", "tenant-create-repair")}</div>
    </article>
    <article class="card panel">
      <div class="panel-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
        <h2>Yêu cầu đã gửi</h2>
        <div style="display:flex; gap: 8px; align-items:center;">
          ${(state.selectedRepairsForDelete || []).length > 0 ? `<button data-action="delete-multiple-repairs-tenant" style="background:var(--danger); color:white; border:none; padding:4px 12px; border-radius:4px; font-weight:600; cursor:pointer;">Xóa ${(state.selectedRepairsForDelete || []).length}</button>` : ""}
          <label style="font-size:0.9em; display:flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="checkbox" data-action="toggle-all-repairs-tenant" ${state.selectedRepairsForDelete?.length === tenantRepairs().length && tenantRepairs().length > 0 ? "checked" : ""}> Tất cả
          </label>
        </div>
      </div>
      <div class="repair-list">
        ${tenantRepairs().map((repair) => `
          <div class="repair-row" style="position:relative; padding-bottom: 40px; ${(state.selectedRepairsForDelete || []).includes(repair.id) ? 'background: var(--surface-2);' : ''}">
            <div style="display:flex; justify-content:space-between;">
              <strong>${repair.category} • ${repair.date}</strong>
              <input type="checkbox" data-action="toggle-repair-tenant" data-id="${repair.id}" ${(state.selectedRepairsForDelete || []).includes(repair.id) ? "checked" : ""}>
            </div>
            <span>${repair.description}</span>
            <div style="margin: 8px 0;">
              ${badge(repair.status)} ${badge(`Ưu tiên: ${repair.priority}`)}
            </div>
            ${repair.note ? `<div style="margin-top: 8px; padding: 8px; background: var(--surface-2); border-left: 3px solid var(--primary); border-radius: 4px; font-size: 0.9em;"><b>Chủ trọ nhắn:</b> ${repair.note}</div>` : ""}
            <button data-action="delete-repair-tenant" data-id="${repair.id}" style="position:absolute; bottom:12px; right:12px; padding: 4px 8px; font-size: 0.8em; color:var(--danger); border: 1px solid var(--danger); background:transparent; border-radius:4px; cursor:pointer;">Xóa</button>
          </div>
        `).join("") || "<p class='muted'>Chưa có yêu cầu sửa chữa.</p>"}
      </div>
    </article>
  </div>
`);

const renderTenantStats = () => {
  const feeSeries = tenantInvoices().map((invoice) => ({ month: invoice.month, value: invoice.total || 0 }));
  const penaltySeries = tenantInvoices().map((invoice) => ({ month: invoice.month, value: invoice.penalty || 0 }));
  return renderTenantShell("Thống kê chi phí", `
    <div class="dash-grid">
      <article class="card panel">
        <div class="panel-head"><h2>Tổng phí theo tháng</h2><span class="muted">Tiền phòng + điện nước + dịch vụ + phạt</span></div>
        ${renderBarChart(feeSeries)}
      </article>
      <article class="card panel">
        <div class="panel-head"><h2>Phí phạt</h2><span class="muted">Theo từng hóa đơn</span></div>
        ${renderBarChart(penaltySeries)}
      </article>
    </div>
    <article class="card panel">
      <h2>Cấu trúc phí hiện tại</h2>
      <div class="amount-list">
        <div><span>Tiền phòng</span><b>${money((tenantPortal().room || {}).rent || 0)}</b></div>
        <div><span>Phí phạt quá hạn</span><b>10% sau 7 ngày</b></div>
        <div><span>Hóa đơn chưa thanh toán</span><b>${tenantUnpaidInvoices().length}</b></div>
      </div>
    </article>
  `);
};

const renderTenantUtilities = () => {
  const invoices = tenantInvoices();
  const current = invoices[0];
  
  const historyHtml = invoices.map(item => `
    <article class="card list-item" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h3 style="margin:0 0 4px">Tháng ${item.month}</h3>
        <p class="muted" style="margin:0">Điện: ${(item.electricityNew || 0) - (item.electricityOld || 0)} kWh • Nước: ${(item.waterNew || 0) - (item.waterOld || 0)} m³</p>
      </div>
      <div style="text-align:right">
        <strong style="color:var(--primary); font-size:1.1em">${money((item.electricity || 0) + (item.water || 0))}</strong>
      </div>
    </article>
  `).join("");

  return renderTenantShell("Điện nước", `
    <p class="muted">Theo dõi chỉ số điện nước và chi phí sử dụng hằng tháng.</p>
    ${current ? `
      <div class="metric-grid" style="margin-top:20px">
        <article class="metric card"><span>Điện đã dùng</span><strong>${(current.electricityNew || 0) - (current.electricityOld || 0)} kWh</strong><small>${money(current.electricity)}</small></article>
        <article class="metric card"><span>Nước đã dùng</span><strong>${(current.waterNew || 0) - (current.waterOld || 0)} m³</strong><small>${money(current.water)}</small></article>
      </div>
      <article class="card panel">
        <h2>Tháng ${current.month}</h2>
        <dl class="info-list">
          <div><dt>Chỉ số điện cũ</dt><dd>${current.electricityOld || 0}</dd></div>
          <div><dt>Chỉ số điện mới</dt><dd>${current.electricityNew || 0}</dd></div>
          <div style="border-bottom:1px solid var(--border); padding-bottom:8px"><dt>Tiền điện</dt><dd>${money(current.electricity)}</dd></div>
          <div style="padding-top:8px"><dt>Chỉ số nước cũ</dt><dd>${current.waterOld || 0}</dd></div>
          <div><dt>Chỉ số nước mới</dt><dd>${current.waterNew || 0}</dd></div>
          <div><dt>Tiền nước</dt><dd>${money(current.water)}</dd></div>
        </dl>
      </article>
    ` : `<article class="card panel" style="text-align:center"><p class="muted">Chưa có dữ liệu điện nước.</p></article>`}
    
    <h2 style="margin: 24px 0 16px;">Lịch sử điện nước</h2>
    <div class="list-stack">
      ${historyHtml || '<p class="muted">Không có lịch sử.</p>'}
    </div>
  `);
};

const renderTenant = () => {
  const pages = {
    overview: renderTenantOverview,
    contract: renderTenantContract,
    invoices: renderTenantInvoices,
    utilities: renderTenantUtilities,
    payments: renderTenantPayments,
    repairs: renderTenantRepairs,
    stats: renderTenantStats
  };
  return pages[state.tenantPage]?.() || renderTenantOverview();
};

const renderTenantDetail = () => {
  const tenant = arrays.tenants().find(t => t.id === state.selectedTenant);
  if (!tenant) return renderTenants();
  const tenantContracts = arrays.contracts().filter(c => c.tenant === tenant.name);
  const activeContract = tenantContracts.find(c => c.status === "Đang hiệu lực") || tenantContracts[0];
  const tenantInvoices = arrays.invoices().filter(i => i.tenant === tenant.name);
  const unpaidInvoices = tenantInvoices.filter(i => i.status === "Chưa thanh toán");
  return renderAdminShell("Chi tiết khách thuê", `
    <div class="two-col">
      <article class="card panel">
        <div class="panel-head"><h2>${tenant.name}</h2>${badge(tenant.status)}</div>
        <dl class="info-list">
          <div><dt>Mã khách</dt><dd>${tenant.id}</dd></div>
          <div><dt>Số điện thoại</dt><dd>${formatPhone(tenant.phone)}</dd></div>
          <div><dt>Email</dt><dd>${tenant.email || "-"}</dd></div>
          <div><dt>CCCD</dt><dd>${formatCCCD(tenant.citizenId)}</dd></div>
          <div><dt>Ngày bắt đầu</dt><dd>${tenant.startDate}</dd></div>
          <div><dt>Tài khoản</dt><dd>${badge(tenant.accountStatus || "Chưa tạo")}</dd></div>
        </dl>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
        <h3>Phòng đang thuê</h3>
        ${activeContract ? `
          <dl class="info-list">
            <div><dt>Phòng</dt><dd><b>${activeContract.room}</b></dd></div>
            <div><dt>Thời hạn</dt><dd>${activeContract.startDate || "-"} → ${activeContract.endDate || "-"}</dd></div>
            <div><dt>Tiền thuê</dt><dd>${money(activeContract.rent || 0)}</dd></div>
            <div><dt>Trạng thái HĐ</dt><dd>${badge(activeContract.status || "-")}</dd></div>
          </dl>
        ` : `<p class="muted">Chưa có hợp đồng hiệu lực.</p>`}
        <div class="form-actions" style="margin-top:16px">
          ${button("← Quay lại", "cancel-tenant", "outline")}
          ${button("Sửa thông tin", "edit-tenant-from-detail")}
        </div>
      </article>
      <article class="card panel">
        <div class="panel-head"><h2>Hóa đơn chưa thanh toán</h2><span class="badge warning">${unpaidInvoices.length}</span></div>
        ${unpaidInvoices.length > 0 ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Mã HĐ</th><th>Tháng</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
              <tbody>
                ${unpaidInvoices.map(i => `
                  <tr><td><b>${i.id}</b></td><td>${i.fromDate || "-"}</td><td><b>${money(i.total)}</b></td><td>${badge(i.status)}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="form-actions" style="margin-top:16px">
            ${button("Gửi yêu cầu thanh toán", "send-payment-request")}
          </div>
        ` : `<p class="muted">Không có hóa đơn chưa thanh toán.</p>`}
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
        <div class="panel-head"><h2>Lịch sử hợp đồng</h2></div>
        ${tenantContracts.length > 0 ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
              <tbody>
                ${tenantContracts.map(c => `
                  <tr><td>${c.room}</td><td>${c.startDate || "-"}</td><td>${c.endDate || "-"}</td><td>${badge(c.status || "-")}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `<p class="muted">Chưa có hợp đồng.</p>`}
      </article>
    </div>
  `);
};

const renderInvoiceBulk = () => {
  const list = state.bulkPreviewData || [];
  return renderAdminShell("Lập hóa đơn hàng loạt", `
    <div style="margin-bottom: 20px;">
      ${button("← Quay lại", "nav-invoices", "outline")}
      ${button("Phát hành tất cả", "submit-bulk-invoices")}
    </div>
    <article class="card panel" style="overflow-x: auto;">
      <table style="width: 100%; text-align: left; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border);">
            <th style="padding: 10px; width: 40px;"><input type="checkbox" id="bulk-select-all" ${list.length > 0 && list.every(i => i.selected) ? "checked" : ""}></th>
            <th style="padding: 10px;">Phòng</th>
            <th style="padding: 10px;">Khách</th>
            <th style="padding: 10px;">Tiền phòng</th>
            <th style="padding: 10px;">Dịch vụ</th>
            <th style="padding: 10px;">Điện Cũ</th>
            <th style="padding: 10px; width: 120px;">Điện Mới</th>
            <th style="padding: 10px;">Nước Cũ</th>
            <th style="padding: 10px; width: 120px;">Nước Mới</th>
            <th style="padding: 10px;">Thành tiền (Dự kiến)</th>
          </tr>
        </thead>
        <tbody id="bulk-invoice-tbody">
          ${list.length === 0 ? '<tr><td colspan="9" style="text-align:center; padding: 20px;">Không có hợp đồng nào đang hiệu lực để lập hóa đơn</td></tr>' : ''}
          ${list.map((item, index) => {
            const electricityAmount = Math.max(0, (item.electricityNew || 0) - item.electricityOld) * item.electricityPrice;
            const waterAmount = Math.max(0, (item.waterNew || 0) - item.waterOld) * item.waterPrice;
            const total = item.roomAmount + item.services + electricityAmount + waterAmount;
            return `
            <tr style="border-bottom: 1px solid var(--border);" data-index="${index}">
              <td style="padding: 10px;"><input type="checkbox" class="bulk-select-item" data-index="${index}" ${item.selected ? "checked" : ""}></td>
              <td style="padding: 10px;"><strong>${item.room}</strong></td>
              <td style="padding: 10px;">${item.tenant}</td>
              <td style="padding: 10px;">
                <input type="number" class="bulk-input" data-field="roomAmount" data-index="${index}" value="${item.roomAmount || 0}" style="width:100px; padding: 6px; border: 1px solid var(--border); border-radius: 4px;">
              </td>
              <td style="padding: 10px;">
                <input type="number" class="bulk-input" data-field="services" data-index="${index}" value="${item.services || 0}" style="width:100px; padding: 6px; border: 1px solid var(--border); border-radius: 4px;">
              </td>
              <td style="padding: 10px;">${item.electricityOld}</td>
              <td style="padding: 10px;">
                ${item.electricityPrice > 0 ? `<input type="number" class="bulk-input" data-field="electricityNew" data-index="${index}" value="${item.electricityNew || ""}" placeholder="Nhập chỉ số..." style="width:100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px;">` : `<span style="color:var(--text-light)">Khoán</span>`}
              </td>
              <td style="padding: 10px;">${item.waterOld}</td>
              <td style="padding: 10px;">
                ${item.waterPrice > 0 ? `<input type="number" class="bulk-input" data-field="waterNew" data-index="${index}" value="${item.waterNew || ""}" placeholder="Nhập chỉ số..." style="width:100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px;">` : `<span style="color:var(--text-light)">Khoán</span>`}
              </td>
              <td style="padding: 10px; font-weight: bold; color: var(--primary);" id="bulk-total-${index}">
                ${money(total)}
              </td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </article>
  `);
};

const renderAdmin = () => {
  const pages = {
    dashboard: renderDashboard,
    rooms: renderRooms,
    "room-detail": renderRoomDetail,
    "room-form": renderRoomForm,
    tenants: renderTenants,
    "tenant-form": renderTenantForm,
    "tenant-detail": renderTenantDetail,
    contract: renderContract,
    invoices: renderInvoices,
    "invoice-create": renderInvoiceCreate,
    "invoice-detail": renderInvoiceDetail,
    "invoice_bulk": renderInvoiceBulk,
    payments: renderPaymentHistory,
    repairs: renderRepairs,
    settings: renderSettings
  };
  return pages[state.adminPage]?.() || renderDashboard();
};

const render = () => {
  app.innerHTML = state.role === "admin" ? renderAdmin() : state.role === "tenant" ? renderTenant() : renderLogin();
};

const updateInvoiceCalcOutputs = () => {
  const calc = calculateInvoice();
  const values = {
    electricityUsage: `${calc.electricityUsage} kWh`,
    electricityAmount: money(calc.electricityAmount),
    waterUsage: `${calc.waterUsage} m3`,
    waterAmount: money(calc.waterAmount),
    roomAmount: money(numberValue(state.calcRoomAmount)),
    serviceAmount: money(numberValue(state.calcServiceAmount)),
    discount: money(numberValue(state.calcDiscount)),
    subtotal: money(calc.subtotal),
    daysAfterExport: `${calc.daysAfterExport} ngày`,
    lateDays: `${calc.lateDays} ngày`,
    penalty: money(calc.penalty),
    total: money(calc.total),
    penaltyNote: calc.isLate
      ? "Hóa đơn đã quá 7 ngày và chưa thanh toán, hệ thống áp dụng phạt 10%."
      : "Chưa áp dụng phạt vì còn trong 7 ngày hoặc đã thanh toán."
  };
  Object.entries(values).forEach(([key, value]) => {
    const node = app.querySelector(`[data-calc-output="${key}"]`);
    if (node) node.textContent = value;
  });
};

const collectForm = (name) => {
  const root = app.querySelector(`[data-form="${name}"]`);
  const payload = {};
  if (!root) return payload;
  root.querySelectorAll("[data-field]").forEach((fieldNode) => {
    let value = fieldNode.value;
    if (fieldNode.dataset.type === "money") {
      value = numberValue(value.replace(/\D/g, ""));
      payload[fieldNode.dataset.field] = value;
    } else {
      payload[fieldNode.dataset.field] = fieldNode.type === "number" ? numberValue(value) : value.trim();
    }
  });
  return payload;
};

const loadAllData = async () => {
  const results = await Promise.allSettled([
    api.rooms.getAll(),
    api.tenants.getAll(),
    api.contracts.getAll(),
    api.contracts.getHistory(),
    api.invoices.getAll(),
    api.repairs.getAll(),
    api.payments.getAll(),
    api.settings.get()
  ]);

  const [rooms, tenants, contracts, history, invoices, repairs, payments, settings] = results;
  const patch = { apiOnline: results.every((result) => result.status === "fulfilled") };
  if (rooms.status === "fulfilled") patch.roomsData = rooms.value;
  if (tenants.status === "fulfilled") patch.tenantsData = tenants.value;
  if (contracts.status === "fulfilled") patch.contractsData = contracts.value;
  if (history.status === "fulfilled") patch.contractHistoryData = history.value;
  if (invoices.status === "fulfilled") patch.invoicesData = invoices.value;
  if (repairs.status === "fulfilled") {
    patch.repairsData = repairs.value;
    patch.selectedRepair = state.selectedRepair || repairs.value[0]?.id || "";
  }
  if (payments.status === "fulfilled") patch.paymentHistoryData = payments.value;
  if (settings.status === "fulfilled") patch.landlord = settings.value;
  state = { ...state, ...patch };
  render();
};

const loadTenantData = async () => {
  try {
    const portal = await api.me.get();
    state = {
      ...state,
      tenantPortal: portal,
      apiOnline: true,
      role: "tenant",
      tenantPage: state.tenantPage || "overview"
    };
    render();
  } catch (error) {
    console.error(error);
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    state = { ...state, role: "guest", user: null, tenantPortal: null };
    render();
    showToast("Phiên người thuê hết hạn, vui lòng đăng nhập lại");
  }
};

const saveInvoice = async (status) => {
  const form = collectForm("invoice");
  const calc = calculateInvoice();
  const payload = {
    ...form,
    fromDate: form.createFrom || "",
    toDate: form.createTo || "",
    dueDate: form.createDue || "",
    roomAmount: numberValue(state.calcRoomAmount),
    electricityOld: numberValue(state.calcElectricityOld),
    electricityNew: numberValue(state.calcElectricityNew),
    electricityPrice: numberValue(state.calcElectricityPrice),
    waterOld: numberValue(state.calcWaterOld),
    waterNew: numberValue(state.calcWaterNew),
    waterPrice: numberValue(state.calcWaterPrice),
    services: numberValue(state.calcServiceAmount),
    discount: numberValue(state.calcDiscount),
    penaltyDays: calc.lateDays,
    penaltyRate: 0.1,
    penalty: calc.penalty,
    total: calc.total,
    status: status || state.calcPaidStatus || "Chưa thanh toán"
  };
  const created = await api.invoices.create(payload);
  state.selectedInvoice = created.id;
  await loadAllData();
  setState({ adminPage: "invoice-detail" });
  showToast("Đã tạo hóa đơn bằng API");
};

const handleAction = async (action) => {
  try {
    if (action === "add-room") return setState({ selectedRoom: "", adminPage: "room-form" });
    if (action === "edit-room") return setState({ adminPage: "room-form" });
    if (action === "cancel-room") return setState({ adminPage: "rooms" });
    if (action === "save-room") {
      const payload = collectForm("room");
      if (!payload.id && !payload.name) return showToast("Vui lòng nhập mã phòng");
      // Khi tạo mới, roomCode lấy từ trường id
      if (!state.selectedRoom) {
        const landlord = JSON.parse(localStorage.getItem("trohub_user") || "{}");
        const mapped = {
          roomCode: payload.id,
          area: payload.area || "0",
          defaultRentPrice: payload.rent || 0,
          defaultDeposit: payload.deposit || 0,
          landlordId: landlord.id
        };
        await api.rooms.create({ name: payload.id, area: payload.area, rent: payload.rent, deposit: payload.deposit });
      } else {
        await api.rooms.update(state.selectedRoom, payload);
      }
      await loadAllData();
      setState({ selectedRoom: payload.id || state.selectedRoom, adminPage: "rooms" });
      return showToast("Đã lưu phòng thành công!");
    }
    if (action === "delete-room") {
      const room = findRoom();
      await api.rooms.delete(room.objectId || state.selectedRoom);
      await loadAllData();
      setState({ selectedRoom: arrays.rooms()[0]?.id || "", adminPage: "rooms" });
      return showToast("Đã xóa phòng bằng API");
    }

    if (action === "nav-invoice-bulk") {
      try {
        const previewData = await api.invoices.getBulkPreview();
        state.bulkPreviewData = previewData.map(item => ({ ...item, selected: true }));
        setState({ adminPage: "invoice_bulk" });
      } catch (e) {
        alert(e.message);
      }
      return;
    }
    
    if (action === "submit-bulk-invoices") {
      try {
        const data = (state.bulkPreviewData || []).filter(item => item.selected);
        if (data.length === 0) return showToast("Vui lòng chọn ít nhất 1 phòng để phát hành", "error");

        const submitData = data.map(item => {
          if (item.electricityPrice > 0) {
            if (item.electricityNew === undefined || item.electricityNew === "" || item.electricityNew === null) throw new Error(`Phòng ${item.room}: Chưa nhập chỉ số điện`);
            if (item.electricityNew < item.electricityOld) throw new Error(`Phòng ${item.room}: Chỉ số điện mới nhỏ hơn cũ`);
          } else {
            item.electricityNew = item.electricityOld; // Default to old if not metered
          }
          
          if (item.waterPrice > 0) {
            if (item.waterNew === undefined || item.waterNew === "" || item.waterNew === null) throw new Error(`Phòng ${item.room}: Chưa nhập chỉ số nước`);
            if (item.waterNew < item.waterOld) throw new Error(`Phòng ${item.room}: Chỉ số nước mới nhỏ hơn cũ`);
          } else {
            item.waterNew = item.waterOld; // Default to old if not metered
          }
          
          return item;
        });

        if (!confirm(`Phát hành ${submitData.length} hóa đơn cùng lúc?`)) return;

        const res = await api.invoices.bulkCreate({ invoices: submitData });
        alert(res.message || "Tạo hóa đơn hàng loạt thành công!");
        await loadAllData();
        setState({ adminPage: "invoices" });
      } catch (e) {
        alert(e.message);
      }
      return;
    }

    if (action === "mark-paid") {
      const invoice = findInvoice();
      if (!invoice) return;
      await api.invoices.markPaid(invoice.objectId || invoice.id, { paymentMethod: invoice.paymentMethod || "Tiền mặt" });
      await loadAllData();
      render();
      return;
    }

    if (action === "print-invoice") {
      window.print();
      return;
    }

    if (action === "send-reminder") {
      const invoice = findInvoice();
      if (!invoice) return;
      // Chuyển trạng thái sang Quá hạn khi bấm gửi lời nhắc
      await api.invoices.update(invoice.objectId || invoice.id, { status: "Quá hạn" });
      alert("Đã gửi lời nhắc và chuyển trạng thái sang Quá hạn!");
      await loadAllData();
      render();
      return;
    }

    if (action === "add-contract") {
      setState({ 
        selectedContract: "",
        contractStartDate: "",
        contractEndDate: "",
        adminPage: "contract"
      });
      return;
    }

    if (action === "add-tenant") return setState({ selectedTenant: "", adminPage: "tenant-form" });
    if (action === "cancel-tenant") return setState({ adminPage: "tenants" });
    if (action === "edit-tenant-from-detail") return setState({ adminPage: "tenant-form" });
    if (action === "save-tenant") {
      const payload = collectForm("tenant");
      payload.startDate = state.tenantStartDate;
      
      if (payload.phone) payload.phone = payload.phone.replace(/\D/g, "");
      if (payload.citizenId) payload.citizenId = payload.citizenId.replace(/\D/g, "");

      if (!state.selectedTenant) {
        if (!payload.email) return showToast("Vui lòng nhập Email cốt lõi để tìm hoặc tạo mới!");
      }

      if (payload.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email.trim())) {
          return showToast("Vui lòng nhập Email đúng định dạng (ví dụ: nguyenvanA@gmail.com) để làm tên đăng nhập!");
        }
      }
      
      if (payload.phone && payload.phone.length !== 10) return showToast("Số điện thoại phải gồm đúng 10 chữ số");
      if (payload.citizenId && payload.citizenId.length !== 12) return showToast("Số CCCD phải gồm đúng 12 chữ số");
      
      try {
        if (state.selectedTenant) {
          const tenant = findTenant();
          await api.tenants.update(tenant.objectId || state.selectedTenant, payload);
        } else {
          await api.tenants.create(payload);
        }
        await loadAllData();
        setState({ adminPage: "tenants" });
        return showToast("Đã lưu khách thuê thành công!");
      } catch (e) {
        return showToast(e.message || "Có lỗi xảy ra khi lưu!");
      }
    }

    if (action === "draft-contract" || action === "create-contract") {
      const payload = collectForm("contract");
      payload.startDate = state.contractStartDate;
      payload.endDate = state.contractEndDate;
      
      // Chuyển mã sang ObjectId để Backend hiểu
      const roomObj = arrays.rooms().find(r => r.id === payload.room);
      if (roomObj && roomObj.objectId) payload.room = roomObj.objectId;
      
      const tenantObj = arrays.tenants().find(t => t.name === payload.tenant);
      if (tenantObj && tenantObj.objectId) payload.tenant = tenantObj.objectId;

      const saved = state.selectedContract ? await api.contracts.update(state.selectedContract, payload) : await api.contracts.create(payload);
      state.selectedContract = saved?.id || "";
      await loadAllData();
      return showToast(action === "draft-contract" ? "Đã lưu nháp hợp đồng" : "Đã tạo hợp đồng thành công!");
    }
    if (action === "admin-approve-contract") {
      const contract = findContract();
      if (!contract.id) return showToast("Chưa có hợp đồng để xác nhận");
      await api.contracts.confirm(contract.id);
      await loadAllData();
      setState({ selectedContract: "" });
      return showToast("Admin đã xác nhận hợp đồng thành công! Khách đã được gắn phòng.");
    }

    if (action === "create-invoice") return setState({ adminPage: "invoice-create" });
    if (action === "export-month-invoice") return saveInvoice("Chưa thanh toán");
    if (action === "mark-paid") {
      const invoice = findInvoice();
      await api.invoices.markPaid(invoice.objectId || invoice.id, { paymentMethod: invoice.paymentMethod || "Tiền mặt" });
      // Reload đồng thời cả invoices lẫn payment history
      await loadAllData();
      setState({ adminPage: "invoice-detail" });
      return showToast("Đã đánh dấu hóa đơn đã thanh toán - Lịch sử thanh toán đã cập nhật!");
    }
    
    if (action === "go-repairs") return setState({ adminPage: "repairs" });
    if (action === "save-repair") {
      const repair = findRepair();
      const form = collectForm("repair");
      // Gửi đúng field backend cần: status, priority, note
      await api.repairs.update(repair.objectId || repair.id, { status: form.status, priority: form.priority, note: form.note });
      await loadAllData();
      return showToast("Đã cập nhật yêu cầu sửa chữa");
    }
    if (action === "complete-repair") {
      const repair = findRepair();
      await api.repairs.update(repair.objectId || repair.id, { status: "Đã hoàn thành" });
      await loadAllData();
      return showToast("Đã đánh dấu hoàn thành sửa chữa!");
    }
    if (action === "delete-repair-admin") {
      if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu này không?")) return;
      const repair = findRepair();
      await api.repairs.delete(repair.objectId || repair.id);
      setState({ selectedRepair: null });
      await loadAllData();
      return showToast("Đã xóa yêu cầu sửa chữa");
    }
    if (action === "delete-multiple-repairs") {
      const deleteIds = state.selectedRepairsForDelete || [];
      if (!deleteIds.length) return;
      if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${deleteIds.length} yêu cầu đã chọn không?`)) return;
      
      const repairs = arrays.repairs();
      const promises = deleteIds.map(id => {
        const repair = repairs.find(r => r.id === id);
        if (repair) return api.repairs.delete(repair.objectId || repair.id);
      }).filter(Boolean);
      
      await Promise.all(promises);
      setState({ selectedRepair: null, selectedRepairsForDelete: [] });
      await loadAllData();
      return showToast(`Đã xóa ${deleteIds.length} yêu cầu sửa chữa!`);
    }
    if (action === "delete-repair-tenant") {
      if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu sửa chữa này không?")) return;
      const id = target.dataset.id;
      const repair = tenantRepairs().find(r => r.id === id);
      if (repair) {
        await api.me.deleteRepair(repair.objectId || repair.id);
        await loadTenantData();
        return showToast("Đã xóa yêu cầu sửa chữa");
      }
    }
    if (action === "delete-multiple-repairs-tenant") {
      const deleteIds = state.selectedRepairsForDelete || [];
      if (!deleteIds.length) return;
      if (!confirm(`Bạn có chắc chắn muốn xóa ${deleteIds.length} yêu cầu đã chọn không?`)) return;
      
      const repairs = tenantRepairs();
      const promises = deleteIds.map(id => {
        const repair = repairs.find(r => r.id === id);
        if (repair) return api.me.deleteRepair(repair.objectId || repair.id);
      }).filter(Boolean);
      
      await Promise.all(promises);
      state.selectedRepairsForDelete = [];
      await loadTenantData();
      return showToast(`Đã xóa ${deleteIds.length} yêu cầu sửa chữa!`);
    }

    if (action === "tenant-create-repair") {
      const payload = collectForm("tenant-repair");
      if (!payload.category || !payload.description) return showToast("Vui lòng nhập loại sự cố và mô tả");
      
      // Đọc file ảnh (base64)
      const fileInput = app.querySelector(`[data-form="tenant-repair"] input[type="file"][data-field="images"]`);
      const files = fileInput ? fileInput.files : [];
      const base64Images = [];
      
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const p = new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const MAX = 800;
                if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
                else if (height > MAX) { width *= MAX / height; height = MAX; }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.6));
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
          base64Images.push(await p);
        }
      }
      payload.images = base64Images;
      
      await api.me.createRepair(payload);
      await loadTenantData();
      return showToast("Đã gửi yêu cầu sửa chữa cho chủ trọ");
    }

    if (action === "save-settings") {
      const payload = collectForm("settings");
      if (!payload.password) delete payload.password;
      const updated = await api.settings.update(payload);
      state.landlord = updated;
      await loadAllData();
      return showToast("Đã lưu cài đặt chủ trọ bằng API");
    }

    if (action === "reset-dashboard-range") return setState({ dashboardFrom: "01/05/2026", dashboardTo: "31/05/2026", activeCalendar: "" });
    if (action === "reset-invoice-filter") return setState({ invoiceFrom: "01/05/2026", invoiceTo: "31/05/2026", activeCalendar: "" });
    if (action === "apply-dashboard-range" || action === "apply-invoice-filter") return setState({ activeCalendar: "" });

    // Lọc biểu đồ doanh thu
    if (action === "filter-rev-1") return setState({ revenueFilter: "1" });
    if (action === "filter-rev-3") return setState({ revenueFilter: "3" });
    if (action === "filter-rev-6") return setState({ revenueFilter: "6" });


    // Tenant invoice filter buttons
    if (action === "tenant-filter-month") return setState({ tenantInvoiceFilter: "month" });
    if (action === "tenant-filter-3month") return setState({ tenantInvoiceFilter: "3month" });
    if (action === "tenant-filter-6month") return setState({ tenantInvoiceFilter: "6month" });
    if (action === "tenant-filter-custom") return setState({ tenantInvoiceFilter: "custom" });
    if (action === "tenant-filter-apply") return setState({ tenantInvoiceFilter: "custom" });
    if (action === "tenant-filter-reset") return setState({ tenantInvoiceFilter: "month", tenantInvoiceFrom: "", tenantInvoiceTo: "" });

    // Gửi yêu cầu thanh toán cho khách thuê
    if (action === "send-payment-request") {
      const tenantId = state.selectedTenant;
      const tenant = arrays.tenants().find(t => t.id === tenantId);
      if (!tenant) return showToast("Chưa chọn khách thuê");
      const unpaid = arrays.invoices().filter(i => i.tenant === tenant.name && (i.status === "Chưa thanh toán" || i.status === "Quá hạn"));
      if (unpaid.length === 0) return showToast("Khách này không có hóa đơn chưa thanh toán");
      for (const inv of unpaid) {
        await api.invoices.remind(inv.objectId || inv.id);
      }
      await loadAllData();
      return showToast(`Đã gửi yêu cầu thanh toán ${unpaid.length} hóa đơn cho ${tenant.name}`);
    }

    if (action === "show-login") return setState({ showRegister: false });
    if (action === "show-register") return setState({ showRegister: true });

    const messages = {
      "export-pdf": "Chức năng xuất PDF sẽ được bổ sung trong phiên bản tiếp theo",
      "send-contract": "Đã ghi nhận thao tác gửi hợp đồng",
      "export-excel": "Chức năng xuất Excel sẽ được bổ sung trong phiên bản tiếp theo",
      "export-payment-excel": "Chức năng xuất Excel sẽ được bổ sung trong phiên bản tiếp theo",
      "export-revenue-chart": "Chức năng xuất biểu đồ sẽ được bổ sung trong phiên bản tiếp theo",
      "export-invoice-pdf": "Chức năng xuất PDF sẽ được bổ sung trong phiên bản tiếp theo",
      "send-reminder": "Đã ghi nhận nhắc thanh toán"
    };
    showToast(messages[action] || "Đã thực hiện thao tác");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Không thể thực hiện thao tác API");
  }
};

app.addEventListener("input", (event) => {
  const target = event.target;

  if (target.classList.contains('bulk-input')) {
    const idx = target.dataset.index;
    const field = target.dataset.field;
    if (state.bulkPreviewData && state.bulkPreviewData[idx]) {
      state.bulkPreviewData[idx][field] = Number(target.value);
      const item = state.bulkPreviewData[idx];
      const electricityAmount = Math.max(0, (item.electricityNew || 0) - item.electricityOld) * item.electricityPrice;
      const waterAmount = Math.max(0, (item.waterNew || 0) - item.waterOld) * item.waterPrice;
      const total = item.roomAmount + item.services + electricityAmount + waterAmount;
      const totalEl = document.getElementById(`bulk-total-${idx}`);
      if (totalEl) totalEl.innerText = money(total);
    }
  }
  
  if (target.id === "reg-phone" || target.dataset.field === "phone") {
    let val = target.value.replace(/\D/g, "");
    if (val.length > 10) val = val.slice(0, 10);
    target.value = formatPhone(val);
    if (target.value === "-") target.value = "";
    return;
  }
  
  if (target.id === "reg-idCard" || target.dataset.field === "citizenId") {
    let val = target.value.replace(/\D/g, "");
    if (val.length > 12) val = val.slice(0, 12);
    target.value = formatCCCD(val);
    if (target.value === "-") target.value = "";
    return;
  }

  if (target.dataset.type === "money") {
    let val = target.value.replace(/\D/g, "");
    if (val) {
      target.value = new Intl.NumberFormat("vi-VN").format(val);
    } else {
      target.value = "";
    }
    return;
  }

  if (target?.dataset?.calcField) {
    state = { ...state, [target.dataset.calcField]: target.value };
    updateInvoiceCalcOutputs();
    return;
  }
  if (target?.dataset?.globalSearch !== undefined) {
    state.searchQuery = target.value;
    render();
    return;
  }
  if (target?.dataset?.searchRooms !== undefined) {
    state.searchQuery = target.value;
    render();
    return;
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  
  if (target.dataset.action === "toggle-all-repairs") {
    const repairs = arrays.repairs();
    if (target.checked) {
      state.selectedRepairsForDelete = repairs.map(r => r.id);
    } else {
      state.selectedRepairsForDelete = [];
    }
    render();
    return;
  }
  
  if (target.id === 'bulk-select-all') {
    const checked = target.checked;
    (state.bulkPreviewData || []).forEach(item => item.selected = checked);
    document.querySelectorAll('.bulk-select-item').forEach(el => el.checked = checked);
    return;
  }

  if (target.classList.contains('bulk-select-item')) {
    const idx = target.dataset.index;
    if (state.bulkPreviewData && state.bulkPreviewData[idx]) {
      state.bulkPreviewData[idx].selected = target.checked;
      const allChecked = state.bulkPreviewData.every(item => item.selected);
      const selectAllEl = document.getElementById('bulk-select-all');
      if (selectAllEl) selectAllEl.checked = allChecked;
    }
    return;
  }
  
  if (target.dataset.action === "toggle-all-repairs-tenant") {
    const repairs = tenantRepairs();
    if (target.checked) {
      state.selectedRepairsForDelete = repairs.map(r => r.id);
    } else {
      state.selectedRepairsForDelete = [];
    }
    render();
    return;
  }

  if (target.dataset.action === "toggle-repair" || target.dataset.action === "toggle-repair-tenant") {
    const id = target.dataset.id;
    state.selectedRepairsForDelete = state.selectedRepairsForDelete || [];
    if (target.checked) {
      state.selectedRepairsForDelete.push(id);
    } else {
      state.selectedRepairsForDelete = state.selectedRepairsForDelete.filter(rId => rId !== id);
    }
    render();
    return;
  }
  
  // Tự động tải lại form Tạo Hóa Đơn khi chọn Phòng
  if (target.dataset.field === "room" && state.adminPage === "invoice-create") {
    state.room = target.value;
    state.selectedRoom = target.value;
    render();
    return;
  }

  // Tự động tải lại form Tạo Hợp Đồng khi chọn Phòng (để auto-fill tiền thuê/cọc)
  if (target.dataset.field === "room" && state.adminPage === "contract" && state.selectedContract === "") {
    state.contractSelectedRoom = target.value;
    render();
    return;
  }

  if (!target?.dataset?.calcField) return;
  state = { ...state, [target.dataset.calcField]: target.value };
  updateInvoiceCalcOutputs();
});

app.addEventListener("click", async (event) => {
  const target = event.target.closest("button, tr, article, [data-action], [data-admin-nav]");
  if (!target) return;

  if (target.dataset.tenantPay) {
    setState({ showQRForInvoice: target.dataset.tenantPay });
    return;
  }

  if (target.dataset.closeQr !== undefined) {
    setState({ showQRForInvoice: null });
    return;
  }

  if (target.dataset.calendarToggle) {
    const key = target.dataset.calendarToggle;
    const value = state[key] || "01/05/2026";
    setState({
      activeCalendar: state.activeCalendar === key ? "" : key,
      calendarView: { ...state.calendarView, [key]: state.calendarView[key] || monthKey(parseDate(value)) }
    });
    return;
  }

  if (target.dataset.calendarShift) {
    const key = target.dataset.calendarShift;
    const value = state[key] || "01/05/2026";
    setState({
      activeCalendar: key,
      calendarView: { ...state.calendarView, [key]: shiftedMonth(key, value, Number(target.dataset.calendarDir || 0)) }
    });
    return;
  }

  if (target.dataset.datePick) {
    setState({
      [target.dataset.datePick]: target.dataset.dateValue,
      activeCalendar: ""
    });
    return;
  }

  if (target.dataset.login !== undefined) {
    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value.trim();
    showToast("Đang đăng nhập...");
    try {
      const res = await api.auth.login(email, password);
      let userObj = res.user || res.data?.user || res || {};
      const token = res.token || res.data?.token || (typeof res === "string" ? res : "");
      
      // Fallback: Decode JWT token to get role if not explicitly provided
      if (token && typeof token === "string" && token.split(".").length === 3) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userObj = { ...payload, ...userObj }; // response data overrides token data
        } catch (e) {
          console.warn("Failed to decode JWT token", e);
        }
      }
      
      const roleVal = Number(userObj.role);
      
      localStorage.setItem("trohub_token", token);
      localStorage.setItem("trohub_user", JSON.stringify(userObj));
      state = {
        ...state,
        user: userObj,
        role: roleVal === 2 ? "tenant" : "admin",
        adminPage: "dashboard",
        tenantPage: "overview"
      };
      if (state.role === "tenant") await loadTenantData();
      else await loadAllData();
      showToast("Đăng nhập thành công!");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Không đăng nhập được");
    }
    return;
  }

  if (target.dataset.register !== undefined) {
    const fullName = document.querySelector("#reg-fullName").value.trim();
    const phone = document.querySelector("#reg-phone").value.replace(/\D/g, "");
    const email = document.querySelector("#reg-email").value.trim();
    const idCard = document.querySelector("#reg-idCard").value.replace(/\D/g, "");
    const username = email; // Email chính là tên đăng nhập
    const password = document.querySelector("#reg-password").value.trim();
    const role = Number(document.querySelector("#reg-role").value);
    if (!fullName || !phone || !email || !password) return showToast("Vui lòng điền đầy đủ thông tin có dấu *");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return showToast("Email đăng ký phải đúng định dạng (VD: nguyenvanA@gmail.com)!");
    
    if (phone.length !== 10) return showToast("Số điện thoại phải gồm đúng 10 chữ số");
    if (idCard && idCard.length !== 12) return showToast("Số CCCD phải gồm đúng 12 chữ số");
    if (password.length < 6) return showToast("Mật khẩu phải có ít nhất 6 ký tự");
    showToast("Đang đăng ký...");
    try {
      await api.auth.register({ username, password, fullName, phone, email, idCard, role });
      showToast("Đăng ký thành công! Đang đăng nhập...");
      const res = await api.auth.login(username, password);
      localStorage.setItem("trohub_token", res.token);
      localStorage.setItem("trohub_user", JSON.stringify(res.user || {}));
      state = {
        ...state,
        user: res.user || null,
        role: res.user?.role === 2 ? "tenant" : "admin",
        showRegister: false,
        adminPage: "dashboard",
        tenantPage: "overview"
      };
      if (state.role === "tenant") await loadTenantData();
      else await loadAllData();
      showToast("Chào mừng bạn đến với TroHub!");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Không đăng ký được");
    }
    return;
  }

  if (target.dataset.logout !== undefined) {
    localStorage.removeItem("trohub_token");
    localStorage.removeItem("trohub_user");
    setState({ role: "guest", user: null, tenantPortal: null });
    return;
  }

  if (target.dataset.tenantNav) {
    setState({ tenantPage: target.dataset.tenantNav });
    if (state.apiOnline) await loadTenantData();
    return;
  }

  if (target.dataset.confirmPay) {
    try {
      await api.me.payInvoice(target.dataset.confirmPay, { paymentMethod: "QR ngân hàng" });
      await loadTenantData();
      showToast("Đã ghi nhận thanh toán hóa đơn");
      setState({ showQRForInvoice: null });
    } catch (error) {
      showToast(error.message || "Không thanh toán được hóa đơn");
    }
    return;
  }

  if (target.dataset.tenantSign) {
    try {
      await api.me.signContract(target.dataset.tenantSign);
      await loadTenantData();
      showToast("Đã ký hợp đồng và gán phòng cho tài khoản");
    } catch (error) {
      showToast(error.message || "Không ký được hợp đồng");
    }
    return;
  }

  if (target.dataset.tenantRequestTerminate) {
    if (!confirm("Bạn có chắc chắn muốn yêu cầu trả phòng? Bạn cần thanh toán hết nợ trước khi gửi yêu cầu.")) return;
    try {
      await api.me.requestTerminate(target.dataset.tenantRequestTerminate);
      await loadTenantData();
      showToast("Đã gửi yêu cầu trả phòng thành công");
    } catch (error) {
      showToast(error.message || "Không thể gửi yêu cầu");
    }
    return;
  }

  if (target.dataset.adminNav) {
    setState({ adminPage: target.dataset.adminNav });
    if (state.apiOnline) await loadAllData();
    return;
  }

  if (target.dataset.roomDetail) {
    setState({ selectedRoom: target.dataset.roomDetail, adminPage: "room-detail" });
    return;
  }

  if (target.dataset.tenantEdit) {
    setState({ selectedTenant: target.dataset.tenantEdit, adminPage: "tenant-form" });
    return;
  }

  if (target.dataset.tenantStop) {
    if (!confirm("Bạn có chắc chắn muốn ngừng thuê khách này? Thao tác này sẽ kết thúc hợp đồng và trả phòng.")) return;
    try {
      const tenant = arrays.tenants().find(t => t.id === target.dataset.tenantStop);
      await api.tenants.stop(tenant?.objectId || target.dataset.tenantStop);
      await loadAllData();
      showToast("Đã ngừng thuê và trả phòng thành công!");
    } catch (error) {
      showToast(error.message || "Không thực hiện được");
    }
    return;
  }

  if (target.dataset.tenantAccount) {
    showToast("Tài khoản đã được tạo tự động khi thêm khách thuê");
    return;
  }

  if (target.dataset.tenantInvite) {
    const tenantId = target.dataset.tenantInvite;
    const tenant = arrays.tenants().find(t => t.id === tenantId);
    if (!tenant) return showToast("Không tìm thấy thông tin khách thuê");
    if (!tenant.objectId) return showToast("Định danh khách thuê không hợp lệ");
    try {
      // Tạo hợp đồng với status=0 (Đang chờ ký) để gửi mời ký cho khách thuê
      const room = arrays.rooms().find(r => r.id === tenant.room || r.name === tenant.room);
      const startDate = new Date().toISOString();
      const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
      await api.contracts.create({
        roomId: room?.objectId || tenant.room,
        tenantId: tenant.objectId,
        startDate,
        endDate,
        fixedRentPrice: room?.rent || 0,
        fixedDeposit: room?.deposit || 0,
        services: []
      });
      await loadAllData();
      showToast(`Đã gửi lời mời ký hợp đồng cho ${tenant.name}! Hợp đồng sẽ hiển thị ở phía khách thuê.`);
    } catch (error) {
      showToast(error.message || "Không gửi được lời mời hợp đồng");
    }
    return;
  }

  if (target.dataset.roomFilter) {
    setState({ roomFilter: target.dataset.roomFilter });
    return;
  }

  if (target.dataset.searchRooms !== undefined) {
    return; // handled by input event
  }

  if (target.dataset.contractSelect) {
    setState({ selectedContract: target.dataset.contractSelect });
    return;
  }

  if (target.dataset.invoiceDetail) {
    setState({ selectedInvoice: target.dataset.invoiceDetail, adminPage: "invoice-detail" });
    return;
  }

  if (target.dataset.repairSelect) {
    setState({ selectedRepair: target.dataset.repairSelect });
    return;
  }

  if (target.dataset.tenantDetailRow) {
    setState({ selectedTenant: target.dataset.tenantDetailRow, adminPage: "tenant-detail" });
    return;
  }

  const action = target.dataset.action;
  if (action) await handleAction(action);
});

const bootstrap = async () => {
  const token = localStorage.getItem("trohub_token");
  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem("trohub_user") || "null");
  } catch {
    localStorage.removeItem("trohub_user");
  }
  if (!token) {
    render();
    return;
  }

  state = {
    ...state,
    user: savedUser,
    role: savedUser?.role === 2 ? "tenant" : "admin",
    adminPage: "dashboard",
    tenantPage: "overview"
  };
  render();
  if (state.role === "tenant") await loadTenantData();
  else await loadAllData();
};

bootstrap();
