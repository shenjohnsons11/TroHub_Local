import { appData as fallbackAppData, money } from "./data.js";

const app = document.querySelector("#app");
const API_URL = window.TROHUB_API_URL || "http://127.0.0.1:8080";
let appData = fallbackAppData;

let state = {
  role: "guest",
  adminPage: "dashboard",
  tenantPage: "home",
  selectedRoom: "A101",
  selectedInvoice: "HD0526-A101",
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
  apiStatus: "Đang dùng dữ liệu mẫu",
  toast: ""
};

const statusClass = (status = "") => {
  if (status.includes("Đã") || status.includes("Còn hiệu lực") || status.includes("hoàn thành")) return "success";
  if (status.includes("Quá")) return "danger";
  if (status.includes("Đang") || status.includes("Chưa")) return "warning";
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
  }, 2200);
};

const findRoom = () => appData.rooms.find((room) => room.id === state.selectedRoom) || appData.rooms[0];
const findInvoice = () => appData.invoices.find((invoice) => invoice.id === state.selectedInvoice) || appData.invoices[0];
const shortMoney = (value) => `${Math.round(value / 100000) / 10}tr`;
const tenantPayments = () => appData.paymentHistory.filter((item) => item.tenant === appData.tenant.name);
const penaltyRateText = (value) => Number(value) <= 1 ? `${Math.round(Number(value) * 100)}%` : money(value);

const badge = (label) => `<span class="badge ${statusClass(label)}">${label}</span>`;

const button = (label, action, variant = "primary") =>
  `<button class="btn ${variant}" data-action="${action}">${label}</button>`;

const parseDate = (value) => {
  const [day, month, year] = String(value || "").split("/").map(Number);
  if (!day || !month || !year) return new Date(2026, 4, 1);
  return new Date(year, month - 1, day);
};

const formatDate = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const daysBetween = (from, to) => Math.max(0, Math.floor((parseDate(to) - parseDate(from)) / 86400000));
const numberValue = (value) => Number(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;

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

const sortedRepairs = () => [...appData.repairs].sort((a, b) => parseDate(b.date) - parseDate(a.date));

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
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  return `
    <div class="bar-chart analytics-chart">
      ${items.map((item) => `
        <div class="bar-item">
          <div class="bar-value">${formatter(item[valueKey])}</div>
          <div class="bar" style="height:${Math.max(14, Math.round(Number(item[valueKey] || 0) / max * maxHeight))}px"></div>
          <span>${item[labelKey]}</span>
        </div>
      `).join("")}
    </div>
  `;
};

const renderDualBarChart = (items, leftKey, rightKey, leftLabel, rightLabel, unit = "") => {
  const max = Math.max(...items.flatMap((item) => [Number(item[leftKey] || 0), Number(item[rightKey] || 0)]), 1);
  return `
    <div class="dual-chart">
      ${items.map((item) => `
        <div class="dual-item">
          <div class="dual-bars">
            <div class="dual-bar electricity" title="${leftLabel}: ${item[leftKey]}${unit}" style="height:${Math.max(12, Math.round(Number(item[leftKey] || 0) / max * 170))}px"></div>
            <div class="dual-bar water" title="${rightLabel}: ${item[rightKey]}${unit}" style="height:${Math.max(12, Math.round(Number(item[rightKey] || 0) / max * 170))}px"></div>
          </div>
          <span>${item.month}</span>
        </div>
      `).join("")}
    </div>
    <div class="chart-legend"><span><i class="legend-dot electricity"></i>${leftLabel}</span><span><i class="legend-dot water"></i>${rightLabel}</span></div>
  `;
};

