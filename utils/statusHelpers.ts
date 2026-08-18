/**
 * Helper to map any status to the active locale translation for Mobile App
 */
export function getStatusText(
  type: "invoice" | "contract" | "room" | "repair" | "priority",
  status: any,
  t: (key: string, params?: any) => string
): string {
  if (status === null || status === undefined) return t("common.unspecified", { defaultValue: "Chưa xác định" });

  const str = String(status).trim().toLowerCase();

  if (type === "invoice") {
    if (str === "0" || str === "draft" || str === "nháp") return t("mobile.invoices.draft");
    if (str === "1" || str === "unpaid" || str === "chưa thanh toán") return t("mobile.invoices.unpaid");
    if (str === "2" || str === "paid" || str === "đã thanh toán") return t("mobile.invoices.paid");
    if (str === "3" || str === "overdue" || str === "quá hạn") return t("mobile.invoices.overdue");
    if (str === "4" || str === "settled" || str === "đã gộp quyết toán") return t("mobile.invoices.settled");
    return String(status);
  }

  if (type === "contract") {
    if (str === "0" || str === "draft" || str === "nháp") return t("mobile.contractsMobile.draft");
    if (str === "1" || str === "active" || str === "đang hiệu lực") return t("mobile.contractsMobile.active");
    if (str === "2" || str === "expired" || str === "đã hết hạn") return t("mobile.contractsMobile.expired");
    if (str === "3" || str === "terminated" || str === "đã thanh lý") return t("mobile.contractsMobile.cancelled");
    if (str === "4" || str === "pending_tenant" || str === "chờ khách ký") return t("mobile.contractsMobile.pendingTenant");
    if (str === "5" || str === "pending_owner" || str === "chờ chủ duyệt") return t("mobile.contractsMobile.pendingOwner");
    if (str === "6" || str === "pending_checkout" || str === "chờ duyệt trả phòng") return t("mobile.contractsMobile.pendingCheckout");
    if (str === "7" || str === "checked_out" || str === "đã trả phòng") return t("mobile.contractsMobile.checkedOut");
    return String(status);
  }

  if (type === "room") {
    if (str === "0" || str === "available" || str === "trống" || str === "còn trống") return t("mobile.rooms.available");
    if (str === "1" || str === "rented" || str === "occupied" || str === "đang thuê") return t("mobile.rooms.occupied");
    if (str === "2" || str === "maintenance" || str === "đang bảo trì" || str === "bảo trì" || str === "đang sửa") return t("mobile.rooms.repair");
    return String(status);
  }

  if (type === "repair") {
    if (str === "0" || str === "pending" || str === "chờ tiếp nhận" || str === "chờ xử lý") return t("mobile.repairs.pending");
    if (str === "1" || str === "processing" || str === "repairing" || str === "đang xử lý" || str === "đang sửa") return t("mobile.repairs.repairing");
    if (str === "2" || str === "completed" || str === "done" || str === "đã hoàn thành" || str === "hoàn tất") return t("mobile.repairs.done");
    if (str === "3" || str === "cancelled" || str === "đã hủy") return t("mobile.repairs.cancelled");
    return String(status);
  }

  if (type === "priority") {
    if (str === "low" || str === "thấp") return t("mobile.repairs.low");
    if (str === "medium" || str === "trung bình" || str === "vừa") return t("mobile.repairs.medium");
    if (str === "urgent" || str === "khẩn cấp" || str === "gấp") return t("mobile.repairs.urgent");
    return String(status);
  }

  return String(status);
}
