# KỊCH BẢN THUYẾT TRÌNH DEMO DỰ ÁN HỆ THỐNG QUẢN LÝ NHÀ TRỌ THÔNG MINH TROHUB
**Nền tảng:** Mobile App (React Native Expo 2 Role: Chủ trọ & Khách thuê) & WebAdmin (Next.js 16)  
**Backend:** Node.js, Express, MongoDB Atlas, Socket.io, Gemini AI Dual-Key, OCR Vision  

---

## MỤC LỤC KỊCH BẢN THUYẾT TRÌNH
1. **PHẦN 1: GIỚI THIỆU TỔNG QUAN HỆ SINH THÁI TROHUB (2 phút)**
2. **PHẦN 2: DEMO WEBADMIN - DÀNH CHO CHỦ TRỌ / BAN QUẢN LÝ (10 phút)**
   - 2.1. Đăng ký/Đăng nhập & Xác thực bảo mật OTP
   - 2.2. Dashboard Đa Chế Độ: Bento Grid iOS 18, Báo Cáo Trực Quan & Tiêu Chuẩn
   - 2.3. Quản lý Tòa nhà, Tầng & Trạng thái Phòng trọ
   - 2.4. Quản lý Hồ sơ Khách thuê & Tìm kiếm định danh
   - 2.5. Quy trình Lập Hợp đồng Thuê 4 bước & Quản lý vòng đời hợp đồng
   - 2.6. Quản lý Điện nước & Dịch vụ đi kèm
   - 2.7. Lập Hóa đơn Hàng loạt, Đơn lẻ & Quét phạt quá hạn tự động
   - 2.8. Đối soát Thanh toán & Cổng VietQR / VNPAY
   - 2.9. Tiếp nhận & Xử lý Phiếu sự cố Sửa chữa thời gian thực
   - 2.10. Trợ lý AI Co-Pilot & Cài đặt Chính sách Thu phí
3. **PHẦN 3: DEMO MOBILE APP - ROLE CHỦ TRỌ (LANDLORD EXPERIENCE) (7 phút)**
   - 3.1. Quét QR CCCD Camera tự động trích xuất thông tin
   - 3.2. Quét đồng hồ Điện & Nước bằng Camera OCR & Gemini Vision
   - 3.3. Trợ lý AI Voice & Chatbot Co-Pilot cho Chủ trọ
   - 3.4. Duyệt hợp đồng & Quyết toán trả phòng (Smart Checkout Settlement)
4. **PHẦN 4: DEMO MOBILE APP - ROLE NGƯỜI THUÊ (TENANT EXPERIENCE) (6 phút)**
   - 4.1. Đăng nhập / Đăng ký Người thuê với bảo mật xác thực
   - 4.2. Xem Hợp đồng thuê & Ký hợp đồng điện tử 1 chạm
   - 4.3. Tra cứu Hóa đơn, Xem chi tiết breakdown & Thanh toán VNPAY / VietQR
   - 4.4. Gửi yêu cầu Báo hỏng / Sửa chữa kèm hình ảnh & Nhận thông báo tức thời
   - 4.5. AI Hỗ trợ Người thuê 24/7 (Hỏi chính sách, nội quy, tiền phòng)
5. **PHẦN 5: TỔNG KẾT KIẾN TRÚC KỸ THUẬT & HỎI ĐÁP Q&A (3 phút)**

---

# PHẦN 1: GIỚI THIỆU TỔNG QUAN (2 Phút)

> **Lời thoại MC/Presenter:**  
> *"Kính chào quý thầy cô và hội đồng / ban giám khảo! Hôm nay nhóm xin phép trình diễn **TroHub** - Hệ sinh thái quản lý nhà trọ và căn hộ dịch vụ toàn diện theo tiêu chuẩn hiện đại. TroHub giải quyết bài toán cốt lõi: Kết nối liền mạch giữa Chủ trọ và Người thuê thông qua nền tảng WebAdmin quản trị chuyên sâu và Mobile App 2 Role tích hợp AI, Camera OCR và Cổng thanh toán tự động."*

---

# PHẦN 2: KỊCH BẢN DEMO WEBADMIN (CHỦ TRỌ)

