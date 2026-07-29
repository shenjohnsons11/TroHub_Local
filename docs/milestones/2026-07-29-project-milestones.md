# 🏆 BẢNG TỔNG HỢP CỘT MỐC DỰ ÁN TROHUB (PROJECT MILESTONES)

> **Cập nhật ngày:** 29/07/2026  
> **Thư mục Dự án Chính:** `/Users/nguyen/TroHub_Local`  
> **Thư mục Sao lưu:** `/Users/nguyen/TroHub_Local_OLD_BACKUP`

---

## 🟢 1. CÁC CỘT MỐC ĐÃ HOÀN THÀNH (COMPLETED MILESTONES)

- **Fix Timeout & API Base URL:** Đã sửa IP hardcode trong `api.ts` và endpoint (`/bulk-create` -> `/bulk`).
- **Thiết kế Dual Theme (Sáng/Tối):** Light Mode (Direction 03 Keyhouse Atelier) & Dark Mode (Direction 02 Night Property OS nền `#04100e`).
- **Hệ thống Alert & Toast Đa nền tảng:** SweetAlert2 bản WebAdmin + Native Modal/Toast kèm Lottie Animation cho Mobile App qua hook `useNotification()`.
- **Đồng bộ Layout 5 Tầng Chuẩn:** Áp dụng chuẩn Hình 2 (Header -> Hero Card -> Section Row với nút Mint -> Filter Pills -> Danh sách).
- **Bộ Nhận Diện Thương Hiệu 3D Mới:**
  + Logo App mới (Dark theme borderless): `/assets/images/logo_dark_theme.png`
  + Loading Screen 3D Căn hộ: `/assets/images/loading_illustration.png`
- **Trung Tâm Thông Báo (Notification Center):** Icon Quả Chuông 🔔 ở Header + Badge đỏ số tin chưa đọc + Màn hình `NotificationsScreen` nhóm theo ngày + Deep-link Navigation bấm vào thông báo tự động chuyển đến đúng trang.
- **Lịch Ngày Tháng Kính Mờ (Glassmorphism Calendar Widget):** Bấm vào thanh ngày tháng `📅 Thứ 4, 29/07/2026` sổ xuống Bảng Lịch Mini Kính mờ chuẩn iOS.
- **Nâng Cấp Luồng Hợp Đồng (Contract Workflow):** Tab bộ lọc `[Trả phòng]`, Badge Hợp đồng `Đặt cọc trước`, và tính năng lưu/tiếp tục Hợp đồng Nháp (`Draft`).
- **Header Mobile & Nút Logout:** Đưa nút Logout vào trang Cài đặt; căn chỉnh nút Bánh răng ⚙️ đúng lề.
- **Đồng Bộ 8 Modules Web <-> Mobile:** Đồng bộ 1:1 các chức năng Phòng trọ, Người thuê, Hợp đồng, Hóa đơn, Điện nước, Sự cố, Thông báo, Tài chính.
- **Native Home Screen Widgets (iOS WidgetKit & Android AppWidget):** Bộ Widget ngoài màn hình chính điện thoại (Small 2x2, Medium 4x2, Large 4x4) hiển thị Doanh thu, Công nợ, Điện nước và Sự cố kèm nút bấm nhanh Deep-link.
- **Camera AI / OCR Quét Số Đồng Hồ Điện Nước (`MeterScannerScreen.tsx`):** Tính năng mở camera quét hình ảnh mặt đồng hồ để tự động trích xuất dãy số điền vào ô chốt điện nước, kèm bộ lọc số nguyên và khung ngắm tia Laser chuyên nghiệp.

---

## 🟡 2. CÁC CỘT MỐC ĐANG PHÁT TRIỂN & HOÀN THIỆN THÊM (IN PROGRESS MILESTONES)

- **Tối Ưu Hóa Mô Hình AI OCR trên Native Build:** Nâng cao độ chính xác nhận diện chỉ số công tơ điện nước trong điều kiện thiếu sáng hoặc mặt kính mờ.
- **Mở Rộng Push Notifications Thời Gian Thực:** Tích hợp Expo Push Notifications & Firebase Cloud Messaging (FCM) để nhận thông báo tức thì ngoài màn hình khóa.

---

## 📐 3. BẢNG TÓM TẮT TRẠNG THÁI 8 MODULES CHÍNH

| Module | WebAdmin | Mobile App | Trạng thái đồng bộ |
| :--- | :--- | :--- | :--- |
| **1. Phòng trọ (Rooms)** | Đổi trạng thái, gán người thuê, xem chi tiết | 2-Column Grid layout, đổi trạng thái, lọc phòng | 🟢 100% 同步 |
| **2. Người thuê (Tenants)** | Thêm khách, SMS/Zalo invite, trạng thái App link | Nút `[+ Thêm người thuê]` mint, `[✈️ Gửi lời mời]`, lọc SĐT/Tên | 🟢 100% 同步 |
| **3. Hợp đồng (Contracts)** | 5 Filter tabs, cọc trước, thanh lý quyết toán | Tabs bộ lọc, cọc trước, lưu/tiếp tục Draft | 🟢 100% 同步 |
| **4. Hóa đơn (Invoices)** | Tạo đơn lẻ/hàng loạt, In ấn, Nhắc nợ, VietQR | Tạo hóa đơn hàng loạt, xem chi tiết & VietQR | 🟢 100% 同步 |
| **5. Điện nước (Utilities)** | Nhập chỉ số hàng loạt, chọn kỳ theo tháng | Nhập nhanh chỉ số, tích hợp **Quét Camera AI OCR** | 🟢 100% 同步 |
| **6. Sự cố (Repairs)** | Duyệt/Phân công kỹ thuật viên, đổi trạng thái | Phân công phụ trách, đính kèm ảnh báo sự cố | 🟢 100% 同步 |
| **7. Thông báo (Notifications)** | Bell icon dropdown, 5 danh mục, deep-link | Bell icon badge, 5 danh mục, deep-link navigation | 🟢 100% 同步 |
| **8. Tài chính (Analytics)** | Thống kê doanh thu, công nợ, occupancy rate | Stat cards 3D, occupancy rate progress ring, Widgets | 🟢 100% 同步 |
