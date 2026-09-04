# 🏡 TroHub — Nền Tảng Quản Lý Nhà Trọ Toàn Diện (Fullstack Ecosystem)

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-Expo_SDK_54-000000?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Next.js-16_App_Router-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-MongoDB_Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
</p>

---

## 📌 1. Giới Thiệu Dự Án (Overview)

**TroHub** là hệ sinh thái quản lý nhà trọ và căn hộ dịch vụ khép kín, tối ưu hóa toàn bộ quy trình vận hành giữa **Chủ nhà (Landlord)** và **Khách thuê (Tenant)**. Hệ thống giải quyết triệt để các vấn đề ghi chép thủ công, đối soát điện nước phức tạp, chậm trễ xử lý sự cố và thiếu minh bạch tài chính.

### 🌟 Tính Năng Trọng Tâm

* 📱 **Mobile App (Dành cho Khách thuê & Chủ trọ di động):**
  * Xem hợp đồng điện tử, lịch sử đóng tiền và chi tiết hóa đơn theo tháng.
  * Nhận thông báo tức thì (Push Notifications & Realtime Socket.io).
  * Gửi yêu cầu sửa chữa/báo cáo sự cố kèm hình ảnh trực tiếp từ camera.
  * Quét ảnh chỉ số điện/nước thông minh (AI & OCR Integration).
* 💻 **Web Admin Dashboard (Dành cho Quản trị viên & Chủ trọ):**
  * Quản lý danh sách phòng, trạng thái phòng (trống, đang thuê, đang bảo trì).
  * Soạn thảo và quản lý hợp đồng thuê phòng, xuất file Word/PDF tự động.
  * Chốt số điện nước, lập hóa đơn tự động định kỳ hàng tháng.
  * Bảng điều khiển phân tích doanh thu, tỷ lệ lấp đầy phòng và công nợ.
* ⚙️ **Backend API & Realtime Service:**
  * Kiến trúc RESTful API chuẩn mực, phân quyền nghiêm ngặt với JWT.
  * Tự động hóa định kỳ (Cron Jobs) tính tiền phòng, gửi email nhắc hạn.
  * Xác thực bảo mật OTP qua Gmail SMTP khi quên mật khẩu.

---

## 🏗️ 2. Kiến Trúc & Công Nghệ Sử Dụng (Tech Stack)

| Thành Phần | Công Nghệ / Thư Viện Chính | Mục Đích |
| :--- | :--- | :--- |
| **Mobile App** | **React Native (Expo SDK 54)**, Expo Router v6, Reanimated 4, Lucide Icons | Ứng dụng di động đa nền tảng (iOS & Android) |
| **Web Admin** | **Next.js 16 (App Router)**, React 19, Tailwind CSS v4, Radix/Base-UI | Dashboard quản trị vận hành trên máy tính |
| **Backend API** | **Node.js, Express 5**, Socket.io, Node-cron, Nodemailer | Máy chủ xử lý nghiệp vụ, Realtime & Scheduled tasks |
| **Cơ Sở Dữ Liệu** | **MongoDB**, Mongoose ODM (Auto-seeding dữ liệu mẫu) | Lưu trữ dữ liệu linh hoạt, phi quan hệ |
| **AI / Xử Lý Ảnh** | **Google GenAI / OCR (Tesseract.js)**, Docx, PDFKit | Nhận diện chỉ số đồng hồ & xuất hóa đơn/hợp đồng |

---

## 📂 3. Cấu Trúc Thư Mục (Project Structure)