### 2.1. Đăng ký, Đăng nhập & Mã mời Quản trị
- **Hành động Demo:**
  1. Mở trình duyệt tại `http://localhost:3000`.
  2. Bấm "Đăng ký Chủ trọ" -> Nhập mã mời (Invite Code), Số điện thoại, Email, Mật khẩu.
  3. Thử tính năng "Quên mật khẩu" -> Gửi mã OTP xác minh qua Email -> Đặt lại mật khẩu mới.
  4. Đăng nhập vào hệ thống WebAdmin.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/auth/register-landlord`: Nhận payload `{ fullName, phone, email, password, inviteCode, propertyAddress }`. Backend xác thực Invite Code còn hiệu lực, băm mật khẩu `bcrypt`, tạo `Account (role=1)` và sinh `JWT Token`.
  - `POST /api/auth/login`: Nhận `{ identifier, password }`. Backend kiểm tra `role === 1` cho WebAdmin, trả về JWT Token và User Profile.
  - `POST /api/auth/forgot-password` & `POST /api/auth/reset-password`: Sinh mã OTP 6 số ngẫu nhiên có TTL 5 phút, gửi qua email, cập nhật mật khẩu khi xác thực thành công.

---

### 2.2. Dashboard Quản Trị Đa Chế Độ
- **Hành động Demo:**
  1. Giới thiệu tổng quan các chỉ số: Doanh thu tháng, Tổng công nợ tồn đọng, Tỷ lệ lấp đầy phòng, Hợp đồng & Sự cố cần xử lý.
  2. Chuyển đổi giữa 3 chế độ xem bằng 1 cú click:
     - 🍱 **Bento Grid iOS 18:** Card Doanh thu sóng 3D, Donut chart công suất phòng, cụm phím tắt AI.
     - 📊 **Báo cáo Trực quan (Visual Analytics):** Biểu đồ Bar Chart doanh thu đa tháng, phân bổ trạng thái phòng.
     - 📋 **Thẻ Tiêu chuẩn (Standard Cards):** Danh sách chỉ số vận hành chi tiết.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/dashboard/stats` (hoặc `GET /api/landlord/stats`):
    - *Luồng dữ liệu:* Controller truy vấn song song MongoDB Atlas: `Room.aggregate()` (đếm phòng trống, đang thuê, bảo trì), `Invoice.aggregate()` (tính tổng tiền đã thu và nợ quá hạn), `Contract.countDocuments({ status: 0 })`, `Repair.countDocuments({ status: 'pending' })`.
    - Trả về payload JSON dạng cấu trúc tổng hợp real-time.

---

### 2.3. Quản lý Tòa nhà & Danh sách Phòng trọ
- **Hành động Demo:**
  1. Truy cập menu `/dashboard/rooms`.
  2. Lọc phòng theo Tầng (Tầng 1, Tầng 2, Tầng 3), Trạng thái (Trống, Đang thuê, Đang cọc, Bảo trì).
  3. Bấm "+ Thêm phòng mới" -> Điền Mã phòng, Tầng, Giá thuê cơ bản, Tiền cọc, Diện tích, Tiện ích có sẵn.
  4. Cập nhật trạng thái hoặc chỉnh sửa thông tin phòng.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/rooms`: Trả về danh sách tất cả phòng kèm thông tin hợp đồng hiện tại (`populate('currentContract')`).
  - `POST /api/rooms`: Payload `{ roomCode, floor, basePrice, deposit, maxTenants, amenities }`. Lưu vào MongoDB collection `rooms`.
  - `PUT /api/rooms/:id` & `DELETE /api/rooms/:id`: Kiểm tra ràng buộc (nếu phòng đang có hợp đồng active sẽ chặn xóa để bảo đảm toàn vẹn dữ liệu).

---

### 2.4. Quản lý Khách thuê & Hồ sơ Định danh
- **Hành động Demo:**
  1. Truy cập menu `/dashboard/tenants`.
  2. Tìm kiếm khách thuê theo Tên, Số điện thoại hoặc Số CCCD 12 chữ số.
  3. Bấm "+ Thêm khách thuê" -> Nhập họ tên, SĐT, Email, CCCD, Gán vào phòng còn trống.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/tenants`: Truy vấn collection `tenants` kèm thông tin phòng đang thuê.
  - `POST /api/tenants`: Backend kiểm tra chống trùng lặp SĐT/CCCD (`checkDuplicate`), tạo tài khoản liên kết nếu cần.

