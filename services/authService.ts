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

  async register(registerData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    idCard: string;
  }): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>("/auth/register", {
        username: registerData.email, // Dùng email làm tên đăng nhập
        password: registerData.password,
        fullName: registerData.fullName,
        phone: registerData.phone,
        email: registerData.email,
        idCard: registerData.idCard,
        role: 2, // Mặc định khách thuê tự đăng ký
      });

      if (!response.success) {
        throw new Error(response.message || "Đăng ký thất bại");
      }

      return true;
    } catch (error) {
      console.log("Lỗi đăng ký:", error);
      throw error;
    }
  },

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username: email, // Dùng email làm tên đăng nhập
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

      return true;
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

      console.log("Đổi mật khẩu giả lập:", {
        oldPassword,
        newPassword,
      });

      return true;
    } catch (error) {
      console.log("Lỗi đổi mật khẩu:", error);
      throw error;
    }
  },

  async forgotPassword(phone: string): Promise<boolean> {
    try {
      console.log("Quên mật khẩu giả lập:", {
        phone,
      });

      return true;
    } catch (error) {
      console.log("Lỗi quên mật khẩu:", error);
      throw error;
    }
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