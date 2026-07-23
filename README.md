# 🏡 TroHub - Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án

Dự án này là hệ thống Quản lý Phòng Trọ (TroHub) bao gồm App dành cho Người thuê (Tenant) và Web Admin dành cho Chủ trọ.

## 📌 Yêu Cầu Cần Có
1. **Node.js** (v18 trở lên)
2. **MongoDB** (Cài đặt MongoDB Community Server hoặc dùng MongoDB Atlas)
3. **Expo CLI** (Dành cho Mobile App)

---

## 🚀 Các Bước Chạy Dự Án (Dành Cho Đồng Nghiệp)

### Bước 1: Khởi chạy Backend (Node.js & MongoDB)
Mở một cửa sổ Terminal mới:
```bash
cd backend
npm install
# Khởi động Backend server (cổng 5000)
npm run dev
```
*Lưu ý: Bạn cần có MongoDB đang chạy ở cổng 27017, hoặc cấu hình link MongoDB Atlas trong thư mục backend.*
*Backend được cấu hình Auto-Seeding: Sẽ tự động nạp dữ liệu mẫu ban đầu vào DB khi chạy lần đầu tiên.*

### Bước 2: Khởi chạy Web Admin (Dành cho Chủ trọ)
Mở một cửa sổ Terminal thứ 2:
```bash
# Từ thư mục gốc dự án
cd webadmin
npm install
npm run dev
```
Trang Web Admin thống nhất sẽ chạy tại: [http://localhost:3000](http://localhost:3000)

### Bước 3: Khởi chạy Mobile App (Expo - Dành cho Người thuê)
Mở một cửa sổ Terminal thứ 3:
```bash
# Từ thư mục gốc dự án
npm install
# Khởi động Expo Server (cổng 8083)
npx expo start --web --port 8083
```
- Web: Bấm phím `w` trong Terminal để xem trên trình duyệt.
- Mobile: Dùng ứng dụng Expo Go quét mã QR trên màn hình.

---

## 🔐 Tài Khoản Test Mặc Định (Từ file Seed)

- **Tài khoản Admin (Chủ trọ) - Đăng nhập trên Web Admin:**
  - Tên đăng nhập: `admin@trohub.vn`
  - Mật khẩu: `123456`

- **Tài khoản Người thuê (NGUOI_THUE) - Đăng nhập trên Mobile App:**
  - Tên đăng nhập: `tenant@trohub.vn` (hoặc email/sđt của người thuê mà bạn đã tạo)
  - Mật khẩu: `123456`

---

## 📖 Lịch sử cập nhật
Xem file [CHANGELOG.md](./CHANGELOG.md) để biết thêm chi tiết về các tính năng mới được cập nhật.