---

### 2.5. Quy trình Lập Hợp đồng Thuê 4 Bước & Thanh lý (Smart Checkout)
- **Hành động Demo:**
  1. Vào `/dashboard/contracts/new` trải nghiệm Stepper Wizard 4 bước:
     - **Bước 1 (Chọn phòng):** Chọn phòng còn trống.
     - **Bước 2 (Chọn khách thuê):** Chọn khách hoặc thêm nhanh.
     - **Bước 3 (Điều khoản & Dịch vụ):** Thiết lập Đơn giá điện (đ/kWh), Đơn giá nước (đ/m³), Chỉ số công tơ ban đầu, Phí internet, Phí rác, Thời hạn hợp đồng.
     - **Bước 4 (Ký duyệt & Kích hoạt):** Kiểm tra tóm tắt hợp đồng -> Bấm "Tạo hợp đồng".
  2. Cho thấy quy tắc an toàn: Hợp đồng đã cọc / đang hiệu lực sẽ tự động **khóa nút Chỉnh sửa** để đảm bảo tính pháp lý. Hợp đồng chưa ký có thể bấm **Xóa** để trả phòng về trạng thái trống.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/contracts`: Nhận thông tin hợp đồng -> Tạo record `Contract (status=0 - chờ ký)` -> Bắn sự kiện Socket.io thông báo đến thiết bị Người thuê.
  - `DELETE /api/contracts/:id`: Xóa hợp đồng chưa ký -> Cập nhật `Room.status = 0 (Trống)`.
  - `POST /api/contracts/:id/checkout-preview` & `POST /api/contracts/:id/checkout`: Tính toán chênh lệch công tơ điện nước cuối kỳ, khấu trừ vào tiền cọc, tự động xuất hóa đơn quyết toán hoàn cọc/thu thêm.

---

### 2.6. Quản lý Dịch vụ Đi Kèm & Cấu hình Đơn giá
- **Hành động Demo:**
  1. Mở `/dashboard/services`.
  2. Tạo dịch vụ mới (Ví dụ: "Gửi xe máy", "Vệ sinh hành lang", "Internet tốc độ cao").
  3. Chọn Chế độ tính phí: Cố định theo tháng (`FIXED`), Theo số lượng (`QUANTITY`), hoặc Theo đồng hồ (`METER`).
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/services` & `POST /api/services`: CRUD cấu hình dịch vụ trong collection `services`.

---

### 2.7. Lập Hóa đơn Hàng tháng & Tự động Phạt quá hạn
- **Hành động Demo:**
  1. Mở `/dashboard/invoices`.
  2. Bấm "Tạo hóa đơn" (hỗ trợ lập đơn lẻ theo từng phòng hoặc phát hành hàng loạt).
  3. Hệ thống tự động tính: `Tiền phòng + (Số điện mới - Số điện cũ) * Giá điện + (Số nước mới - Số nước cũ) * Giá nước + Phí dịch vụ`.
  4. Trình diễn cơ chế Cron Job ngầm: Tự động quét hóa đơn quá hạn sau ngày quy định và áp dụng phí phạt trễ hạn dựa theo chính sách (Billing Policy).
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/invoices`: Nhận `{ roomId, period, electricityNew, waterNew, ... }` -> Tự động tính toán tổng tiền `totalAmount` -> Tạo bản ghi `Invoice (status=0 - Unpaid)`.
  - Background Job `applyAllOverduePenalties`: Chạy định kỳ mỗi 15 phút, so khớp `dueDate < now` và cập nhật `lateFee` theo công thức tỷ lệ % hoặc mức phạt cố định.

---

### 2.8. Đối soát Thanh toán & Cổng VietQR / VNPAY
- **Hành động Demo:**
  1. Mở `/dashboard/payments` hoặc Drawer chi tiết hóa đơn.
  2. Hiển thị mã VietQR động chuẩn NAPAS kèm cú pháp chuyển khoản tự động nhận diện.
  3. Xem bảng đối soát giao dịch thanh toán thành công qua VNPAY / Chuyển khoản ngân hàng.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/payments`: Lấy lịch sử giao dịch `Transaction`.
  - `POST /api/payments/create-vnpay-url`: Sinh URL thanh toán có mã hóa chữ ký HMAC-SHA512 gửi sang cổng VNPAY.
  - `GET /api/vnpay/ipn`: Webhook nhận kết quả từ VNPAY -> Cập nhật trạng thái `Invoice.status = 1 (Paid)` -> Bắn thông báo Realtime Socket.io cho Chủ trọ & Khách thuê.

