import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "../types/UserProfile";
import { authService } from "./authService";
import { apiClient } from "./apiClient";

const PROFILE_KEY = "TROHUB_USER_PROFILE";

type ApiUser = {
  id: string;
  username: string;
  fullName: string;
  phone?: string;
  email?: string;
  idCard?: string;
  role: number;
  status?: number;
};

type GetMeResponse = {
  success: boolean;
  user: ApiUser;
  message?: string;
};

type UpdateMeResponse = {
  success: boolean;
  message: string;
  user: ApiUser;
};

const defaultProfile: UserProfile = {
  id: "user_001",
  fullName: "Nguyễn Văn A",
  phone: "0901234567",
  email: "nguyenvana@gmail.com",
  cccd: "012345678901",
  room: "A101",
  startDate: "01/01/2026",
  role: 2,
};

const mapApiUserToProfile = (user: ApiUser): UserProfile => {
  return {
    id: user.id,
    fullName: user.fullName || "",
    phone: user.phone || user.username || "",
    email: user.email || "",
    cccd: user.idCard || "",
    room: "",
    startDate: "",
    role: user.role || 2,
  };
};

export const userService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.get<GetMeResponse>("/auth/me", token);

      if (!response.success || !response.user) {
        throw new Error(response.message || "Không lấy được thông tin cá nhân");
      }

      const profile = mapApiUserToProfile(response.user);

      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

      return profile;
    } catch (error) {
      console.log("Lỗi lấy thông tin cá nhân từ API:", error);

      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);

      if (savedProfile) {
        return JSON.parse(savedProfile);
      }

      return defaultProfile;
    }
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await apiClient.put<UpdateMeResponse>(
        "/auth/me",
        {
          fullName: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          idCard: profile.cccd,
        },
        token
      );

      if (!response.success || !response.user) {
        throw new Error(response.message || "Cập nhật thông tin thất bại");
      }

      const updatedProfile = mapApiUserToProfile(response.user);

      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));

      return updatedProfile;
    } catch (error) {
      console.log("Lỗi cập nhật thông tin cá nhân:", error);
      throw error;
    }
  },
};