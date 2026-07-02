# Lịch sử Cập nhật Dự án (CHANGELOG)

Tài liệu này ghi lại các thay đổi quan trọng đã được thực hiện trong quá trình hoàn thiện các tính năng cốt lõi của hệ thống TroHub.

## Danh sách các tính năng đã hoàn thiện gần đây

### 1. Phân quyền và Tạo tài khoản (Web Admin & Mobile App)
- **Web Admin:**
  - Trang đăng ký được cấu hình chỉ dùng để đăng ký **Chủ trọ** (`role: 1`). Đã loại bỏ tùy chọn loại tài khoản.
  - Chủ trọ có thể "Thêm khách thuê" trực tiếp bên trong Dashboard. Hệ thống sẽ tự tạo tài khoản **Người thuê** (`role: 2`) với mật khẩu mặc định là `123456`.
- **Mobile App:**
  - Luồng đăng ký được chuyên biệt hoá chỉ dành cho **Người thuê** (`role: 2`). Người thuê có thể tự tải App và đăng ký tài khoản.

### 2. Validation & Bắt lỗi trùng lặp dữ liệu
- **Logic Backend:** Kiểm tra chặt chẽ `Email`, `Số điện thoại` và `CCCD`. Trả về mã lỗi 400 cùng lời nhắn nếu có bất kỳ trường nào bị trùng với dữ liệu trong hệ thống.
- **Frontend (Web & App):** 
  - Khi chủ trọ thêm khách hoặc người thuê tự đăng ký, hệ thống sẽ tự động quét và bôi đỏ ô nhập liệu bị trùng.
  - Hiển thị dòng cảnh báo (text đỏ) ngay bên dưới ô nhập liệu (ví dụ: "Số điện thoại này đã được sử dụng") thay vì chỉ hiện thông báo Toast chung chung.

### 3. Tích hợp thanh toán Cọc qua VietQR
- **Cấu hình ngân hàng:** Chủ trọ có thể điền thông tin Ngân hàng (Mã ngân hàng, Số tài khoản, Tên chủ tài khoản) trong mục **Cài đặt**.
- **Tạo mã QR tự động:** Khi người thuê bắt đầu tạo Hợp đồng, hệ thống sẽ bật modal hiển thị thông tin chuyển khoản kèm **Mã VietQR động** (chứa sẵn số tiền cọc, số tài khoản và nội dung chuyển khoản).
- Người thuê thanh toán xong sẽ được hệ thống chuyển hướng tự động sang hoá đơn cọc.

### 4. Đồng bộ Dashboard "Thu nhập thực"
- Cả Web Admin và Mobile App (Dành cho chủ trọ) đều đã được đồng bộ để tính toán và hiển thị doanh thu dựa trên **Thu nhập thực**.
- **Công thức:** Chỉ lấy tổng tiền từ các Hoá đơn có trạng thái "Đã thanh toán" (hoặc từ các giao dịch thành công) của **tháng hiện tại**.

### Added
- Thêm cơ chế "Pending Invites" cho người thuê (Mobile App).
- Người thuê sau khi được mời (hoặc được tạo tài khoản) sẽ nhận thông báo trên Dashboard App.
- Yêu cầu xác nhận (Chấp nhận/Từ chối) trước khi chính thức đưa vào danh sách của Chủ trọ.
- Bổ sung logic bắt trùng lặp chặt chẽ (SDT, CCCD, Email) cho cả Đăng ký và Thêm khách.

### Changed
- Refactor API `createTenant` và `checkDuplicate` để kết hợp tối ưu giữa "Tạo mới" và "Gửi lời mời", chặn chéo các trường hợp mâu thuẫn CCCD.
- Giao diện HomeScreen trên Mobile App cập nhật để hiển thị Card thông báo mời.

---
*Ghi chú: Các tính năng này đã được kiểm tra tính toàn vẹn (data flow) từ Backend (Node.js/Express) tới Frontend (Vanilla JS Web Admin và React Native Expo App).*