---

### 2.9. Xử lý Sự cố Sửa chữa (Ticketing System)
- **Hành động Demo:**
  1. Vào `/dashboard/repairs`.
  2. Xem danh sách yêu cầu sự cố do Người thuê gửi lên (Điện, Nước, Máy lạnh, Khóa cửa...).
  3. Xem ảnh chụp sự cố thực tế, cập nhật trạng thái từ `Chờ tiếp nhận` -> `Đang sửa` -> `Hoàn tất`.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/repairs`: Lấy danh sách phiếu báo hỏng.
  - `PUT /api/repairs/:id`: Cập nhật trạng thái và ghi chú phản hồi từ chủ trọ.

---

# PHẦN 3: KỊCH BẢN DEMO MOBILE APP - ROLE CHỦ TRỌ

### 3.1. Quét QR CCCD Bằng Camera Viewfinder
- **Hành động Demo:**
  1. Trên Mobile App Chủ trọ, mở mục "Thêm khách thuê" hoặc màn hình Đăng ký.
  2. Nhấn nút **"📷 Quét CCCD (Camera)"**.
  3. Camera Viewfinder xuất hiện với khung căn chỉnh chuẩn. Đưa mã QR trên thẻ CCCD vào khung.
  4. Thiết bị rung haptic nhẹ và tự động điền ngay lập tức: **Số CCCD 12 chữ số** và **Họ tên khách thuê** bằng chữ in hoa.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `Expo CameraView (BarcodeScanner - QR)`: Phân tích cú pháp chuỗi QR CCCD Việt Nam (`Số_CCCD|CMND|Họ_Tên|Ngày_Sinh|Giới_Tính|Địa_Chỉ|Ngày_Cấp`).
  - Fallback Vision: `POST /api/cccd/scan` gọi mô hình Gemini AI Vision nhận diện ảnh thẻ nếu mã QR bị mờ/trầy xước.

---

### 3.2. Quét Đồng Hồ Điện Nước AI (Camera OCR & Gemini Vision)
- **Hành động Demo:**
  1. Vào màn hình "Quét điện nước AI" trên Mobile.
  2. Chọn loại đồng hồ (Điện / Nước) và chọn Phòng cần chốt số.
  3. Bấm chụp ảnh công tơ điện -> Hiệu ứng Laser Scanner quét qua ảnh.
  4. Hệ thống AI tự động trích xuất dãy số hiển thị trên mặt đồng hồ và điền vào ô chỉ số mới.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/ocr/meter`: Nhận ảnh dạng base64.
  - *Luồng xử lý 2 lớp:*
    - Lớp 1: Tesseract OCR Engine lọc cụm số từ 3-6 chữ số.
    - Lớp 2: Nếu Tesseract không nhận diện được (ảnh thiếu sáng, mặt kính lóa), tự động chuyển tiếp sang **Google Gemini Vision (`@google/genai`)** để nhận dạng chính xác từng số trên vòng quay cơ học.

---

