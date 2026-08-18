# HƯỚNG DẪN SỬ DỤNG CHI TIẾT TROHUB WEBADMIN VÀ MOBILE APP (IOS)

> **Tài liệu Hướng dẫn Thao tác Hệ thống Quản lý Nhà trọ Thông minh TroHub**  
> **Dành cho:** Chủ trọ (Landlord / Admin) & Cư dân Khách thuê (Tenant)  
> **Nền tảng hỗ trợ:** WebAdmin (Web Browser) & Mobile App (iOS Simulator / Native App)  
> **Cập nhật ngày:** 12/08/2026  

---

## 📌 TỔNG QUAN HỆ THỐNG TROHUB

**TroHub** là hệ sinh thái quản lý nhà trọ và vận hành bất động sản cho thuê đa nền tảng thế hệ mới. Hệ thống kết hợp giữa nền tảng **WebAdmin** dành cho Quản trị viên/Chủ trọ và **Mobile App (iOS)** dành cho Cư dân & Chủ trọ di động.

### Các điểm đột phá công nghệ tích hợp trong TroHub:
1. **Trợ lý AI Co-Pilot**: Tự động hóa điền biểu mẫu (Auto-fill Form) và tương tác ra lệnh bằng giọng nói (Voice Command 🎙️).
2. **Quét QR Code CCCD**: Tự động bóc tách thông tin 12 số CCCD, Họ tên, Ngày sinh để lập hồ sơ cư dân trong 2 giây.
3. **Chốt số Điện Nước tự động**: Tự lấy chỉ số cũ từ Hợp đồng và kế thừa đơn giá để tính tiền thời gian thực.
4. **Quyết toán Trả phòng (Checkout Settlement)**: Tự động đối soát công nợ, thời hạn ở thực tế và khấu trừ tiền cọc trực tiếp.
5. **Hệ thống Thông báo Phân loại 4 Nhóm**: Tự động đẩy thông báo Quả chuông 🔔 kèm Badge đỏ theo nhóm Hóa đơn, Sửa chữa, Hợp đồng và Hệ thống.

---

## PHẦN I: PHÂN HỆ ĐĂNG KÝ & ĐĂNG NHẬP (AUTH FLOW)

### 1.1 Màn hình Đăng nhập (Login Screen)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Đăng nhập](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step1_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Đăng nhập](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step1_1.png)

* **Mô tả hành động cụ thể:**
  1. Mở trình duyệt truy cập `http://localhost:3000` (WebAdmin) hoặc mở ứng dụng **TroHub Mobile App** trên thiết bị iOS.
  2. Chọn tab vai trò tài khoản: **Chủ trọ (Admin)** hoặc **Người thuê (Tenant)**.
  3. Nhập **Số điện thoại** (hoặc Email đăng ký) và **Mật khẩu**.
  4. Nhấn nút **Đăng nhập**. Hệ thống sẽ xác thực JWT token và chuyển hướng trực tiếp vào màn hình bảng điều khiển Dashboard.

---

### 1.2 Màn hình Đăng ký Chủ trọ với ô Mã mời 6 số & Địa chỉ GPS

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Đăng ký Chủ trọ](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step1_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Đăng ký Chủ trọ](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step1_2.png)

* **Mô tả hành động cụ thể:**
  1. Tại màn hình Đăng nhập, bấm chọn **Yêu cầu mã mời / Đăng ký tài khoản Chủ trọ**.
  2. Nhập các thông tin bắt buộc: Họ và tên, Số điện thoại, Email và Mật khẩu khởi tạo.
  3. **Nhập Mã mời 6 số (Invite Code)** được cấp bởi Hệ thống Super-Admin để mở khóa quyền quản trị nhà trọ.
  4. Bấm nút **Lấy vị trí hiện tại (GPS)** để tự động điền Tọa độ kinh độ/vĩ độ và Địa chỉ nhà trọ chính xác trên bản đồ.
  5. Bấm **Hoàn tất Đăng ký**.

---

### 1.3 Thao tác Đổi Ngôn ngữ hệ thống (`VI` ➔ `EN`)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Đổi ngôn ngữ](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step1_3.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Đổi ngôn ngữ](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step1_3.png)

