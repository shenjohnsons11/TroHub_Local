import { API_BASE_URL } from "../constants/api";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

type ApiOptions = {
  method?: RequestMethod;
  body?: unknown;
  token?: string | null;
};

export const apiClient = {
  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, token } = options;

    try {
      const url = `${API_BASE_URL}${endpoint}`;

      //console.log("API URL:", url);
      //console.log("API METHOD:", method);
      //console.log("API BODY:", body);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

     // console.log("API STATUS:", response.status);
      //console.log("API RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Có lỗi xảy ra khi gọi API");
      }

      return data as T;
    } catch (error) {
      console.log("API error:", error);
      throw error;
    }
  },

  get<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, {
      method: "GET",
      token,
    });
  },

  post<T>(endpoint: string, body?: unknown, token?: string | null) {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
      token,
    });
  },

  put<T>(endpoint: string, body?: unknown, token?: string | null) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body,
      token,
    });
  },

  delete<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, {
      method: "DELETE",
      token,
    });
  },
};