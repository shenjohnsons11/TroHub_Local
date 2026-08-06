import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  formatCCCD,
  formatNumberInput,
  formatPhone,
  unformatDigits,
  unformatNumber,
} from "./formatters"

export {
  formatCCCD,
  formatCurrency,
  formatNumberInput,
  formatPhone,
  unformatDigits,
  unformatNumber,
} from "./formatters"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyInput(value: string) {
  return formatNumberInput(value);
}

export function parseFormattedNumber(value: string) {
  return unformatNumber(value);
}

export function formatPhoneInput(value: string) {
  return formatPhone(value);
}

export function formatIdCardInput(value: string) {
  return formatCCCD(value);
}

export function parseFormattedString(value: string) {
  return unformatDigits(value);
}

export function getRealtimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Chào buổi sáng.";
  } else if (hour >= 12 && hour < 18) {
    return "Chào buổi chiều.";
  } else {
    return "Chào buổi tối.";
  }
}

export function getFormattedDateWidget() {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

export function getRealtimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Chào buổi sáng.";
  } else if (hour >= 12 && hour < 18) {
    return "Chào buổi chiều.";
  } else {
    return "Chào buổi tối.";
  }
}

export function getFormattedDateWidget() {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}