### 3.3. Trợ Lý AI Co-Pilot Trò Chuyện & Thao Tác Bằng Giọng Nói
- **Hành động Demo:**
  1. Bấm vào icon "Trợ lý AI 🤖".
  2. Hỏi AI bằng tiếng Việt hoặc tiếng Anh:
     - *"Tháng này có bao nhiêu phòng chưa đóng tiền phòng?"*
     - *"Tạo hợp đồng cho khách Nguyễn Văn A ở phòng 102 giá 3 triệu 5."*
  3. AI nhận diện Intent, phân quyền Role Chủ trọ, tổng hợp số liệu từ Database và trả lời kèm nút thao tác trực tiếp.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/ai/chat`: Nhận câu hỏi + History + Role Token.
  - Kiểm tra bảo mật Policy `aiRoleVerification.js` (Chặn Người thuê hỏi dữ liệu doanh thu của Chủ trọ).
  - Hệ thống Dual-Key Gemini API: Tự động dùng `GEMINI_LANDLORD_API_KEY`, nếu gặp Rate-limit 429 sẽ tự động fallback sang secondary key dự phòng mà không làm gián đoạn người dùng.

---

### 3.4. Duyệt Hợp Đồng & Quyết Toán Trả Phòng (Smart Checkout Settlement)
- **Hành động Demo:**
  1. Vào danh sách Hợp đồng trên Mobile -> Lọc các hợp đồng "Chờ ký" hoặc "Chờ duyệt".
  2. Bấm "Duyệt hợp đồng" -> Hệ thống kích hoạt trạng thái hiệu lực ngay trên điện thoại.
  3. Khi khách trả phòng -> Bấm "Duyệt trả phòng", nhập số điện nước cuối cùng -> Xem bảng preview hoàn trả tiền cọc hoặc thu thêm.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/contracts/:id/approve`: Cập nhật `Contract.status = 1 (Hiệu lực)` và `Room.status = 1 (Đang thuê)`.
  - `POST /api/contracts/:id/checkout`: Khấu trừ công nợ, xuất hóa đơn quyết toán `Invoice` loại Checkout.

---

# PHẦN 4: KỊCH BẢN DEMO MOBILE APP - ROLE NGƯỜI THUÊ

### 4.1. Trải nghiệm Đăng nhập & Trang chủ Người thuê
- **Hành động Demo:**
  1. Đăng nhập tài khoản Khách thuê (Role = 2).
  2. Giao diện tự động chuyển đổi sang UI dành riêng cho Người thuê: Xem thông tin phòng đang thuê, thẻ hợp đồng hiện tại, trạng thái tiền phòng tháng này.

---

### 4.2. Ký Hợp Đồng Thuê Phòng Điện Tử 1 Chạm
- **Hành động Demo:**
  1. Mở tab "Hợp đồng của tôi".
  2. Xem toàn bộ điều khoản: Tiền thuê, Tiền cọc, Ngày bắt đầu/kết thúc, Đơn giá điện nước đã thỏa thuận.
  3. Nhấn nút **"✍️ Ký xác nhận hợp đồng"**.
  4. Hợp đồng chuyển sang trạng thái đã ký, tự động gửi thông báo Realtime lên Dashboard Chủ trọ.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/me/contract`: Lấy hợp đồng gắn với tài khoản đang đăng nhập.
  - `POST /api/contracts/:id/sign`: Cập nhật chữ ký điện tử, đổi trạng thái hợp đồng, phát sinh thông báo thanh toán tiền cọc.

---

### 4.3. Tra Cứu Hóa Đơn & Thanh Toán Trực Tuyến
- **Hành động Demo:**
  1. Vào mục "Hóa đơn".
  2. Xem chi tiết hóa đơn: Số điện tiêu thụ (Số cũ -> Số mới), Số khối nước, Phí internet, Tiền phòng.
  3. Bấm **"Thanh toán ngay"** -> Chọn thanh toán qua cổng VNPAY (Thẻ ATM/QR Pay) hoặc quét mã VietQR ngân hàng.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `GET /api/me/invoices`: Lấy lịch sử và hóa đơn hiện tại của khách.
  - `POST /api/payments/create-vnpay-url`: Mở SDK WebView/Trình duyệt để khách thanh toán an toàn qua cổng ngân hàng.

---

### 4.4. Gửi Yêu Cầu Báo Hỏng / Sửa Chữa Kèm Ảnh Chụp
- **Hành động Demo:**
  1. Vào tab "Sửa chữa" -> Bấm "Tạo yêu cầu mới".
  2. Chọn loại sự cố (Điện, Nước, Máy lạnh...), nhập mô tả chi tiết, chụp 1-3 ảnh thực tế sự cố.
  3. Bấm "Gửi yêu cầu" -> Ngay lập tức chuông thông báo trên WebAdmin của Chủ trọ đổ chuông báo hiệu.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/repairs`: Upload ảnh dạng multipart/base64 -> Lưu bản ghi `Repair (status='pending')` -> Kích hoạt `socket.emit('new_repair_request')` đến room của Chủ trọ.

