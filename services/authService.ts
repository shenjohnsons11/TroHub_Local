import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";

const LOGIN_KEY = "TROHUB_IS_LOGGED_IN";
const TOKEN_KEY = "TROHUB_ACCESS_TOKEN";
const USER_KEY = "TROHUB_AUTH_USER";

type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: number;
  mustChangePassword?: boolean;
};

type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export const authService = {
  async checkLogin(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const loggedIn = await AsyncStorage.getItem(LOGIN_KEY);

      return loggedIn === "true" && !!token;
    } catch (error) {
      console.log("Lỗi kiểm tra đăng nhập:", error);
      return false;
    }
  },

  async registerTenant(tenantData: { fullName: string; phone: string; email: string; idCard: string; password: string }): Promise<void> {
    try {
      const mockStr = await AsyncStorage.getItem("@mock_tenants");
      const mockTenants = mockStr ? JSON.parse(mockStr) : [];
      
      if (mockTenants.some((u: any) => u.phone === tenantData.phone || u.email === tenantData.email)) {
        throw new Error("Số điện thoại hoặc Email đã được đăng ký!");
      }

      const newTenant = {
        id: "mock_tenant_" + Math.random().toString(36).substring(2, 9),
        username: tenantData.phone,
        fullName: tenantData.fullName,
        phone: tenantData.phone,
        email: tenantData.email,
        idCard: tenantData.idCard,
        password: tenantData.password,
        role: 2,
      };

      mockTenants.push(newTenant);
      await AsyncStorage.setItem("@mock_tenants", JSON.stringify(mockTenants));
    } catch (error) {
      console.log("Lỗi đăng ký tenant:", error);
      throw error;
    }
  },

  async login(identifier: string, password: string): Promise<boolean> {
    try {
      // Check mock tenants first
      const mockStr = await AsyncStorage.getItem("@mock_tenants");
      if (mockStr) {
        const mockTenants = JSON.parse(mockStr);
        const matched = mockTenants.find(
          (u: any) =>
            (u.phone === identifier || u.email === identifier || u.username === identifier) &&
            u.password === password
        );
        if (matched) {
          const user = {
            id: matched.id,
            username: matched.username,
            fullName: matched.fullName,
            role: 2,
            mustChangePassword: false,
          };
          await AsyncStorage.setItem(TOKEN_KEY, "mock-token-" + matched.id);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
          await AsyncStorage.setItem(LOGIN_KEY, "true");
          return false;
        }
      }

      const response = await apiClient.post<LoginResponse>("/auth/login", {
        identifier,
        password,
      });

      if (!response.success || !response.token) {
        throw new Error(response.message || "Đăng nhập thất bại");
      }

      if (response.user.role !== 1 && response.user.role !== 2) {
        throw new Error("Tài khoản không có quyền truy cập ứng dụng");
      }

      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      await AsyncStorage.setItem(LOGIN_KEY, "true");

      return !!response.user.mustChangePassword;
    } catch (error) {
      console.log("Lỗi đăng nhập:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOGIN_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.log("Lỗi đăng xuất:", error);
      throw error;
    }
  },

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const token = await this.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.put<{ success: boolean; message: string }>("/auth/change-password", {
        currentPassword: oldPassword,
        newPassword,
      }, token);

      if (!response.success) {
        throw new Error(response.message || "Đổi mật khẩu thất bại");
      }

      return true;
    } catch (error) {
      console.log("Lỗi đổi mật khẩu:", error);
      throw error;
    }
  },

  async requestPasswordReset(identifier: string): Promise<string> {
    const response = await apiClient.post<{ success: boolean; message: string }>("/auth/forgot-password", {
      identifier,
    });
    return response.message;
  },

  async verifyPasswordResetOtp(identifier: string, otp: string): Promise<string> {
    const response = await apiClient.post<{ success: boolean; resetToken: string }>("/auth/verify-reset-otp", {
      identifier,
      otp,
    });
    return response.resetToken;
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", { resetToken, newPassword });
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.log("Lỗi lấy token:", error);
      return null;
    }
  },

  async getAuthUser(): Promise<AuthUser | null> {
    try {
      const user = await AsyncStorage.getItem(USER_KEY);

      if (!user) {
        return null;
      }

      return JSON.parse(user);
    } catch (error) {
      console.log("Lỗi lấy user đăng nhập:", error);
      return null;
    }
  },
};
