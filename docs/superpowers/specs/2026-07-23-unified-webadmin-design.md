# Thiết kế hợp nhất Web Admin TroHub

Ngày duyệt: 23/07/2026

## 1. Mục tiêu

TroHub chỉ duy trì một ứng dụng Web Admin tại:

```text
/Users/nguyen/TroHub_Local/webadmin
```

Ứng dụng cuối cùng dùng Next.js và chạy tại:

```text
http://localhost:3000
```

Web Admin HTML/JavaScript legacy tại port 5173 được loại bỏ hoàn toàn sau khi Next.js đạt feature parity và vượt qua kiểm thử.

Web Admin chỉ phục vụ Chủ trọ/Admin. Người thuê sử dụng Expo; không duy trì portal Người thuê trên web.

## 2. Kiến trúc đích

### Frontend

```text
Next.js 16
React 19
TypeScript
Tailwind CSS
shadcn/base-ui
Sonner thông qua useNotification
```

### Kết nối Backend

Backend chạy tại:

```text
http://localhost:5000
```

Trình duyệt gọi API same-origin:

```text
/api/*
```

Next.js rewrite:

```text
/api/* → http://localhost:5000/api/*
```

Không hard-code backend URL vào component hoặc bundle trình duyệt.

## 3. Chiến lược chuyển đổi

Áp dụng chiến lược port-before-rename:

1. `webadmin-next` tiếp tục là workspace triển khai tạm thời.
2. Port và kiểm thử các tính năng Admin hữu ích còn thiếu.
3. Xác nhận feature parity.
4. Xóa `webadmin` legacy.
5. Đổi tên `webadmin-next` thành `webadmin`.
6. Sửa toàn bộ script, test, Docker và tài liệu sang đường dẫn cuối.
7. Chạy lại toàn bộ test sau đổi tên.

Git là cơ chế phục hồi cho mã legacy đã xóa. Không giữ thư mục archive hoặc `webadmin-legacy` trong repository.

Không push GitHub trong quá trình triển khai.

## 4. Phạm vi tính năng

Web Admin hợp nhất phải có:

- Đăng nhập bằng số điện thoại hoặc username; backend vẫn tương thích email cũ.
- Dashboard tổng hợp số liệu và hoạt động gần đây.
- Quản lý Phòng.
- Quản lý Người thuê.
- Quản lý Hợp đồng.
- Quản lý Điện nước.
- Quản lý Hóa đơn đơn lẻ và hàng loạt.
- Quản lý Công nợ.
- Lịch sử giao dịch và thanh toán.
- Quản lý Sửa chữa.
- Quản lý Dịch vụ.
- Cài đặt tài khoản.
- Cài đặt thông tin ngân hàng.
- Cài đặt chính sách hóa đơn và tiền phạt.
- Notification toàn cục cho success, error, warning, info và confirm.
- Light mode, dark mode, responsive layout và reduced motion.

## 5. Những phần không port từ legacy

- Portal Người thuê.
- Dữ liệu demo hard-code trong frontend.
- Vanilla JavaScript state toàn cục.
- HTML render bằng template string.
- Logic tính tiền hoặc tiền phạt phía client.
- `alert` và `confirm` thô.
- API URL hard-code.
- Static server tại port 5173.
- Dependency `http-server`.
- UI hoặc biến sử dụng thuật ngữ không được phép.

## 6. Dashboard

Dashboard Next.js giữ thiết kế hiện đại và bổ sung các điểm mạnh từ legacy:

- Tổng số phòng.
- Số phòng đang có Người thuê.
- Số hóa đơn chưa thanh toán.
- Tổng công nợ.
- Số yêu cầu sửa chữa đang mở.
- Doanh thu đã thu trong kỳ.
- Danh sách hóa đơn cần chú ý.
- Hoạt động gần đây.
- Truy cập nhanh tới Hóa đơn, Hợp đồng, Người thuê và Sửa chữa.

Tất cả số liệu lấy từ API theo `landlordId` trong JWT.

## 7. Lịch sử giao dịch

Route:

```text
/dashboard/payments
```

Chức năng:

- Lọc theo trạng thái, phương thức và khoảng ngày.
- Tìm theo mã giao dịch, hóa đơn hoặc Người thuê.
- Hiển thị số tiền, thời điểm, gateway reference và trạng thái.
- Truy cập chi tiết hóa đơn liên quan.
- Không suy diễn Người thuê qua Phòng; dữ liệu Người thuê được truy qua hợp đồng và `tenantId`.

## 8. Cài đặt

### 8.1 Điều hướng

```text
/dashboard/settings
/dashboard/settings/account
/dashboard/settings/banking
/dashboard/settings/billing
```

### 8.2 Tài khoản

- Họ tên.
- Số điện thoại.
- Email.
- Đổi mật khẩu.

### 8.3 Ngân hàng

- Ngân hàng.
- Số tài khoản.
- Tên chủ tài khoản.
- Thông tin dùng cho VietQR.

### 8.4 Chính sách hóa đơn

Thực hiện theo spec:

```text
docs/superpowers/specs/2026-07-23-invoice-late-fee-policy-design.md
```

Mỗi Chủ trọ/Admin có:

- Số ngày ân hạn.
- Tỷ lệ phạt một lần.

Chính sách được snapshot khi phát hành hóa đơn.

## 9. Wizard tạo HỢP ĐỒNG

Route:

```text
/dashboard/contracts/new
```

Wizard là trang riêng, không dùng modal.

### Bước 1: Phòng và Người thuê

- Chọn Phòng.
- Chọn Người thuê.
- Chỉ dùng `tenantId` của `NGUOI_THUE`.

