import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = "vi" | "en";
const storageKey = "trohub_language";
const copy = {
  vi: { login: "Đăng nhập", register: "Đăng ký Người thuê", language: "Ngôn ngữ", all: "Tất cả", floor: "Tầng", openMaps: "🗺️ Mở Google Maps", property: "🏠 Nhà trọ TroHub", loginDescription: "Sử dụng số điện thoại hoặc Email để bắt đầu.", registerDescription: "Điền các thông tin để tự tạo tài khoản Người thuê.", fullName: "Họ và tên", phoneOrEmail: "Số điện thoại hoặc Email", phone: "Số điện thoại", email: "Email (Tên đăng nhập)", idCard: "Số CCCD (12 số)", password: "Mật khẩu", signUpNow: "Đăng ký ngay", forgotPassword: "Quên mật khẩu?", backToLogin: "Quay lại Đăng nhập", tenantRegister: "Đăng ký tài khoản Người thuê", propertyAddress: "Địa chỉ nhà trọ", rooms: "Danh sách phòng trọ" },
  en: { login: "Sign in", register: "Tenant registration", language: "Language", all: "All", floor: "Floor", openMaps: "🗺️ Open Google Maps", property: "🏠 TroHub property", loginDescription: "Use your phone number or email to get started.", registerDescription: "Fill in the details to create a tenant account.", fullName: "Full name", phoneOrEmail: "Phone number or email", phone: "Phone number", email: "Email (username)", idCard: "National ID (12 digits)", password: "Password", signUpNow: "Register now", forgotPassword: "Forgot password?", backToLogin: "Back to sign in", tenantRegister: "Create a tenant account", propertyAddress: "Property address", rooms: "Room list" },
} as const;

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: keyof typeof copy.vi) => string };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("vi");
  useEffect(() => { void AsyncStorage.getItem(storageKey).then((stored) => { if (stored === "vi" || stored === "en") setLanguageState(stored); }).catch(() => undefined); }, []);
  const setLanguage = useCallback((next: Language) => { setLanguageState(next); void AsyncStorage.setItem(storageKey, next).catch(() => undefined); }, []);
  const t = useCallback((key: keyof typeof copy.vi) => copy[language][key] || copy.vi[key], [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