const field = (label, value = "", type = "text") => `
  <label class="field">
    <span>${label}</span>
    <input type="${type}" value="${value}" />
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

const selectField = (label, value, options) => `
  <label class="field">
    <span>${label}</span>
    <select>
      ${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
    </select>
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
      <h2>Đăng nhập hệ thống</h2>
      <p class="muted">Chọn vai trò demo để vào đúng giao diện.</p>
      <div class="role-switch">
        <button class="active" data-fill-login="admin">Chủ trọ</button>
        <button data-fill-login="tenant">Khách thuê</button>
      </div>
      <label class="field"><span>Email</span><input id="login-email" value="admin@trohub.vn" /></label>
      <label class="field"><span>Mật khẩu</span><input id="login-password" type="password" value="123456" /></label>
      <div class="login-meta">
        <label><input type="checkbox" checked /> Ghi nhớ đăng nhập</label>
        <a>Quên mật khẩu?</a>
      </div>
      <button class="btn primary full" data-login>Đăng nhập</button>
      <div class="demo-note">
        <b>Tài khoản demo</b>
        <span>admin@trohub.vn / 123456</span>
        <span>tenant@trohub.vn / 123456</span>
      </div>
    </div>
  </section>
`);

const sidebarItems = [
  ["dashboard", "Dashboard"],
  ["rooms", "Phòng trọ"],
  ["room-detail", "Chi tiết phòng"],
  ["room-form", "Thêm / sửa phòng"],
  ["tenants", "Khách thuê"],
  ["contract", "Hợp đồng"],
  ["invoices", "Hóa đơn"],
  ["invoice-create", "Tạo hóa đơn"],
  ["invoice-detail", "Chi tiết hóa đơn"],
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
          <p>Xin chào, ${appData.landlord.name} • ${state.apiStatus}</p>
        </div>
        <div class="topbar-actions">
          <div class="search">Tìm kiếm phòng, khách thuê, hóa đơn...</div>
          ${button(action, action.includes("phòng") ? "add-room" : action.includes("biểu đồ") ? "export-revenue-chart" : "create-invoice")}
          <button class="icon-btn">N</button>
          <div class="avatar">A</div>
        </div>
      </header>
      <div class="admin-content">${content}</div>
    </section>
  </section>
  ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
`;

const renderDashboard = () => {
  const totalRooms = appData.rooms.length;
  const occupied = appData.rooms.filter((room) => room.status === "Đang thuê").length;
  const vacant = appData.rooms.filter((room) => room.status === "Còn trống").length;
  const unpaid = appData.invoices.filter((invoice) => invoice.status !== "Đã thanh toán").length;
  const repairCount = appData.repairs.length;
  const revenue = appData.revenue.at(-1).value;
  const unpaidRooms = appData.rooms.filter((room) => ["Chưa thanh toán", "Quá hạn"].includes(room.payment));
  return renderAdminShell("Dashboard", `
    <div class="filter-row">
      <button class="chip active">Tháng này</button>
      <button class="chip">3 tháng</button>
      <button class="chip">6 tháng</button>
      <button class="chip">Tùy chọn ngày</button>
      ${dateField("Từ ngày", state.dashboardFrom, "dashboardFrom")}
      ${dateField("Đến ngày", state.dashboardTo, "dashboardTo")}
      ${button("Áp dụng", "apply-dashboard-range")}
      ${button("Đặt lại", "reset-dashboard-range", "secondary")}
    </div>
    <div class="metric-grid">
      <article class="metric card"><span>Tổng số phòng</span><strong>${totalRooms}</strong><small>Toàn bộ hệ thống</small></article>
      <article class="metric card"><span>Phòng đang thuê</span><strong>${occupied}</strong><small>${Math.round(occupied / totalRooms * 100)}% công suất</small></article>
      <article class="metric card"><span>Phòng trống</span><strong>${vacant}</strong><small>Cần đăng tin / cho thuê</small></article>
      <article class="metric card"><span>Yêu cầu sửa chữa</span><strong>${repairCount}</strong><small>Admin phân độ ưu tiên</small></article>
    </div>
    <div class="dash-grid">
      <article class="card panel">
        <div class="panel-head"><h2>Biểu đồ doanh thu</h2><span class="muted">Có lọc mốc thời gian</span></div>
        ${renderBarChart(appData.revenue)}
        <div class="chart-summary">
          <div><span>Doanh thu tháng này</span><b>${money(revenue)}</b></div>
          <div><span>Phòng trống</span><b>${vacant} phòng</b></div>
          <div><span>Phòng chưa thanh toán</span><b>${unpaidRooms.length} phòng</b></div>
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
          `).join("")}
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
          `).join("")}
        </div>
      </article>
      <article class="card panel">
        <h2>Ghi chú nghiệp vụ hợp đồng</h2>
        <p class="muted">Nếu tháng này A thuê, tháng sau B thuê: hợp đồng của A được kết thúc / bàn giao, phòng ghi lịch sử thuê, sau đó tạo hợp đồng mới cho B. Chỉ số điện nước chốt tại ngày bàn giao được lưu vào hợp đồng cũ và làm chỉ số đầu kỳ cho hợp đồng mới.</p>
      </article>
    </div>
    <article class="card panel">
      <div class="panel-head"><h2>Tình trạng thanh toán từng phòng</h2>${button("Tạo hóa đơn", "create-invoice")}</div>
      ${renderInvoiceTable(appData.invoices)}
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

const renderRooms = () => renderAdminShell("Quản lý phòng", `
  <div class="filter-row">
    <button class="chip active">Tất cả</button>
    <button class="chip">Đang thuê</button>
    <button class="chip">Còn trống</button>
    <button class="chip">Bảo trì</button>
    <div class="search wide">Tìm theo mã phòng / tên khách</div>
  </div>
  <div class="room-grid">
    ${appData.rooms.map(renderRoomCard).join("")}
  </div>
`, "+ Thêm phòng");

const renderRoomDetail = () => {
  const room = findRoom();
  const invoices = appData.invoices.filter((invoice) => invoice.room === room.id);
  return renderAdminShell(room.name, `
    <div class="detail-header card">
      <div>
        <h2>${room.name}</h2>
        ${badge(room.status)}
      </div>
      <div class="actions">
        ${button("Sửa phòng", "edit-room", "outline")}
        ${button("Tạo hóa đơn", "create-invoice")}
      </div>
    </div>
    <div class="tabs"><button class="active">Tổng quan</button><button>Khách thuê</button><button>Hợp đồng</button><button>Điện nước</button><button>Hóa đơn</button><button>Sửa chữa</button></div>
    <div class="two-col">
      <article class="card panel">
        <h2>Tổng quan phòng</h2>
        <dl class="info-list">
          <div><dt>Giá thuê</dt><dd>${money(room.rent)}</dd></div>
          <div><dt>Tiền cọc</dt><dd>${money(room.deposit)}</dd></div>
          <div><dt>Diện tích</dt><dd>${room.area}m2</dd></div>
          <div><dt>Số người tối đa</dt><dd>${room.max}</dd></div>
          <div><dt>Trạng thái</dt><dd>${room.status}</dd></div>
          <div><dt>Ghi chú</dt><dd>${room.note}</dd></div>
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
  const room = findRoom();
  return renderAdminShell("Thêm / sửa phòng", `
    <article class="card form-card">
      <div class="form-grid">
        ${field("Mã phòng", room.id)}
        ${field("Tên phòng", room.name)}
        ${field("Diện tích", `${room.area}`)}
        ${field("Giá thuê", room.rent)}
        ${field("Tiền cọc mặc định", room.deposit)}
        ${field("Số người tối đa", room.max)}
        ${selectField("Trạng thái", room.status, ["Đang thuê", "Còn trống", "Bảo trì"])}
        ${field("Khách thuê", room.tenant)}
      </div>
      <label class="field full-line"><span>Mô tả</span><textarea>${room.note}</textarea></label>
      <div class="upload-box">Ảnh phòng</div>
      <div class="form-actions">
        ${button("Hủy", "cancel-room", "outline")}
        ${button("Lưu phòng", "save-room")}
      </div>
    </article>
  `, "Lưu phòng");
};