* **Mô tả hành động cụ thể:**
  1. Quan sát nút chuyển đổi ngôn ngữ ở góc trên bên phải thanh Header (WebAdmin) hoặc trong mục Cài đặt (Mobile App).
  2. Nhấp vào icon/nút **`VI` / `EN`**.
  3. Toàn bộ các nhãn menu, tiêu đề bảng, thông báo Toast và biểu mẫu sẽ lập tức chuyển đổi ngữ cảnh từ **Tiếng Việt (`VI`)** sang **Tiếng Anh (`EN`)** hoặc ngược lại mà không làm mất dữ liệu đang nhập.

---

## PHẦN II: PHÂN HỆ QUẢN LÝ PHÒNG TRỌ (ROOMS FLOW)

### 2.1 Màn hình Quản lý Phòng phân nhóm theo Tầng (`Floor Grouping`)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Danh sách phòng theo Tầng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step2_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Danh sách phòng theo Tầng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step2_1.png)

* **Mô tả hành động cụ thể:**
  1. Truy cập vào mục **Quản lý phòng** (`/dashboard/rooms`).
  2. Giao diện tự động phân nhóm các thẻ phòng theo từng **Tầng (Floor Grouping)** trực quan (VD: Tầng 1, Tầng 2, Tầng 3).
  3. Mỗi thẻ phòng hiển thị rõ:
     - **Mã phòng** (VD: P.101, P.202).
     - **Trạng thái màu sắc**: Màu xanh (Đang ở), Màu cam (Đang trống), Màu đỏ (Cần bảo trì).
     - **Đơn giá thuê mặc định** và **Diện tích phòng ($m^2$)**.

---

### 2.2 Bảng Modal `+ Thêm phòng mới`

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Thêm phòng mới](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step2_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Thêm phòng mới](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step2_2.png)

* **Mô tả hành động cụ thể:**
  1. Nhấp nút **`+ Thêm phòng mới`** ở góc phải màn hình.
  2. Cửa sổ Modal hiển thị gồm các trường dữ liệu:
     - **Mã/Số phòng**: Nhập mã định danh phòng (VD: P.305).
     - **Số tầng**: Nhập hoặc chọn số tầng tương ứng (VD: Tầng 3).
     - **Diện tích**: Nhập số mét vuông (VD: $25 m^2$).
     - **Giá thuê mặc định**: Nhập giá phòng (VD: `3.500.000 VNĐ`).
     - **Tiền cọc mặc định**: Tự động gợi ý bằng 1 tháng tiền nhà.
  3. Nhấn **Lưu phòng**. Phòng mới sẽ lập tức xuất hiện trong nhóm tầng tương ứng.

---

## PHẦN III: PHÂN HỆ DANH BẠ NGƯỜI THUÊ (TENANTS FLOW)

### 3.1 Màn hình Danh sách Người thuê (với nhãn `Chưa xếp phòng`)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Danh sách người thuê](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step3_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Danh sách người thuê](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step3_1.png)

* **Mô tả hành động cụ thể:**
  1. Truy cập phân hệ **Cư dân / Người thuê** (`/dashboard/tenants`).
  2. Bảng danh sách quản lý thông tin cư dân với đầy đủ Họ tên, Số điện thoại, Số CCCD và Ngày tham gia.
  3. Các cư dân mới đăng ký chưa gán vào hợp đồng sẽ hiển thị nhãn nổi bật màu xám: **`Chưa xếp phòng`**. Các cư dân đã ký hợp đồng sẽ có nhãn xanh ghi rõ mã phòng đang lưu trú.

---

### 3.2 Bảng Modal `+ Thêm người thuê` (Gõ SĐT tra cứu DB tự động)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Thêm người thuê](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step3_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Thêm người thuê](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step3_2.png)

* **Mô tả hành động cụ thể:**
  1. Nhấn nút **`+ Thêm người thuê`**.
  2. Nhập **Số điện thoại** của khách thuê vào ô tra cứu.
  3. **Tính năng Auto-Lookup DB**: Hệ thống tự động truy vấn Cơ sở dữ liệu TroHub. Nếu số điện thoại này đã có tài khoản trên hệ thống, các ô *Họ và tên, Email, Số CCCD* sẽ tự động được điền đầy đủ mà không cần gõ thủ công.
  4. Nhấn **Xác nhận thêm cư dân**.

---

### 3.3 Màn hình Camera ngắm tiêu điểm quét mã QR CCCD tự điền 12 số

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Quét mã QR CCCD](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step3_3.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Quét mã QR CCCD](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step3_3.png)

