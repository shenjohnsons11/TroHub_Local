# Báo cáo hệ thống Notification TroHub

Ngày kiểm tra: 23/07/2026

## Phạm vi triển khai

- Expo dùng `NotificationProvider`, `useNotification` và `react-native-toast-message`.
- Web Admin Next.js dùng `NotificationProvider`, `useNotification` và Sonner.
- Hai nền tảng có cùng semantic API: `success`, `error`, `warning`, `info`, `confirm`.
- Callback và context value được ổn định bằng `useCallback`, `useMemo`; Promise resolver của hộp thoại xác nhận được giữ trong `useRef` để không tạo render loop.
- API client giữ lại `code`, `field`, `status` từ lỗi backend. Mã `METER_INDEX_REGRESSION` được chuyển thành hướng dẫn kiểm tra chỉ số điện, nước dễ hiểu.

## Luồng đã tích hợp

### Expo

- Đăng nhập.
- Lập hóa đơn hàng loạt.
- Báo chỉ số điện nước.
- Tạo, xóa và xóa hàng loạt yêu cầu sửa chữa.

### Web Admin Next.js

- Đăng nhập.
- Lập, thu tiền và xóa hóa đơn.
- Lưu sổ điện nước.
- CRUD Quản lý dịch vụ, gồm cơ chế ngừng hoạt động an toàn nếu dịch vụ đang được hợp đồng sử dụng.

## Cách sử dụng

```tsx
const notification = useNotification();

notification.success("Cập nhật thành công.");
notification.error("Không thể hoàn tất thao tác.");
notification.warning("Vui lòng kiểm tra lại dữ liệu.");
notification.info("Dữ liệu đang được xử lý.");

const confirmed = await notification.confirm({
  title: "Xác nhận thao tác",
  message: "Bạn có chắc chắn muốn tiếp tục không?",
  confirmText: "Tiếp tục",
  cancelText: "Hủy",
  destructive: false,
});
```

## Bảo vệ nghiệp vụ

- Nội dung và biến mới không sử dụng thuật ngữ “Khách thuê”.
- Repair Request tiếp tục thuộc trực tiếp Người thuê qua `RepairRequest.tenantId`.
- Notification không suy diễn quyền sở hữu Repair Request qua Phòng.

## Kết quả xác minh

- Notification contract: 6/6 pass.
- UI contract tổng hợp: 12/12 pass.
- Backend Auth, business rules, calculator và services: 22/22 pass.
- Expo TypeScript: pass.
- Expo lint: 0 error; còn 2 warning có sẵn trong `PaymentModal.tsx`, ngoài phạm vi thay đổi.
- Next.js lint: 0 error; còn 4 warning có sẵn tại Contracts và Debts.
- Next.js production build: pass; route `/dashboard/services` được prerender thành công.
- `git diff --check`: pass.

Không có thao tác push GitHub.