```text
TroHub_Local/
├── app/                  # Router & Màn hình chính của Mobile App (Expo Router)
├── components/           # UI Components dùng chung cho Mobile
├── contexts/             # Contexts quản lý State (Auth, Theme, Socket, Language)
├── services/             # Client API Services (Mobile)
│
├── backend/              # Mã nguồn Backend REST API
│   ├── src/
│   │   ├── controllers/  # Bộ điều hướng nghiệp vụ (Auth, Room, Bill, Contract...)
│   │   ├── models/       # Mongoose Schemas (User, Invoice, Room, Ticket...)
│   │   ├── routes/       # API Route definitions
│   │   ├── middlewares/  # Middleware xác thực (JWT Auth, Role Guard, Upload)
│   │   └── services/     # Logic gửi Email, OCR, Cron Jobs
│   ├── server.js         # Entrypoint server & cấu hình Socket.io
│   └── seeder.js         # Dữ liệu mẫu khởi tạo DB tự động
│
├── webadmin/             # Mã nguồn Dashboard Quản Trị (Next.js 16)
│   ├── src/
│   │   ├── app/          # App Router Pages (Rooms, Invoices, Contracts, Settings...)
│   │   └── components/   # UI Kit (Shadcn/Base-UI, Modals, Tables, Charts)
│   └── public/           # Tài nguyên tĩnh
│
└── README.md
```

---

## 🚀 4. Hướng Dẫn Cài Đặt & Khởi Chạy Local (Quickstart)

### 📋 Yêu cầu môi trường
* **Node.js**: Phiên bản `v18.x` hoặc `v20.x+`
* **MongoDB**: Cài đặt MongoDB Community Server Local (`mongodb://localhost:27017`) hoặc đường dẫn MongoDB Atlas.
* **Package Manager**: `npm` (khuyến nghị đi kèm Node).

---

### Bước 1: Khởi chạy Backend API

1. Mở cửa sổ Terminal thứ nhất:
   ```bash
   cd backend
   npm install
   ```

2. Cấu hình biến môi trường: Tạo file `backend/.env` với nội dung mẫu:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/trohub_db
   JWT_SECRET=your_jwt_secret_key_change_in_production
   SMTP_USER=your_email@gmail.com
   SMTP_APP_PASSWORD=your_google_app_password
   ```

3. Khởi chạy máy chủ Backend:
   ```bash
   npm run dev
   ```
   > 💡 **Auto-Seeding**: Backend tự động kiểm tra và khởi tạo dữ liệu mẫu ban đầu (tài khoản demo, phòng mẫu, hợp đồng) nếu Database đang trống.

---

### Bước 2: Khởi chạy Web Admin (Dành cho Quản Trị / Chủ Trọ)

1. Mở cửa sổ Terminal thứ hai:
   ```bash
   cd webadmin
   npm install
   ```

2. Khởi chạy Web Server:
   ```bash
   npm run dev
   ```
3. Truy cập Web Admin trên trình duyệt tại: **http://localhost:3000**

---

### Bước 3: Khởi chạy Mobile App (Expo)

1. Mở cửa sổ Terminal thứ ba tại thư mục gốc dự án:
   ```bash
   # Tại thư mục gốc TroHub_Local
   npm install
   ```

2. Khởi động Expo Development Server:
   ```bash
   npx expo start
   ```
   * **Trên điện thoại thật**: Cài app **Expo Go** (Android/iOS) và quét mã QR trên Terminal.
   * **Trên Web Browser**: Nhấn phím `w` trong Terminal hoặc chạy `npm run web`.
   * **Trên Emulator**: Nhấn phím `a` (Android Emulator) hoặc `i` (iOS Simulator).

---

## 🔒 5. Bảo Mật & Quy Định Biến Môi Trường (Security)

> [!WARNING]
> **Tuyệt đối KHÔNG commit các thông tin sau lên Git:**
> * File `.env` chứa `MONGO_URI`, `JWT_SECRET`, `SMTP_APP_PASSWORD`.
> * Khóa API bên thứ ba (Google AI API Key, Cloudinary Secrets, v.v.).
> * Mã OTP thực tế hoặc token truy cập người dùng.

---

## 👥 6. Giấy Phép & Bản Quyền (License)

Dự án thuộc quyền sở hữu của **TroHub Team**. Mọi quyền được bảo lưu. Phân phối và sử dụng nội bộ hoặc theo quy định của tổ chức.