const renderTenants = () => renderAdminShell("Quản lý khách thuê", `
  <article class="card panel">
    <div class="panel-head"><h2>Danh sách khách thuê</h2>${button("+ Thêm khách", "add-tenant")}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Họ tên</th><th>Số điện thoại</th><th>Phòng</th><th>CCCD</th><th>Ngày bắt đầu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          ${appData.tenants.map((tenant) => `
            <tr>
              <td><b>${tenant.name}</b></td>
              <td>${tenant.phone}</td>
              <td>${tenant.room}</td>
              <td>${tenant.citizenId}</td>
              <td>${tenant.startDate}</td>
              <td>${badge(tenant.status)}</td>
              <td class="table-actions"><button>Xem</button><button>Sửa</button><button>Ngừng thuê</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </article>
`);

const renderContract = () => {
  const c = appData.contract;
  return renderAdminShell("Tạo hợp đồng", `
    <div class="contract-layout">
      <article class="card panel">
        <h2>Thông tin hợp đồng</h2>
        <div class="form-grid one">
          ${field("Thông tin chủ trọ", appData.landlord.name)}
          ${field("Thông tin khách thuê", c.tenant)}
          ${field("Chọn phòng", c.room)}
          ${field("Ngày ký hợp đồng", c.signDate)}
          ${field("Ngày bắt đầu tính thuê", c.rentStartDate)}
          ${field("Ngày bắt đầu", c.startDate)}
          ${field("Ngày kết thúc", c.endDate)}
          ${field("Tiền thuê", c.rent)}
          ${field("Tiền cọc", c.deposit)}
          ${field("Giá điện / kWh", c.electricityPrice)}
          ${field("Giá nước / m3", c.waterPrice)}
          ${field("Chỉ số điện hiện tại", c.currentElectricityIndex)}
          ${field("Chỉ số nước hiện tại", c.currentWaterIndex)}
          ${field("Phí xe", c.vehicleFee)}
          ${field("Phí internet", c.internetFee)}
          ${field("Phí rác", c.trashFee)}
        </div>
      </article>
      <article class="card contract-preview">
        <h2>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h2>
        <p><b>Bên cho thuê:</b> ${appData.landlord.name}</p>
        <p><b>Bên thuê:</b> ${c.tenant}</p>
        <p><b>Phòng:</b> ${c.room}, ngày ký ${c.signDate}, ngày bắt đầu tính thuê ${c.rentStartDate}, thời hạn từ ${c.startDate} đến ${c.endDate}.</p>
        <p><b>Chi phí:</b> tiền thuê ${money(c.rent)}, tiền cọc ${money(c.deposit)}, điện ${money(c.electricityPrice)}/kWh, nước ${money(c.waterPrice)}/m3.</p>
        <p><b>Chỉ số bàn giao:</b> điện ${c.electricityStartIndex}, nước ${c.waterStartIndex}. Chỉ số hiện tại: điện ${c.currentElectricityIndex}, nước ${c.currentWaterIndex}.</p>
        <p><b>Trạng thái đồng ý:</b> Khách thuê ${c.tenantAccepted ? "đã đồng ý" : "chưa đồng ý"} • Chủ trọ ${c.landlordAccepted ? "đã xác nhận" : "chưa xác nhận"}.</p>
        <p><b>Điều khoản:</b> thanh toán trước ngày 05 hằng tháng, giữ gìn tài sản và báo sự cố khi phát sinh.</p>
        <div class="card panel soft-panel">
          <h3>Lịch sử thuê phòng A101</h3>
          ${appData.contractHistory.map((item) => `<p>${item.id}: ${item.tenant} • ${item.startDate} - ${item.endDate} • ${item.status}</p>`).join("")}
        </div>
        <div class="form-actions">
          ${button("Lưu nháp", "draft-contract", "outline")}
          ${button("Tạo hợp đồng", "create-contract")}
          ${button("Admin xác nhận hợp đồng", "admin-approve-contract")}
          ${button("Xuất PDF", "export-pdf", "secondary")}
          ${button("Gửi cho khách thuê", "send-contract", "secondary")}
        </div>
      </article>
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
        `).join("")}
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
    ${button("Xuất Excel", "export-excel", "outline")}
  </div>
  <article class="card panel">
    ${renderInvoiceTable(appData.invoices)}
  </article>
`, "+ Tạo hóa đơn");