---

### 4.5. AI Trợ Lý Dành Riêng Cho Người Thuê
- **Hành động Demo:**
  1. Khách thuê hỏi AI: *"Khi nào đến hạn đóng tiền phòng tháng này?"*, *"Quy định gửi xe và giờ đóng cổng của nhà trọ là gì?"*.
  2. AI tra cứu thông tin hóa đơn và chính sách của nhà trọ để trả lời chính xác, ân cần.
- **Trích dẫn API & Luồng Dữ liệu:**
  - `POST /api/ai/chat`: Áp dụng Prompt chuyên biệt cho Tenant, chỉ cho phép truy xuất dữ liệu trong phạm vi phòng của chính khách thuê đó.

---

# PHẦN 5: BẢNG TỔNG HỢP API & KIẾN TRÚC LUỒNG DỮ LIỆU

| Module chức năng | Phương thức & Endpoint | Role | Công nghệ / Dịch vụ tích hợp |
|---|---|:---:|---|
| **Xác thực Đăng nhập/Ký** | `POST /api/auth/login`<br>`POST /api/auth/register-landlord` | All | JWT, Bcrypt, Role Middleware |
| **Thống kê Dashboard** | `GET /api/dashboard/stats` | Chủ trọ | MongoDB Aggregation Pipelines |
| **Quản lý Phòng trọ** | `GET/POST/PUT/DELETE /api/rooms` | Chủ trọ | MongoDB Collection `rooms` |
| **Quản lý Khách thuê** | `GET/POST /api/tenants` | Chủ trọ | Anti-duplicate checks, Accounts linking |
| **Lập & Duyệt Hợp đồng** | `POST /api/contracts`<br>`POST /api/contracts/:id/sign`<br>`POST /api/contracts/:id/checkout` | Both | Socket.io Realtime, Smart Checkout Settlement |
| **Hóa đơn & Dịch vụ** | `GET/POST /api/invoices`<br>`GET/POST /api/services` | Both | Automated Calculation Engine, Overdue Cron Job |
| **Quét OCR Điện Nước** | `POST /api/ocr/meter` | Chủ trọ | Tesseract.js Engine + Google Gemini Vision Fallback |
| **Quét QR / OCR CCCD** | `POST /api/cccd/scan` | Chủ trọ | Expo Camera Barcode Parser + Gemini Vision |
| **Thanh toán Trực tuyến** | `POST /api/payments/create-vnpay-url`<br>`GET /api/vnpay/ipn` | Both | VNPAY Payment Gateway, VietQR NAPAS |
| **Báo hỏng & Sửa chữa** | `GET/POST /api/repairs`<br>`PUT /api/repairs/:id` | Both | Cloud Image Storage, Realtime Notification |
| **AI Co-Pilot Assistant** | `POST /api/ai/chat` | Both | Gemini-1.5-Flash, Dual API Keys, Role Guard Policy |

---

# PHẦN 6: LỜI KẾT & ĐIỂM NỔI BẬT THUYẾT PHỤC HỘI ĐỒNG

> **Presenter chốt lại 4 điểm đột phá:**
> 1. **Kiến trúc All-in-One hoàn chỉnh:** 100% đồng bộ giữa WebAdmin Next.js và Mobile App 2 Role.
> 2. **Ứng dụng Trí tuệ Nhân tạo thực tế:** Không chỉ dừng lại ở Chatbot mà ứng dụng sâu vào OCR nhận diện công tơ điện nước và quét CCCD tự động.
> 3. **Trải nghiệm người dùng cao cấp:** Giao diện Bento Grid iOS 18, hỗ trợ song ngữ 100% tiếng Việt / tiếng Anh, chế độ Sáng/Tối linh hoạt.
> 4. **Tự động hóa tài chính:** Tích hợp VNPAY, VietQR động và cơ chế tự động tính phạt quá hạn minh bạch, an toàn.

---
*Tài liệu được biên soạn phục vụ buổi báo cáo nghiệm thu và thuyết trình đề tài dự án TroHub.*
