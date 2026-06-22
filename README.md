# 🏡 TroHub - Hướng Dẫn Chạy Dự Án Bằng Docker (1-Click)

Dự án này là hệ thống Quản lý Phòng Trọ (TroHub) bao gồm App dành cho Khách thuê (Tenant) và Web Admin dành cho Chủ trọ. Toàn bộ kiến trúc (Frontend, Backend, Database) đã được gộp chung và đóng gói bằng Docker.

## 📌 Yêu Cầu Cần Có
1. **Git** (Để tải mã nguồn)
2. **Docker Desktop** (Phải bật phần mềm này lên trước khi chạy lệnh)

---

## 🚀 Các Bước Chạy Dự Án (Dành Cho Đồng Nghiệp/Tester)

### Bước 1: Clone (Tải) mã nguồn về máy
Mở Terminal (hoặc Command Prompt) và chạy lệnh:
```bash
git clone https://github.com/shenjohnsons11/TroHub_Local.git
cd TroHub_Local
```

### Bước 2: Khởi chạy bằng Docker
Chỉ cần chạy **duy nhất 1 lệnh** sau (nhớ thêm sudo nếu dùng Linux/Mac cần quyền admin):
```bash
docker-compose up --build -d
```
*Lưu ý: Quá trình này có thể mất 2-3 phút trong lần chạy đầu tiên vì Docker cần tải image Nodejs, MongoDB và tự động cài đặt thư viện.*

### Bước 3: Truy Cập Ứng Dụng
Sau khi Terminal báo `Started` cho tất cả các container, dự án đã chạy thành công tại các địa chỉ sau:

- 💻 **Web Admin (Dành cho Chủ Trọ):** [http://localhost:8084](http://localhost:8084)
- 📱 **Tenant App (Dành cho Người Thuê):** [http://localhost:8085](http://localhost:8085)
- ⚙️ **Backend API:** `http://localhost:3000`
- 🗄️ **Database (MongoDB):** `localhost:27017`

---

## ❓ Câu Hỏi: "Dữ Liệu Lấy Từ Đâu?"
Bạn không cần import hay setup Database bằng tay!
Hệ thống được thiết lập cơ chế **Auto-Seeding**. Ngay khi container Backend khởi động, nó sẽ tự động chạy file `backend/seed.js` để kết nối vào MongoDB (nằm trong container) và bơm sẵn toàn bộ dữ liệu mẫu bao gồm:
- Danh sách phòng trọ
- Cấu hình phí dịch vụ
- Dữ liệu hóa đơn, hợp đồng mẫu
- Các tài khoản đăng nhập (Admin & User)

Do đó, mỗi người clone dự án về đều có một Database cục bộ riêng biệt, đầy đủ data để test mà không sợ ảnh hưởng đến nhau.

---

## 🔐 Tài Khoản Test Mặc Định
Sử dụng các tài khoản sau để đăng nhập vào Web Admin hoặc App:

- **Tài khoản Admin (Chủ trọ):** 
  - Email: `admin@trohub.vn`
  - Mật khẩu: `123456`

- **Tài khoản Khách Thuê (Tenant):**
  - Email: `user@trohub.vn`
  - Mật khẩu: `123456`