const renderInvoiceCreate = () => {
  const invoice = findInvoice();
  const calc = calculateInvoice();
  return renderAdminShell("Tạo hóa đơn", `
    <div class="two-col invoice-builder">
      <article class="card form-card invoice-form-card">
        <h2>Xuất hóa đơn tháng này</h2>
        <p class="muted">Nhập chỉ số điện nước cũ / mới, hệ thống tự tính tiêu thụ và tổng tiền hóa đơn.</p>
        <div class="form-grid">
          ${field("Phòng", invoice.room)}
          ${field("Khách thuê", invoice.tenant)}
          ${dateField("Từ ngày", state.createFrom, "createFrom")}
          ${dateField("Đến ngày", state.createTo, "createTo")}
          ${dateField("Ngày xuất hóa đơn", state.createExportDate, "createExportDate")}
          ${dateField("Ngày kiểm tra thanh toán", state.createCheckDate, "createCheckDate")}
          ${calcSelectField("Trạng thái thanh toán", "calcPaidStatus", ["Chưa thanh toán", "Đã thanh toán"])}
          ${calcField("Tiền phòng", "calcRoomAmount")}
          ${calcField("Chỉ số điện cũ", "calcElectricityOld")}
          ${calcField("Chỉ số điện mới", "calcElectricityNew")}
          ${calcField("Đơn giá điện / kWh", "calcElectricityPrice")}
          ${calcField("Chỉ số nước cũ", "calcWaterOld")}
          ${calcField("Chỉ số nước mới", "calcWaterNew")}
          ${calcField("Đơn giá nước / m3", "calcWaterPrice")}
          ${calcField("Phí xe + internet + rác", "calcServiceAmount")}
          ${calcField("Giảm giá", "calcDiscount")}
          ${selectField("Phương thức thanh toán", invoice.paymentMethod, ["QR ngân hàng", "MoMo", "VNPay", "ZaloPay", "Tiền mặt"])}
          ${field("Mã giao dịch", invoice.transactionCode)}
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
          ${button("Lưu nháp", "draft-invoice", "outline")}
          ${button("Xuất hóa đơn tháng này", "export-month-invoice")}
          ${button("Xuất PDF", "export-invoice-pdf", "secondary")}
        </div>
      </article>
    </div>
  `, "Tạo hóa đơn");
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
          <div><dt>Trạng thái</dt><dd>${badge(invoice.status)}</dd></div>
          <div><dt>Phương thức TT</dt><dd>${invoice.paymentMethod}</dd></div>
          <div><dt>Mã giao dịch</dt><dd>${invoice.transactionCode}</dd></div>
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
          ${items.map(([label, value]) => `<div><span>${label}</span><b>${money(value)}</b></div>`).join("")}
        </div>
        <div class="total-line"><span>Tổng cộng</span><strong>${money(invoice.total)}</strong></div>
        <div class="form-actions">
          ${button("Xuất PDF", "export-invoice-pdf", "outline")}
          ${button("Đánh dấu đã thanh toán", "mark-paid")}
          ${button("Gửi nhắc thanh toán", "send-reminder", "secondary")}
        </div>
      </article>
    </div>
  `, "Gửi nhắc");
};

const renderPaymentHistory = () => {
  const paidPayments = appData.paymentHistory.filter((payment) => payment.status === "Đã thanh toán");
  const totalPaid = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentMonthPaid = paidPayments.filter((payment) => payment.month === "05/2026").reduce((sum, payment) => sum + payment.amount, 0);
  const unpaidAmount = appData.paymentHistory.filter((payment) => payment.status !== "Đã thanh toán").reduce((sum, payment) => sum + payment.amount, 0);

  return renderAdminShell("Lịch sử thanh toán", `
    <div class="metric-grid payment-metrics">
      <article class="metric card"><span>Tổng đã thu</span><strong>${money(totalPaid)}</strong><small>Từ các giao dịch đã thanh toán</small></article>
      <article class="metric card"><span>Đã thu tháng này</span><strong>${money(currentMonthPaid)}</strong><small>Giao dịch tháng 05/2026</small></article>
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
        ${renderBarChart(appData.paymentRevenue)}
      </article>
      <article class="card panel">
        <div class="panel-head">
          <div>
            <h2>Phương thức thanh toán</h2>
            <p class="muted">Tổng hợp giao dịch</p>
          </div>
        </div>
        <div class="method-list">
          <div><span>QR ngân hàng</span><b>3 giao dịch</b></div>
          <div><span>MoMo</span><b>1 giao dịch</b></div>
          <div><span>VNPay</span><b>2 giao dịch</b></div>
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
            ${appData.paymentHistory.map((payment) => `
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
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `, "Xuất biểu đồ");
};

const renderRepairs = () => {
  const repairs = sortedRepairs();
  const selected = repairs[0];
  const pageItems = repairs.slice(0, 3);
  return renderAdminShell("Yêu cầu sửa chữa", `
    <div class="repair-admin-grid">
      <article class="card panel">
        <div class="panel-head">
          <div>
            <h2>Danh sách yêu cầu</h2>
            <p class="muted">Khách gửi mô tả và ảnh, admin phân độ ưu tiên.</p>
          </div>
          ${badge(`${appData.repairs.length} yêu cầu`)}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Mã YC</th><th>Phòng</th><th>Người gửi</th><th>Loại sự cố</th><th>Ưu tiên</th><th>Người đặt</th><th>Ảnh</th><th>Ngày gửi</th><th>Trạng thái</th></tr></thead>
            <tbody>
              ${pageItems.map((repair) => `
                <tr>
                  <td><b>${repair.id}</b></td>
                  <td>${repair.room}</td>
                  <td>${repair.sender}</td>
                  <td>${repair.category}</td>
                  <td>${badge(repair.priority)}</td>
                  <td>${repair.priorityBy}</td>
                  <td>${repair.images.length} ảnh</td>
                  <td>${repair.date}</td>
                  <td>${badge(repair.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button class="chip active">1</button>
          <button class="chip">2</button>
          <button class="chip">Sau</button>
        </div>
      </article>
      <article class="card panel">
        <h2>Chi tiết request</h2>
        <div class="repair-images">
          ${selected.images.map((image, index) => `<div>${index + 1}<span>${image}</span></div>`).join("") || "<div>0<span>Chưa có ảnh</span></div>"}
        </div>
        <p><b>Mô tả:</b> ${selected.description}</p>
        <p><b>Lịch sử:</b> Tiếp nhận -> Đang xử lý</p>
        ${selectField("Admin đặt độ ưu tiên", selected.priority, ["Thấp", "Trung bình", "Cao"])}
        ${selectField("Cập nhật trạng thái", selected.status, ["Mới", "Đang xử lý", "Đã hoàn thành"])}
        <div class="upload-box compact">Upload thêm nhiều ảnh xử lý</div>
        <label class="field"><span>Ghi chú của chủ trọ</span><textarea>${selected.note}</textarea></label>
        ${button("Lưu cập nhật", "save-repair")}
      </article>
    </div>
  `, "Cập nhật");
};

const renderSettings = () => renderAdminShell("Cài đặt tài khoản", `
  <article class="card form-card narrow">
    <h2>Thông tin chủ trọ</h2>
    ${field("Họ tên", appData.landlord.name)}
    ${field("Email", appData.landlord.email)}
    ${field("Số điện thoại", appData.landlord.phone)}
    ${field("Tên nhà trọ", appData.landlord.propertyName)}
    ${selectField("Trạng thái nhà trọ", appData.landlord.propertyStatus, ["Đang hoạt động", "Tạm dừng", "Đã bán"])}
    ${field("Địa chỉ", appData.landlord.address)}
    ${field("Mật khẩu mới", "********", "password")}
    <div class="form-actions">${button("Lưu thay đổi", "save-settings")}</div>
  </article>
`, "Lưu thay đổi");

const renderAdmin = () => {
  const pages = {
    dashboard: renderDashboard,
    rooms: renderRooms,
    "room-detail": renderRoomDetail,
    "room-form": renderRoomForm,
    tenants: renderTenants,
    contract: renderContract,
    invoices: renderInvoices,
    "invoice-create": renderInvoiceCreate,
    "invoice-detail": renderInvoiceDetail,
    payments: renderPaymentHistory,
    repairs: renderRepairs,
    settings: renderSettings
  };
  return pages[state.adminPage]?.() || renderDashboard();
};

const mobileNav = [
  ["home", "Trang chủ"],
  ["invoices", "Hóa đơn"],
  ["repairs", "Sửa chữa"],
  ["contract", "Hợp đồng"],
  ["account", "Tài khoản"]
];

const renderTenantShell = (content) => shell(`
  <section class="tenant-stage">
    <div class="tenant-info">
      <div class="brand-row">
        <div class="brand-mark">TH</div>
        <strong>TroHub Tenant App</strong>
      </div>
      <h1>Mobile App khách thuê</h1>
      <p>Khung điện thoại 390x844 mô phỏng app cho khách thuê. Dùng bottom navigation để chuyển màn hình.</p>
      <button class="btn outline" data-logout>Đăng xuất</button>
    </div>
    <div class="phone">
      <div class="phone-screen">
        ${content}
        <nav class="bottom-nav">
          ${mobileNav.map(([id, label]) => `<button class="${state.tenantPage === id ? "active" : ""}" data-tenant-nav="${id}"><span></span>${label}</button>`).join("")}
        </nav>
      </div>
    </div>
  </section>
`);

const renderTenantHome = () => {
  const invoice = appData.invoices[0];
  return renderTenantShell(`
    <header class="mobile-header">
      <h2>Xin chào, ${appData.tenant.name}</h2>
      <p>Phòng ${appData.tenant.roomId}</p>
    </header>
    <article class="mobile-card bill-highlight">
      <span>Tổng tiền tháng này</span>
      <strong>${money(invoice.total)}</strong>
      ${badge(invoice.status)}
      <small>Hạn thanh toán: ${invoice.dueDate}</small>
      <button class="btn primary full" data-tenant-nav="payment">Thanh toán ngay</button>
    </article>
    <div class="quick-grid">
      <button data-tenant-nav="contract">Hợp đồng</button>
      <button data-tenant-nav="utilities">Điện nước</button>
      <button data-tenant-nav="repairs">Sửa chữa</button>
      <button data-tenant-nav="invoices">Hóa đơn</button>
    </div>
    <article class="mobile-card">
      <h3>Hợp đồng</h3>
      <p>Ngày hết hạn: ${appData.contract.endDate}</p>
      <p class="muted">Khách đã đồng ý, chờ admin xác nhận hợp đồng.</p>
    </article>
    <article class="mobile-card">
      <h3>Điện nước gần nhất</h3>
      <dl class="mobile-list">
        <div><dt>Điện</dt><dd>${appData.readings.electricity.usage} kWh</dd></div>
        <div><dt>Nước</dt><dd>${appData.readings.water.usage} m3</dd></div>
      </dl>
    </article>
    <article class="mobile-card">
      <h3>Máy lạnh không hoạt động</h3>
      ${badge("Đang xử lý")}
    </article>
  `);
};

const renderTenantContract = () => {
  const c = appData.contract;
  return renderTenantShell(`
    <header class="mobile-header"><h2>Hợp đồng của tôi</h2><p>${c.id}</p></header>
    <article class="mobile-card">
      <dl class="mobile-list">
        <div><dt>Phòng</dt><dd>${c.room}</dd></div>
        <div><dt>Ngày bắt đầu</dt><dd>${c.startDate}</dd></div>
        <div><dt>Ngày tính thuê</dt><dd>${c.rentStartDate}</dd></div>
        <div><dt>Ngày kết thúc</dt><dd>${c.endDate}</dd></div>
        <div><dt>Tiền thuê</dt><dd>${money(c.rent)}</dd></div>
        <div><dt>Tiền cọc</dt><dd>${money(c.deposit)}</dd></div>
        <div><dt>Giá điện</dt><dd>${money(c.electricityPrice)}/kWh</dd></div>
        <div><dt>Giá nước</dt><dd>${money(c.waterPrice)}/m3</dd></div>
        <div><dt>Điện bàn giao</dt><dd>${c.electricityStartIndex}</dd></div>
        <div><dt>Nước bàn giao</dt><dd>${c.waterStartIndex}</dd></div>
        <div><dt>Phí xe</dt><dd>${money(c.vehicleFee)}</dd></div>
      </dl>
      ${badge(c.status)}
      <p class="mobile-note">Khách thuê đồng ý trước, admin xác nhận sau để hợp đồng có hiệu lực.</p>
      <div class="mobile-actions">
        ${button("Đồng ý hợp đồng", "tenant-approve-contract")}
        ${button("Xem file PDF", "view-contract-pdf")}
        ${button("Tải xuống", "download-contract", "outline")}
      </div>
    </article>
  `);
};

const renderTenantUtilities = () => {
  const { electricity, water } = appData.readings;
  return renderTenantShell(`
    <header class="mobile-header"><h2>Điện nước tháng 05/2026</h2><p>Phòng ${appData.tenant.roomId}</p></header>
    <article class="mobile-card">
      <div class="panel-head mobile-panel-head">
        <div>
          <h3>Biểu đồ số điện nước</h3>
          <p class="muted">So sánh tiêu thụ từng tháng</p>
        </div>
        <button class="btn outline mini" data-action="export-utility-chart">Xuất</button>
      </div>
      ${renderDualBarChart(appData.utilityHistory, "electricityUsage", "waterUsage", "Điện kWh", "Nước m3")}
    </article>
    <article class="mobile-card">
      <h3>Điện</h3>
      <dl class="mobile-list">
        <div><dt>Chỉ số cũ</dt><dd>${electricity.previous}</dd></div>
        <div><dt>Chỉ số mới</dt><dd>${electricity.current}</dd></div>
        <div><dt>Tiêu thụ</dt><dd>${electricity.usage} kWh</dd></div>
        <div><dt>Đơn giá</dt><dd>${money(electricity.unitPrice)}/kWh</dd></div>
        <div><dt>Thành tiền</dt><dd>${money(electricity.amount)}</dd></div>
      </dl>
    </article>
    <article class="mobile-card">
      <h3>Nước</h3>
      <dl class="mobile-list">
        <div><dt>Chỉ số cũ</dt><dd>${water.previous}</dd></div>
        <div><dt>Chỉ số mới</dt><dd>${water.current}</dd></div>
        <div><dt>Tiêu thụ</dt><dd>${water.usage} m3</dd></div>
        <div><dt>Đơn giá</dt><dd>${money(water.unitPrice)}/m3</dd></div>
        <div><dt>Thành tiền</dt><dd>${money(water.amount)}</dd></div>
      </dl>
    </article>
    <article class="mobile-card">
      <h3>Bảng chi tiết điện nước từng tháng</h3>
      <div class="mobile-table">
        <table>
          <thead><tr><th>Tháng</th><th>Điện</th><th>Nước</th><th>Tiền</th></tr></thead>
          <tbody>
            ${appData.utilityHistory.map((item) => `
              <tr>
                <td>${item.month}</td>
                <td>${item.electricityUsage} kWh</td>
                <td>${item.waterUsage} m3</td>
                <td>${money(item.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
    <p class="mobile-note">Đơn giá được lấy theo hợp đồng đã ký.</p>
  `);
};

const renderTenantInvoices = () => {
  const paidHistory = tenantPayments().filter((payment) => payment.status === "Đã thanh toán");
  return renderTenantShell(`
    <header class="mobile-header"><h2>Hóa đơn</h2><p>Lịch sử thanh toán</p></header>
    <article class="mobile-card">
      <div class="panel-head mobile-panel-head">
        <div>
          <h3>Tiền trọ đã đóng</h3>
          <p class="muted">Biểu đồ theo từng tháng</p>
        </div>
        <button class="btn outline mini" data-action="export-rent-paid-chart">Xuất</button>
      </div>
      ${renderBarChart(paidHistory, "amount", "month", shortMoney, 120)}
    </article>
    <div class="mobile-filter"><button class="active">Tất cả</button><button>Chưa TT</button><button>Đã TT</button><button>Quá hạn</button></div>
    ${appData.invoices.filter((invoice) => invoice.tenant === appData.tenant.name).map((invoice) => `
      <article class="mobile-card invoice-card">
        <h3>Hóa đơn tháng ${invoice.month}</h3>
        <p>Phòng ${invoice.room}</p>
        <strong>${money(invoice.total)}</strong>
        ${badge(invoice.status)}
        <button class="btn outline full" data-mobile-invoice="${invoice.id}">Xem chi tiết</button>
      </article>
    `).join("")}
  `);
};

const renderTenantInvoiceDetail = () => {
  const invoice = findInvoice();
  return renderTenantShell(`
    <header class="mobile-header"><h2>Hóa đơn ${invoice.fromDate} - ${invoice.toDate}</h2><p>${invoice.id}</p></header>
    <article class="mobile-card">
      <dl class="mobile-list">
        <div><dt>Điện cũ / mới</dt><dd>${invoice.electricityOld} → ${invoice.electricityNew}</dd></div>
        <div><dt>Nước cũ / mới</dt><dd>${invoice.waterOld} → ${invoice.waterNew}</dd></div>
        <div><dt>Tiền phòng</dt><dd>${money(invoice.roomAmount)}</dd></div>
        <div><dt>Tiền điện</dt><dd>${money(invoice.electricity)}</dd></div>
        <div><dt>Tiền nước</dt><dd>${money(invoice.water)}</dd></div>
        <div><dt>Dịch vụ</dt><dd>${money(invoice.services)}</dd></div>
        <div><dt>Giảm giá</dt><dd>${money(invoice.discount)}</dd></div>
        <div><dt>Trễ hạn</dt><dd>${invoice.penaltyDays} ngày</dd></div>
        <div><dt>Phí phạt</dt><dd>${money(invoice.penalty)}</dd></div>
      </dl>
      <div class="mobile-total"><span>Tổng cộng</span><strong>${money(invoice.total)}</strong></div>
      <div class="mobile-actions column">
        ${button("Thanh toán ngay", "mobile-pay")}
        ${button("Tải hóa đơn PDF", "mobile-download-invoice", "outline")}
      </div>
    </article>
  `);
};

const renderTenantPayment = () => {
  const invoice = findInvoice();
  return renderTenantShell(`
    <header class="mobile-header"><h2>Thanh toán</h2><p>${invoice.id}</p></header>
    <section class="payment-view">
      <span>Tổng tiền cần thanh toán</span>
      <strong>${money(invoice.total)}</strong>
      <div class="pay-methods"><button class="active">QR ngân hàng</button><button>MoMo</button><button>VNPay</button><button>ZaloPay</button></div>
      <div class="qr-box">QR</div>
      <p>Ngân hàng VCB - 0123456789<br />Nội dung: ${invoice.id}</p>
      <button class="btn primary full" data-action="confirm-payment">Xác nhận thanh toán</button>
    </section>
  `);
};

const renderTenantRepairs = () => renderTenantShell(`
  <header class="mobile-header"><h2>Yêu cầu sửa chữa</h2><p>Gửi và theo dõi trạng thái</p></header>
  <article class="mobile-card">
    ${field("Phòng", appData.tenant.roomId)}
    ${selectField("Loại sự cố", "Máy lạnh", ["Điện", "Nước", "Internet", "Máy lạnh", "Cửa / khóa", "Vệ sinh", "Khác"])}
    <p class="mobile-note">Bạn chỉ cần mô tả sự cố và gửi ảnh. Admin sẽ phân độ ưu tiên sau khi tiếp nhận.</p>
    <label class="field"><span>Mô tả</span><textarea>Máy lạnh không hoạt động</textarea></label>
    <div class="upload-box compact">Upload nhiều ảnh</div>
    <button class="btn primary full" data-action="send-repair">Gửi yêu cầu</button>
  </article>
  <h3 class="mobile-section-title">Lịch sử yêu cầu</h3>
  ${sortedRepairs().filter((repair) => repair.sender === appData.tenant.name).map((repair) => `
    <article class="mobile-card compact-card">
      <h3>${repair.category} không hoạt động</h3>
      <p>Ngày gửi: ${repair.date}</p>
      <p class="muted">Ưu tiên do admin đặt: ${repair.priority}</p>
      ${badge(repair.status)}
    </article>
  `).join("")}
`);

const renderTenantAccount = () => renderTenantShell(`
  <header class="mobile-header center">
    <div class="profile-avatar">A</div>
    <h2>${appData.tenant.name}</h2>
    <p>${appData.tenant.phone} - Phòng ${appData.tenant.roomId}</p>
  </header>
  <div class="account-menu">
    <button>Thông tin cá nhân</button>
    <button data-tenant-nav="contract">Hợp đồng</button>
    <button data-tenant-nav="invoices">Lịch sử thanh toán</button>
    <button>Đổi mật khẩu</button>
    <button data-logout class="danger-text">Đăng xuất</button>
  </div>
`);

const renderTenant = () => {
  const pages = {
    home: renderTenantHome,
    contract: renderTenantContract,
    utilities: renderTenantUtilities,
    invoices: renderTenantInvoices,
    "invoice-detail": renderTenantInvoiceDetail,
    payment: renderTenantPayment,
    repairs: renderTenantRepairs,
    account: renderTenantAccount
  };
  return pages[state.tenantPage]?.() || renderTenantHome();
};

const render = () => {
  if (state.role === "admin") app.innerHTML = renderAdmin();
  else if (state.role === "tenant") app.innerHTML = renderTenant();
  else app.innerHTML = renderLogin();
};

const loadApiData = async () => {
  try {
    const response = await fetch(`${API_URL}/api/app-data`);
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = await response.json();
    appData = payload.data || fallbackAppData;
    setState({ apiStatus: "Đã kết nối API + PostgreSQL" });
  } catch (error) {
    appData = fallbackAppData;
    setState({ apiStatus: "Đang dùng dữ liệu mẫu" });
  }
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

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!target?.dataset?.calcField) return;
  state = { ...state, [target.dataset.calcField]: target.value };
  updateInvoiceCalcOutputs();
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!target?.dataset?.calcField) return;
  state = { ...state, [target.dataset.calcField]: target.value };
  updateInvoiceCalcOutputs();
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("button, tr");
  if (!target) return;

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

  if (target.dataset.fillLogin) {
    document.querySelector("#login-email").value = target.dataset.fillLogin === "admin" ? "admin@trohub.vn" : "tenant@trohub.vn";
    document.querySelectorAll(".role-switch button").forEach((btn) => btn.classList.toggle("active", btn === target));
    return;
  }

  if (target.dataset.login !== undefined) {
    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value.trim();
    
    fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          // Thành công, map role sang chữ thường cho UI cũ của Web
          const role = data.user.role === "TENANT" ? "tenant" : "admin";
          setState({ role, adminPage: "dashboard", tenantPage: "home", user: data.user });
        } else {
          showToast(data.message || "Sai tài khoản hoặc mật khẩu");
        }
      })
      .catch(() => showToast("Lỗi kết nối Server"));
    return;
  }

  if (target.dataset.logout !== undefined) {
    setState({ role: "guest" });
    return;
  }

  if (target.dataset.adminNav) {
    setState({ adminPage: target.dataset.adminNav });
    return;
  }

  if (target.dataset.tenantNav) {
    setState({ tenantPage: target.dataset.tenantNav });
    return;
  }

  if (target.dataset.roomDetail) {
    setState({ selectedRoom: target.dataset.roomDetail, adminPage: "room-detail" });
    return;
  }

  if (target.dataset.invoiceDetail) {
    setState({ selectedInvoice: target.dataset.invoiceDetail, adminPage: "invoice-detail" });
    return;
  }

  if (target.dataset.mobileInvoice) {
    setState({ selectedInvoice: target.dataset.mobileInvoice, tenantPage: "invoice-detail" });
    return;
  }

  const action = target.dataset.action;
  if (!action) return;
  if (action === "export-month-invoice") {
    const calc = calculateInvoice();
    const invoiceRoom = findInvoice().room;
    const roomId = appData.rooms.find(r => r.name === invoiceRoom || r.code === invoiceRoom || r.id === invoiceRoom)?.id || "R001";
    
    const body = {
      roomId,
      tenantUserId: "U005",
      fromDate: state.createFrom ? state.createFrom.split("/").reverse().join("-") : "2026-05-01",
      toDate: state.createTo ? state.createTo.split("/").reverse().join("-") : "2026-05-31",
      dueDate: state.createCheckDate ? state.createCheckDate.split("/").reverse().join("-") : "2026-06-05",
      roomAmount: numberValue(state.calcRoomAmount),
      electricityAmount: calc.electricityAmount,
      waterAmount: calc.waterAmount,
      serviceAmount: numberValue(state.calcServiceAmount),
      discountAmount: numberValue(state.calcDiscount),
      status: state.calcPaidStatus === "Đã thanh toán" ? "PAID" : "UNPAID",
      meterReadings: [
        {
          type: "ELECTRICITY",
          previousIndex: Number(state.calcElectricityOld),
          currentIndex: Number(state.calcElectricityNew),
          unitPrice: Number(state.calcElectricityPrice)
        },
        {
          type: "WATER",
          previousIndex: Number(state.calcWaterOld),
          currentIndex: Number(state.calcWaterNew),
          unitPrice: Number(state.calcWaterPrice)
        }
      ]
    };
    
    fetch(`${API_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(() => {
      showToast(`Đã xuất hóa đơn tháng này: ${money(calc.total)} (Lưu thật)`);
      state = { ...state, activeCalendar: "", adminPage: "invoices" };
      loadApiData();
    }).catch(() => showToast("Lỗi khi gọi API"));
    return;
  }

  if (action === "save-room") {
    const formGrid = target.closest(".card").querySelector(".form-grid");
    const inputs = formGrid.querySelectorAll("input, select");
    const body = {
      code: inputs[0]?.value || `R${Date.now()}`,
      name: inputs[1]?.value || "Phòng Mới",
      areaM2: inputs[2]?.value || 0,
      rentPrice: Number(String(inputs[3]?.value).replace(/\D/g, "")) || 0,
      depositAmount: Number(String(inputs[4]?.value).replace(/\D/g, "")) || 0,
      maxOccupants: inputs[5]?.value || 1,
      status: inputs[6]?.value === "Đang thuê" ? "OCCUPIED" : (inputs[6]?.value === "Bảo trì" ? "MAINTENANCE" : "AVAILABLE")
    };
    
    fetch(`${API_URL}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(() => {
      showToast("Đã lưu thông tin phòng (Lưu thật)");
      state = { ...state, adminPage: "rooms" };
      loadApiData();
    }).catch(() => showToast("Lỗi khi gọi API"));
    return;
  }
  const messages = {
    "add-room": "Đã mở form thêm phòng",
    "create-invoice": "Đã tạo hóa đơn nháp",
    "draft-invoice": "Đã lưu nháp hóa đơn",
    "save-created-invoice": "Đã lưu hóa đơn theo khoảng ngày",
    "export-month-invoice": "Đã xuất hóa đơn tháng này theo chỉ số điện nước",
    "go-repairs": "Đang mở yêu cầu sửa chữa",
    "edit-room": "Đã mở màn hình sửa phòng",
    "save-room": "Đã lưu thông tin phòng",
    "cancel-room": "Đã hủy thao tác",
    "add-tenant": "Đã thêm khách thuê mẫu (Đang xử lý...)",
    "draft-contract": "Đã lưu nháp hợp đồng",
    "create-contract": "Đã tạo hợp đồng (Đang xử lý...)",
    "export-pdf": "Đã xuất PDF mẫu",
    "send-contract": "Đã gửi hợp đồng cho khách thuê",
    "admin-approve-contract": "Admin đã xác nhận hợp đồng",
    "tenant-approve-contract": "Khách thuê đã đồng ý hợp đồng",
    "export-excel": "Đã xuất Excel mẫu",
    "export-payment-excel": "Đã xuất Excel lịch sử thanh toán",
    "export-revenue-chart": "Đã xuất biểu đồ doanh thu",
    "export-invoice-pdf": "Đã xuất hóa đơn PDF",
    "mark-paid": "Đã đánh dấu hóa đơn đã thanh toán",
    "send-reminder": "Đã gửi nhắc thanh toán",
    "save-repair": "Đã lưu cập nhật sửa chữa",
    "save-settings": "Đã lưu cài đặt",
    "view-contract-pdf": "Đã mở file hợp đồng PDF",
    "download-contract": "Đã tải hợp đồng mẫu",
    "mobile-pay": "Đang mở thanh toán",
    "mobile-download-invoice": "Đã tải hóa đơn PDF",
    "confirm-payment": "Đã xác nhận thanh toán",
    "send-repair": "Đã gửi yêu cầu sửa chữa",
    "export-rent-paid-chart": "Đã xuất biểu đồ tiền trọ đã đóng",
    "export-utility-chart": "Đã xuất biểu đồ điện nước",
    "apply-dashboard-range": "Đã áp dụng mốc thời gian",
    "reset-dashboard-range": "Đã đặt lại mốc thời gian",
    "apply-invoice-filter": "Đã lọc hóa đơn theo ngày",
    "reset-invoice-filter": "Đã đặt lại bộ lọc hóa đơn"
  };
  if (action === "go-repairs") setState({ adminPage: "repairs" });
  else if (action === "edit-room" || action === "add-room") setState({ adminPage: "room-form" });
  else if (action === "create-invoice") setState({ adminPage: "invoice-create" });
  else if (action === "reset-dashboard-range") setState({ dashboardFrom: "01/05/2026", dashboardTo: "31/05/2026", activeCalendar: "" });
  else if (action === "reset-invoice-filter") setState({ invoiceFrom: "01/05/2026", invoiceTo: "31/05/2026", activeCalendar: "" });
  else if (action === "apply-dashboard-range" || action === "apply-invoice-filter") setState({ activeCalendar: "" });
  else if (action === "mobile-pay") setState({ tenantPage: "payment" });
  
  if (action === "add-tenant") {
    fetch(`${API_URL}/api/tenants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Khách Thuê Tự Động" }) })
      .then(() => showToast("Đã tạo tài khoản khách mới vào CSDL"));
    return;
  }
  if (action === "create-contract") {
    fetch(`${API_URL}/api/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: "R001", tenantUserId: "U002" }) })
      .then(() => showToast("Đã lưu Hợp đồng cho Phòng 101 vào CSDL"));
    return;
  }
  
  showToast(messages[action] || "Đã thực hiện thao tác");
});

render();
loadApiData();
