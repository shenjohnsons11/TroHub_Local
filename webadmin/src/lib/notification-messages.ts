type ApiLikeError = {
  code?: string;
  message?: string;
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  METER_INDEX_REGRESSION:
    "Chỉ số mới không được thấp hơn chỉ số cũ. Vui lòng kiểm tra lại điện và nước.",
  INVALID_CALCULATION_INPUT:
    "Số liệu điện, nước hoặc đơn giá chưa hợp lệ. Vui lòng kiểm tra lại.",
  SERVICE_CODE_EXISTS: "Mã dịch vụ đã tồn tại. Vui lòng chọn mã khác.",
  ADMIN_REQUIRED: "Tính năng này chỉ dành cho Chủ trọ.",
  AUTH_REQUIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
};

export function getNotificationMessage(
  error: unknown,
  fallback = "Không thể hoàn tất thao tác. Vui lòng thử lại.",
) {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const apiError = error as ApiLikeError;
    if (apiError.code && FRIENDLY_MESSAGES[apiError.code]) {
      return FRIENDLY_MESSAGES[apiError.code];
    }
    if (apiError.message) return apiError.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
