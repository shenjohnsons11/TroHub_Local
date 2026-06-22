# 🏡 TroHub - Nền tảng Quản Lý Phòng Trọ Toàn Diện

TroHub là giải pháp ứng dụng (Mobile) và quản trị (Web Admin) giúp tối ưu hóa luồng vận hành, quản lý hợp đồng, hóa đơn, điện nước và sự cố phòng trọ dành cho chủ trọ và người thuê.

## 🏗 Cấu trúc dự án (Monorepo)

Dự án này sử dụng mô hình chia tách thư mục nhưng tái sử dụng chung bộ UI Core của **Expo / React Native**.
- **`/` (Root):** Ứng dụng dành cho Người thuê (Tenant App). Cung cấp tính năng xem hóa đơn, báo cáo sự cố, thanh toán, v.v.
- **`/webadmin`:** Ứng dụng Quản trị Web (Admin Dashboard). Dành cho Chủ trọ quản lý các phòng, tạo hóa đơn tự động lấy chỉ số cũ/mới, quản lý hợp đồng.

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Localhost)

Yêu cầu hệ thống: NodeJS (v18+) và npm/yarn. Bạn cần phải bật sẵn Backend API (chạy ở cổng 3000) trước khi chạy Frontend.

### 1. Chạy App cho Khách Thuê (Tenant App)
```bash
# Tại thư mục gốc
npm install
npm run start
```
Mở ứng dụng **Expo Go** trên điện thoại và quét mã QR, hoặc chạy phím `i` để mở iOS Simulator, `a` để mở Android Emulator.

### 2. Chạy Web Admin cho Chủ Trọ (Admin Portal)
```bash
cd webadmin
npm install
npm run web
```
Truy cập vào trình duyệt: `http://localhost:8081` (Hoặc cổng mà Expo cung cấp, thường là 8081, 8082, 8084).
Tài khoản test mặc định:
- **Admin**: `admin@trohub.vn` / `123456`
- **Tenant**: `user@trohub.vn` / `123456`

---

## 🐳 Hướng Dẫn Test Chung Bằng Docker (Dành cho Đồng Nghiệp)

Nếu bạn muốn đóng gói data local để gửi cho đồng nghiệp (Ví dụ QA/Tester) tự cài đặt và test không cần clone DB, bạn có 2 phương án:

### Phương Án 1: Chia Sẻ Nhanh Không Cần Docker (Qua Mạng LAN)
Nếu đồng nghiệp ngồi chung một WiFi, bạn không cần phải gửi file gì cho họ cả:
1. Bật Backend và Database trên máy tính của bạn.
2. Đổi địa chỉ API trong file `constants/api.ts` từ `localhost` thành địa chỉ IP máy bạn (ví dụ: `192.168.1.12`).
3. Chạy `npm run web` cho thư mục `webadmin`. Gửi đường link `http://192.168.1.12:8081` cho họ truy cập.

### Phương Án 2: Đóng Gói Docker Compose (Máy Tách Biệt)
Sử dụng file `docker-compose.yml` có sẵn ở thư mục gốc:
1. Copy thư mục source code Backend của bạn vào chung repo này.
2. Mở file `docker-compose.yml` lên và bỏ comment phần cấu hình Backend & Database.
3. Xuất file `init.sql` (Database hiện tại của bạn) vào thư mục Backend để Docker tự mồi data khi chạy.
4. Đồng nghiệp của bạn chỉ cần cài Docker Desktop và chạy lệnh:
```bash
docker-compose up --build -d
```
5. Đợi 2-3 phút, họ có thể truy cập thẳng vào trang WebAdmin cục bộ trên máy họ với dữ liệu đã được mồi sẵn.

---
*Developed & Maintained by [hmh2k6hehe](https://github.com/hmh2k6hehe)*
