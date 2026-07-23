export const API_BASE_URL = "/api";

type ApiError = Error & {
  code?: string;
  field?: string;
  status?: number;
};

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("trohub_token") : null;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const connectionError = new Error(
      "Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra Backend và thử lại.",
    ) as ApiError;
    connectionError.code = "AUTH_SERVER_UNAVAILABLE";
    connectionError.status = response.status;
    throw connectionError;
  }

  const data = await response.json();
  if (!response.ok) {
    const apiError = new Error(
      data.message || "Có lỗi xảy ra khi kết nối API.",
    ) as ApiError;
    apiError.code = data.code;
    apiError.field = data.field;
    apiError.status = response.status;
    throw apiError;
  }
  return data;
};
