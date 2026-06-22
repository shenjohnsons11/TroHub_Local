import { API_CONFIG } from "./api-config.js?v=13";

/**
 * Hàm gọi API chung tự động đính kèm Token
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem("trohub_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || data.error || "Lỗi kết nối đến Server");
    }

    // Tự động bóc tách lớp { success: true, data: [...] } của Backend mới
    if (data && data.success !== undefined && data.data !== undefined) {
      return data.data;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
};

/**
 * SDK giao tiếp API đã được Map dữ liệu chuẩn
 */
export const api = {
  auth: {
    login: (email, password) => fetchAPI(API_CONFIG.ENDPOINTS.login, {
      method: "POST",
      body: JSON.stringify({ username: email, password })
    }),
    register: (payload) => fetchAPI(API_CONFIG.ENDPOINTS.register, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  },
  dashboard: {
    getStats: () => fetchAPI(API_CONFIG.ENDPOINTS.dashboardStats),
  },
  me: {
    get: async () => {
      try {
        const data = await fetchAPI(API_CONFIG.ENDPOINTS.me);
        // data.data is handled by fetchAPI
        return Array.isArray(data) ? data[0] : data;
      } catch (e) {
        console.warn("Tenant portal not fully initialized:", e);
        return {
          room: null,
          stats: { unpaidInvoiceCount: 0, unpaidTotal: 0, paidTotal: 0, penaltyTotal: 0 },
          contract: null,
          invoices: [],
          repairs: []
        };
      }
    },
    createRepair: (payload) => fetchAPI(`${API_CONFIG.ENDPOINTS.me}/repairs`, { method: "POST", body: JSON.stringify(payload) }),
    deleteRepair: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.me}/repairs/${id}`, { method: "DELETE" }),
    payInvoice: (id, payload = {}) => fetchAPI(`${API_CONFIG.ENDPOINTS.me}/pay-invoice/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    signContract: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.me}/sign-contract/${id}`, { method: "PUT", body: JSON.stringify({}) }),
    requestTerminate: (contractId) => fetchAPI(`${API_CONFIG.ENDPOINTS.me}/request-terminate/${contractId}`, { method: "PUT", body: JSON.stringify({}) }),
  },
  rooms: {
    getAll: async () => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.rooms);
      return Array.isArray(data) ? data.map(API_CONFIG.MAP_ROOM) : [];
    },
    getById: async (id) => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.rooms}/${id}`);
      return API_CONFIG.MAP_ROOM(data);
    },
    create: async (payload) => {
      const landlord = JSON.parse(localStorage.getItem("trohub_user") || "{}");
      const mapped = { ...API_CONFIG.MAP_ROOM_PAYLOAD(payload), landlordId: landlord.id };
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.rooms, { method: "POST", body: JSON.stringify(mapped) });
      return API_CONFIG.MAP_ROOM(data);
    },
    update: async (id, payload) => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.rooms}/${id}`, { method: "PUT", body: JSON.stringify(API_CONFIG.MAP_ROOM_PAYLOAD(payload)) });
      return API_CONFIG.MAP_ROOM(data);
    },
    delete: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.rooms}/${id}`, { method: "DELETE" }),
  },
  tenants: {
    getAll: async () => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.tenants);
      return Array.isArray(data) ? data.map(API_CONFIG.MAP_TENANT) : [];
    },
    create: async (payload) => {
      const mapped = API_CONFIG.MAP_TENANT_PAYLOAD(payload);
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.tenants, { method: "POST", body: JSON.stringify(mapped) });
      return API_CONFIG.MAP_TENANT(data);
    },
    update: async (id, payload) => {
      const mapped = API_CONFIG.MAP_TENANT_PAYLOAD(payload);
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.tenants}/${id}`, { method: "PUT", body: JSON.stringify(mapped) });
      return API_CONFIG.MAP_TENANT(data);
    },
    // Ngừng thuê = PUT /tenants/:id/terminate (khớp backend)
    stop: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.tenants}/${id}/terminate`, { method: "PUT", body: JSON.stringify({}) }),
  },
  contracts: {
    getAll: async () => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.contracts);
      return Array.isArray(data) ? data.map(API_CONFIG.MAP_CONTRACT) : [];
    },
    getHistory: async () => {
      try {
        const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.contracts}/history`);
        return Array.isArray(data) ? data.map(API_CONFIG.MAP_CONTRACT) : [];
      } catch (e) {
        return [];
      }
    },
    create: (payload) => fetchAPI(API_CONFIG.ENDPOINTS.contracts, { method: "POST", body: JSON.stringify(API_CONFIG.MAP_CONTRACT_PAYLOAD(payload)) }),
    update: (id, payload) => fetchAPI(`${API_CONFIG.ENDPOINTS.contracts}/${id}`, { method: "PUT", body: JSON.stringify(API_CONFIG.MAP_CONTRACT_PAYLOAD(payload)) }),
    // Admin xác nhận hợp đồng (status 4 → 1)
    confirm: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.contracts}/${id}/confirm`, { method: "PUT", body: JSON.stringify({}) }),
  },
  invoices: {
    getAll: async () => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.invoices);
      return Array.isArray(data) ? data.map(API_CONFIG.MAP_INVOICE) : [];
    },
    getBulkPreview: async () => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.invoices}/bulk-preview`);
      return Array.isArray(data) ? data : [];
    },
    bulkCreate: async (payload) => {
      return fetchAPI(`${API_CONFIG.ENDPOINTS.invoices}/bulk`, { method: "POST", body: JSON.stringify(payload) });
    },
    create: async (payload) => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.invoices, { method: "POST", body: JSON.stringify(payload) });
      return API_CONFIG.MAP_INVOICE(data);
    },
    update: async (id, payload) => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.invoices}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      return API_CONFIG.MAP_INVOICE(data);
    },
    markPaid: async (id, payload = {}) => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.invoices}/${id}/pay`, { method: "PUT", body: JSON.stringify(payload) });
      return API_CONFIG.MAP_INVOICE(data.invoice || data);
    },
    remind: async (id) => {
      return await fetchAPI(`${API_CONFIG.ENDPOINTS.invoices}/${id}/remind`, { method: "PUT", body: JSON.stringify({}) });
    },
  },
  payments: {
    getAll: async () => {
      try {
        const data = await fetchAPI(API_CONFIG.ENDPOINTS.payments);
        return Array.isArray(data) ? data.map(API_CONFIG.MAP_PAYMENT) : [];
      } catch (e) {
        return [];
      }
    },
  },
  repairs: {
    getAll: async () => {
      const data = await fetchAPI(API_CONFIG.ENDPOINTS.repairs);
      return Array.isArray(data) ? data.map(API_CONFIG.MAP_REPAIR) : [];
    },
    update: async (id, payload) => {
      const data = await fetchAPI(`${API_CONFIG.ENDPOINTS.repairs}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      return API_CONFIG.MAP_REPAIR(data);
    },
    delete: (id) => fetchAPI(`${API_CONFIG.ENDPOINTS.repairs}/${id}`, { method: "DELETE" })
  },
  settings: {
    get: async () => {
      try {
        const data = await fetchAPI(API_CONFIG.ENDPOINTS.settings);
        return data;
      } catch (e) {
        return { name: "Chủ trọ", phone: "", email: "" };
      }
    },
    update: (payload) => fetchAPI(API_CONFIG.ENDPOINTS.settings, { method: "PUT", body: JSON.stringify(payload) })
  }
};