### Bước 2: Điều khoản

- Ngày bắt đầu.
- Ngày kết thúc.
- Tiền thuê.
- Tiền cọc.

### Bước 3: Dịch vụ

- Chọn dịch vụ đang hoạt động.
- Chốt đơn giá dịch vụ cho hợp đồng.
- Nhập chỉ số điện và nước ban đầu.

### Bước 4: Xác nhận

- Hiển thị toàn bộ dữ liệu.
- Cảnh báo trường thiếu hoặc không hợp lệ.
- Tạo hợp đồng.

### Progress bar

- Hiển thị bốn bước trên desktop.
- Trên mobile hiển thị bước hiện tại và tỷ lệ hoàn thành.
- Phân biệt trạng thái chưa mở, hiện tại, hoàn thành và có lỗi.
- Cho phép quay lại bước đã hoàn thành.
- Không cho bỏ qua bước chưa hợp lệ.

### Bản nháp

- Tự lưu theo Admin trong local storage.
- Key chứa ID Admin để không trộn dữ liệu giữa các tài khoản.
- Không lưu token hoặc dữ liệu bí mật.
- Xóa nháp khi tạo hợp đồng thành công.
- Khi phát hiện nháp, hỏi Admin tiếp tục hay xóa.

Backend vẫn là nguồn validate có thẩm quyền.

## 10. Hóa đơn

- Lập hóa đơn đơn lẻ.
- Lập hóa đơn hàng loạt.
- Chọn ngày phát hành nghiệp vụ.
- Hiển thị snapshot chính sách phạt.
- Hiển thị tiền phòng, điện, nước, dịch vụ, giảm giá, tiền phạt và tổng.
- Không tin `totalAmount`, penalty hoặc snapshot do client gửi.
- Backend invoice calculator là nguồn tính toán duy nhất.

## 11. Notification

Mọi mutation sử dụng `useNotification`:

- Thành công.
- Lỗi.
- Cảnh báo.
- Thông tin.
- Xác nhận hành động nguy hiểm.

Không dùng trực tiếp:

```text
window.alert
window.confirm
toast.*
```

Provider giữ callback và context value ổn định để tránh render loop.

## 12. Ràng buộc dữ liệu

- Thuật ngữ duy nhất: Người thuê, `nguoiThue`, `NGUOI_THUE`.
- Không tạo biến, comment hoặc UI text mới sử dụng thuật ngữ không được phép.
- Repair Request tiếp tục liên kết trực tiếp bằng `tenantId` tới `NGUOI_THUE`.
- Không thay liên kết Repair Request sang Phòng.
- Hợp đồng liên kết `tenantId` trực tiếp tới `NGUOI_THUE`.
- Dữ liệu Admin được scope bằng identity từ JWT.
- Client không được chỉ định `landlordId`.

## 13. Hợp nhất filesystem

Trước khi xóa:

- Chụp danh sách tính năng legacy.
- Có contract test cho từng tính năng cần giữ.
- Next.js build thành công.
- E2E chính thành công.

Thao tác cuối:

```text
delete /webadmin
rename /webadmin-next → /webadmin
```

Sau đổi tên phải cập nhật:

- Root tests.
- Root `tsconfig.json`.
- Package scripts.
- Cypress/Playwright configuration.
- Dockerfile và Docker Compose.
- README và tài liệu vận hành hiện hành.
- Các script khởi động.
- Các đường dẫn trong báo cáo mới.

Tài liệu lịch sử đã đóng không cần sửa nếu việc sửa làm sai bối cảnh lịch sử; tài liệu vận hành hiện hành bắt buộc dùng đường dẫn mới.

## 14. Lệnh chạy thống nhất

Trong thư mục:

```text
/Users/nguyen/TroHub_Local/webadmin
```

Các lệnh:

```text
npm run dev
npm run build
npm run start
npm run lint
```

Không còn lệnh hoặc tài liệu vận hành yêu cầu port 5173.

## 15. Kiểm thử

### Contract tests

- Chỉ tồn tại một thư mục `webadmin`.
- Không tồn tại `webadmin-next`.
- `webadmin/package.json` dùng Next.js.
- Không còn script chạy port 5173.
- Các route Admin bắt buộc tồn tại.
- Không còn API URL hard-code trong page/component.
- Không còn thuật ngữ bị cấm trong mã đang hoạt động.

### Unit và integration

- API resilience với response không phải JSON.
- Snapshot chính sách hóa đơn.
- Invoice calculator.
- Wizard validation theo từng bước.
- Draft cô lập theo Admin.
- Notification semantic API.
- Repair Request giữ `tenantId`.

### E2E

- Đăng nhập.
- Tạo Phòng và Người thuê.
- Tạo HỢP ĐỒNG qua wizard bốn bước.
- Tạo dịch vụ.
- Nhập điện nước.
- Phát hành hóa đơn.
- Áp dụng quá hạn.
- Thanh toán.
- Xem lịch sử giao dịch.
- Cập nhật cài đặt.

### Verification

- Backend tests.
- Expo tests và type-check.
- Web Admin lint.
- Web Admin type-check.
- Web Admin production build.
- E2E trên port 3000.
- `git diff --check`.

## 16. Điều kiện hoàn thành

- Chỉ còn `/webadmin` dùng Next.js.
- Web Admin hoạt động tại port 3000.
- Port 5173 không còn trong cấu hình vận hành.
- Feature parity đã được kiểm thử.
- Wizard HỢP ĐỒNG hoạt động đủ bốn bước.
- Chính sách phạt hóa đơn hoạt động theo spec đã duyệt.
- Expo dành cho Người thuê không bị ảnh hưởng.
- Không push GitHub.
