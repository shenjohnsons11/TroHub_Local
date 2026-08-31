/**
 * Helper to map any status (whether Vietnamese, English, or Code) to the active locale translation
 */
export function getStatusText(
  type: "invoice" | "contract" | "room" | "repair" | "payment" | "priority",
  status: any,
  t: (key: string, params?: any) => string
): string {
  if (status === null || status === undefined) return t("common.unspecified");

  const str = String(status).trim().toLowerCase();

  if (type === "invoice") {
    if (str === "0" || str === "draft" || str === "nháp") return t("statusMap.invoice.draft");
    if (str === "1" || str === "unpaid" || str === "chưa thanh toán") return t("statusMap.invoice.unpaid");
    if (str === "2" || str === "paid" || str === "đã thanh toán") return t("statusMap.invoice.paid");
    if (str === "3" || str === "overdue" || str === "quá hạn") return t("statusMap.invoice.overdue");
    if (str === "4" || str === "settled" || str === "đã gộp quyết toán") return t("statusMap.invoice.settled");
    return status;
  }

  if (type === "contract") {
    if (str === "0" || str === "draft" || str === "nháp") return t("statusMap.contract.draft");
    if (str === "1" || str === "active" || str === "đang hiệu lực") return t("statusMap.contract.active");
    if (str === "2" || str === "expired" || str === "đã hết hạn") return t("statusMap.contract.expired");
    if (str === "3" || str === "terminated" || str === "đã thanh lý") return t("statusMap.contract.terminated");
    if (str === "4" || str === "reserved" || str === "đã cọc / chờ bàn giao") return t("statusMap.contract.reserved");
    if (str === "5" || str === "pending" || str === "pending_tenant" || str === "chờ khách ký") return t("statusMap.contract.pendingTenant");
    if (str === "pending_owner" || str === "chờ chủ duyệt") return t("statusMap.contract.pendingOwner");
    if (str === "pending_checkout" || str === "chờ duyệt trả phòng") return t("statusMap.contract.pendingCheckout");
    if (str === "checked_out" || str === "đã trả phòng") return t("statusMap.contract.checkedOut");
    if (str === "cancelled" || str === "đã hủy") return t("statusMap.contract.cancelled");
    return status;
  }

  if (type === "room") {
    if (str === "0" || str === "available" || str === "trống" || str === "còn trống") return t("statusMap.room.available");
    if (str === "1" || str === "rented" || str === "occupied" || str === "đang thuê") return t("statusMap.room.rented");
    if (str === "2" || str === "maintenance" || str === "đang bảo trì" || str === "bảo trì") return t("statusMap.room.maintenance");
    return status;
  }

  if (type === "repair") {
    if (str === "0" || str === "pending" || str === "chờ tiếp nhận" || str === "chờ xử lý") return t("statusMap.repair.pending");
    if (str === "1" || str === "processing" || str === "repairing" || str === "đang xử lý" || str === "đang sửa") return t("statusMap.repair.processing");
    if (str === "2" || str === "completed" || str === "done" || str === "đã hoàn thành" || str === "hoàn tất") return t("statusMap.repair.completed");
    if (str === "3" || str === "cancelled" || str === "đã hủy") return t("statusMap.repair.cancelled");
    return status;
  }

  if (type === "priority") {
    if (str === "low" || str === "thấp") return t("statusMap.priority.low");
    if (str === "medium" || str === "trung bình" || str === "vừa") return t("statusMap.priority.medium");
    if (str === "urgent" || str === "khẩn cấp" || str === "gấp") return t("statusMap.priority.urgent");
    return status;
  }

  if (type === "payment") {
    if (str === "1" || str === "success" || str === "thành công") return t("statusMap.payment.success");
    if (str === "0" || str === "pending" || str === "đang xử lý") return t("statusMap.payment.pending");
    if (str === "2" || str === "failed" || str === "thất bại") return t("statusMap.payment.failed");
    return status;
  }

  return String(status);
}