* **Mô tả hành động cụ thể:**
  1. Tại Modal thêm/cập nhật người thuê, bấm chọn biểu tượng **`Quét QR CCCD`**.
  2. Giao diện Camera xuất hiện khung ngắm tiêu điểm định vị góc thẻ CCCD.
  3. Căn chỉnh mã QR Code trên Căn cước công dân vào giữa tiêu điểm.
  4. Hệ thống lập tức bóc tách chuỗi dữ liệu chuẩn hóa, tự động điền: **12 số CCCD**, **Họ và tên**, **Ngày tháng năm sinh** và **Địa chỉ thường trú**.

---

## PHẦN IV: PHÂN HỆ HỢP ĐỒNG & QUYẾT TOÁN (CONTRACTS & SETTLEMENT FLOW)

### 4.1 Màn hình Danh sách Hợp đồng thuê

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Danh sách hợp đồng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step4_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Danh sách hợp đồng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step4_1.png)

* **Mô tả hành động cụ thể:**
  1. Vào trang **Quản lý Hợp đồng** (`/dashboard/contracts`).
  2. Xem danh sách chi tiết các hợp đồng: Số hợp đồng, Phòng thuê, Đại diện người thuê, Ngày bắt đầu - Ngày kết thúc, Tiền cọc đã giữ và Trạng thái (Đang hiệu lực, Sắp hết hạn, Đã thanh lý).

---

### 4.2 Luồng Tạo Hợp đồng mới (Chọn phòng ➔ Chọn người thuê ➔ Điền tiền nhà/điện nước)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Tạo hợp đồng mới](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step4_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Tạo hợp đồng mới](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step4_2.png)

* **Mô tả hành động cụ thể:**
  1. Nhấn **`+ Lập Hợp đồng mới`**.
  2. **Bước 1**: Chọn Phòng trống trong danh sách.
  3. **Bước 2**: Chọn Người thuê đại diện đứng tên từ danh bạ cư dân.
  4. **Bước 3**: Điền thông tin tài chính hợp đồng:
     - Giá thuê phòng cố định hàng tháng.
     - Số tiền đặt cọc giữ phòng.
     - Đơn giá Điện ($VNĐ/kWh$) & Đơn giá Nước ($VNĐ/m^3$ hoặc $VNĐ/người$).
     - Chỉ số điện/nước ban đầu khi bàn giao.
  5. Nhấn **Ký và Lưu Hợp đồng**.

---

### 4.3 Modal Quyết toán Trả phòng (`Checkout Settlement`)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Quyết toán trả phòng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step4_3.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Quyết toán trả phòng](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step4_3.png)

* **Mô tả hành động cụ thể:**
  1. Chọn hợp đồng cần thanh lý, bấm **Quyết toán Trả phòng**.
  2. Cửa sổ **Checkout Settlement** tự động tính toán thời gian thực:
     - **Tiền cọc ban đầu giữ của khách**: $+ \text{Tiền cọc}$.
     - **Dư nợ các hóa đơn cũ chưa trả**: $- \text{Nợ cũ}$.
     - **Tiền điện/nước phát sinh đến ngày trả**: $- \text{Điện nước lẻ}$.
     - **Chi phí hư hỏng/bồi thường (nếu có)**.
  3. Kết xuất con số cuối cùng: **Số tiền Chủ trọ cần hoàn lại cho khách** hoặc **Số tiền Khách cần đóng thêm**.
  4. Nhấn **Xác nhận Thanh lý Hợp đồng**.

---

## PHẦN V: PHÂN HỆ CHỐT ĐIỆN NƯỚC & LẬP HÓA ĐƠN (METERS & INVOICES FLOW)

### 5.1 Màn hình Chốt chỉ số Điện Nước

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Chốt chỉ số Điện Nước](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step5_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Chốt chỉ số Điện Nước](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step5_1.png)

* **Mô tả hành động cụ thể:**
  1. Vào phân hệ **Chỉ số Điện Nước** (`/dashboard/utilities`).
  2. Chọn Kỳ chốt số (Tháng/Năm).
  3. Hệ thống tự động **Auto-fill Chỉ số Điện/Nước cũ** từ hợp đồng hoặc kỳ chốt trước.
  4. Chủ trọ chỉ cần nhập **Chỉ số mới**. Hệ thống tự động tính ra **Sản lượng tiêu thụ** và thành tiền dự kiến.

---

### 5.2 Modal Tạo Hóa đơn hàng loạt (Auto-populate `electricityPrice` & `waterPrice`)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Tạo hóa đơn hàng loạt](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step5_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Tạo hóa đơn hàng loạt](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step5_2.png)

