# Báo cáo Auth và Typography

Ngày kiểm tra: 2026-07-23

## Phạm vi

- Expo/React Native: màn hình đăng nhập và token typography.
- Next.js Admin: màn hình đăng nhập, font gốc và fallback.
- Backend: chuẩn hóa identifier, tương thích email cũ và vô hiệu hóa đăng ký công khai.
- Không thay đổi UI của `webadmin` cũ.
- Không thực hiện công việc Zalo Mini App hoặc chat.

## Auth

- Expo và Next.js chỉ còn luồng đăng nhập.
- Nhãn chính: “Số điện thoại hoặc tên đăng nhập”.
- SĐT có dấu chấm, khoảng trắng hoặc dấu gạch nối được chuẩn hóa trước khi tìm tài khoản.
- Username được giữ nguyên sau khi trim.
- Email vẫn nằm trong truy vấn tương thích cho tài khoản cũ.
- `POST /api/auth/register` trả HTTP 403 với mã `PUBLIC_REGISTRATION_DISABLED`.
- Admin tiếp tục tạo Người thuê qua module quản trị hiện hữu.

## Typography

- Expo dùng `FONT_FAMILIES.sans` theo nền tảng:
  - iOS: `System`.
  - Android: `sans-serif`.
  - Web: system UI, Segoe UI, Noto Sans, Arial và sans-serif fallback.
- Next.js dùng `Noto_Sans` từ `next/font` với subset Latin và Vietnamese, `display: swap`, CSS variable `--font-app`, cùng system fallback.
- Đã loại bỏ việc ép toàn bộ Next.js về Arial.

## Kết quả kiểm thử

- Backend Auth và invariant nghiệp vụ: 7/7 test pass.
- UI contract: 6/6 test pass.
- Expo TypeScript: pass, không có lỗi.
- Expo lint: pass với 0 error; còn 2 warning có sẵn trong `PaymentModal.tsx`, ngoài phạm vi Auth/font.
- Next.js lint: pass với 0 error; còn 6 warning có sẵn trên các trang dashboard, ngoài phạm vi Auth/font.
- Next.js production build: pass; compile, TypeScript, prerender 12/12 trang thành công.
- Expo Web: Metro bundle thành công; chỉ ghi nhận cảnh báo deprecation từ dependency/runtime hiện hữu.

## Kiểm tra trực quan

- Next.js Admin đang chạy tại `http://localhost:3000/`.
- Expo Web đang chạy tại `http://localhost:8083/`.
- Cả hai URL đã được mở trên máy để kiểm tra trực tiếp.
- Trình điều khiển browser tự động không khả dụng trong phiên này, vì vậy không có ảnh chụp tự động hoặc phép đo DOM. Việc bundle/build và các hợp đồng mã nguồn đã được xác minh bằng test.

## Invariant dữ liệu

- Scanner thuật ngữ production pass.
- `RepairRequest.tenantId` vẫn bắt buộc, tham chiếu trực tiếp `Account`.
- `RepairRequest` không có ownership bằng `roomId`.