* **Mô tả hành động cụ thể:**
  1. Chuyển sang mục **Hóa đơn** (`/dashboard/invoices`), nhấn **`Tạo Hóa đơn hàng loạt`**.
  2. Chọn tháng phát hành hóa đơn.
  3. Hệ thống tự động trích xuất `electricityPrice` và `waterPrice` cài đặt sẵn trong từng hợp đồng phòng.
  4. Nhấn **Phát hành hàng loạt**. Tất cả phòng trọ sẽ nhận được hóa đơn chi tiết ngay lập tức trên Mobile App.

---

### 5.3 Modal Chi tiết Hóa đơn (Hiển thị chi tiết số điện/nước cũ & mới)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Chi tiết Hóa đơn](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step5_3.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Chi tiết Hóa đơn](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step5_3.png)

* **Mô tả hành động cụ thể:**
  1. Nhấp chọn một hóa đơn bất kỳ trong danh sách.
  2. Cửa sổ Chi tiết Hóa đơn mở ra bảng kê minh bạch:
     - **Tiền phòng hàng tháng**.
     - **Tiền điện**: $(\text{Số mới} - \text{Số cũ}) \times \text{Đơn giá}$.
     - **Tiền nước**: $(\text{Số mới} - \text{Số cũ}) \times \text{Đơn giá}$.
     - **Phí dịch vụ khác** (Rác, Internet, Vệ sinh).
     - **Tổng cộng tiền cần thanh toán** và Mã QR Thanh toán ngân hàng tự động.

---

## PHẦN VI: PHÂN HỆ TRỢ LÝ AI & THÔNG BÁO QUẢ CHUÔNG 🔔 (AI & NOTIFICATIONS)

### 6.1 Quả chuông 🔔 nhảy Badge đỏ và danh sách thông báo phân loại 4 nhóm

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Thông báo Quả chuông](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step6_1.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Thông báo Quả chuông](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step6_1.png)

* **Mô tả hành động cụ thể:**
  1. Khi có sự kiện mới (khách đóng tiền, sự cố hư hỏng, hợp đồng sắp hết hạn), biểu tượng **Quả chuông 🔔** sẽ xuất hiện **Badge màu đỏ** hiển thị số lượng tin chưa đọc.
  2. Nhấp vào Quả chuông để mở danh sách thông báo thông minh được phân thành 4 nhóm tab riêng biệt:
     - **Hóa đơn & Thanh toán** 💳
     - **Báo cáo Sửa chữa & Sự cố** 🛠️
     - **Hợp đồng & Cư dân** 📜
     - **Thông báo Hệ thống** ⚙️

---

### 6.2 Cửa sổ Trợ lý TroHub AI Co-Pilot (Hỗ trợ Auto-fill Form & Giọng nói 🎙️)

* **Ảnh minh họa WebAdmin:**
  ![WebAdmin - Trợ lý AI Co-Pilot](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/web_step6_2.png)

* **Ảnh minh họa iOS App:**
  ![iOS App - Trợ lý AI Co-Pilot](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/ios_step6_2.png)

* **Mô tả hành động cụ thể:**
  1. Nhấn nút kích hoạt **Trợ lý AI TroHub Co-Pilot** ở góc dưới màn hình.
  2. **Ra lệnh bằng Giọng nói 🎙️**: Nhấn giữ nút Micro và nói lệnh (VD: *"Tạo cho tôi phòng 204 giá 3 triệu"* hoặc *"Tạo hóa đơn tháng 8 cho phòng 101"*).
  3. **Tự động điền Form (Auto-fill)**: AI phân tích ngôn ngữ tự nhiên từ giọng nói hoặc câu chat, tự động trích xuất các thông số và điền chính xác vào các ô biểu mẫu tạo phòng, tạo hóa đơn hay lập hợp đồng mà không cần gõ bàn phím.

---

## 🎯 TỔNG KẾT VÀ QUY TRÌNH VẬN HÀNH CHUẨN

Tài liệu trên hướng dẫn chi tiết 100% quy trình vận hành từng bước trên cả 2 nền tảng **WebAdmin** và **Mobile App iOS** của hệ thống TroHub. Sự kết hợp giữa bộ đôi ứng dụng này giúp Chủ trọ tiết kiệm 80% thời gian quản lý, loại bỏ sai sót số liệu điện nước và tối ưu trải nghiệm sống cho cư dân.
