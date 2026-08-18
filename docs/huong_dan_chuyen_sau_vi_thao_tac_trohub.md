# HƯỚNG DẪN CHUYÊN SÂU VI THAO TÁC TROHUB

**Phạm vi:** WebAdmin `http://localhost:3000` và kiểm tra khả năng chạy iOS Simulator.  
**Ngày kiểm tra:** 12/08/2026  
**Phương pháp:** Playwright/Chrome headless với viewport 1440×1000, locale `vi-VN`; các phản hồi demo (tra cứu người thuê, thông báo, reset OTP) được mock để quan sát trạng thái UI mà không ghi dữ liệu thật. Các thao tác tài chính/duyệt trả phòng không được bấm xác nhận cuối.

## 0. Điều kiện vận hành

1. Khởi động Backend tại `http://localhost:5000` và WebAdmin tại `http://localhost:3000`.
2. Đăng nhập bằng tài khoản quản trị được cấp; không chia sẻ mật khẩu hoặc OTP trong ảnh chụp thật.
3. Kiểm tra quyền camera/vị trí trước khi dùng OCR/GPS.
4. Các nút **Phát hành**, **Duyệt trả phòng**, **Tạo mới & Liên kết** là thao tác ghi dữ liệu hoặc ảnh hưởng tài chính; kiểm tra lại số liệu trước khi xác nhận.

## 1. Đăng ký, đăng nhập và khôi phục mật khẩu

### 1.1 Đăng nhập và ngôn ngữ

Màn hình này là cổng vào của chủ trọ. Nhập số điện thoại/email và mật khẩu, sau đó chọn `login`. Nút chuyển đổi `VI/EN` nằm ở góc phải; ảnh cho thấy bản dịch hiện còn một số khóa nội bộ (`welcomeBack`, `loginDescription`, `phoneOrEmail`) và cần rà soát i18n trước khi phát hành.

![Step 1.1a — Đăng nhập mặc định](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_1_1a_login_vi.png)

**Step 1.1a:** Xác nhận form, checkbox ghi nhớ và liên kết đăng ký.  
**Step 1.1b:** Bấm `VI/EN`, kiểm tra toàn bộ tiêu đề, nhãn, placeholder và thông báo lỗi đổi ngôn ngữ.

![Step 1.1b — Đổi VI sang EN](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_1_1b_login_en.png)

### 1.2 Đăng ký chủ trọ và GPS

Chọn **Đăng ký tài khoản quản trị mới**, nhập mã mời 6 số, họ tên, email, CCCD và địa chỉ. Mã mời phải được cấp từ quản trị hệ thống.

![Step 1.2a — Mã mời 6 số](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_2_1a_register_invite.png)

**Step 1.2a:** Nhập đủ 6 chữ số; không dùng mã đã lộ trong môi trường production.  
**Step 1.2b:** Cho phép vị trí, bấm **Lấy vị trí GPS hiện tại**, đối chiếu địa chỉ tự điền với địa chỉ thực tế trước khi lưu.

![Step 1.2b — GPS điền địa chỉ](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_2_1b_register_gps_filled.png)

### 1.3 Quên mật khẩu — ba bước

![Step 1.3a — Nhập số điện thoại](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_3a_forgot_password_initial.png)

1. **Bước 1:** Nhập SĐT/tên đăng nhập rồi bấm **Gửi mã xác minh**.
2. **Bước 2:** Nhập OTP 6 số; chỉ tiếp tục khi OTP còn hiệu lực.
3. **Bước 3:** Nhập mật khẩu mới và xác nhận; mật khẩu phải đạt chính sách tối thiểu.

![Step 1.3b — Nhập OTP](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_3b_forgot_password_otp.png)

![Step 1.3c — Mật khẩu mới](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/01_3c_forgot_password_new_password.png)

## 2. Quản lý phòng trọ

Màn hình phòng giúp theo dõi phòng trống/đang thuê theo từng tầng.

![Step 2.1a — Nhóm phòng theo tầng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/02_1a_rooms_all.png)

**Step 2.1a:** Dùng tab **Tất cả** để xem toàn bộ phòng; kiểm tra mã phòng, giá thuê, diện tích và trạng thái.  
**Step 2.1b:** Chọn tab `floor 1`/`Tầng 1` để lọc đúng tầng; thử lại `Tầng 2` khi đối soát.

![Step 2.1b — Lọc theo tầng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/02_1b_rooms_floor_filter.png)

**Step 2.2a:** Bấm **Thêm phòng mới** để mở modal.

![Step 2.2a — Modal tạo phòng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/02_2a_room_create_modal.png)

**Step 2.2b:** Nhập mã phòng, giá thuê, diện tích và tầng; kiểm tra định dạng tiền tệ trước khi bấm **Lưu phòng mới**. Ảnh dưới là trạng thái đã điền, chưa ghi bản ghi demo vào cơ sở dữ liệu.

![Step 2.2b — Đã điền thông tin phòng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/02_2b_room_filled.png)

### 2.2. Thao tác Thêm Phòng Mới theo Tầng trên App Admin (iOS Simulator)

Toàn bộ luồng tạo phòng mới trên thiết bị di động được thực hiện từng bước như sau:

#### Step 1: Nút bấm [+ Thêm phòng] tại Giao diện Quản lý Phòng (`AdminRoomsScreen.tsx`)
![Mobile App - Danh sách phòng và Nút Thêm](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/app_ios_step2_1_room_list.png)
*Chú thích:* Trên ứng dụng di động Mobile App (`AdminRoomsScreen.tsx`), giao diện hiển thị danh sách phòng gom nhóm theo Tầng kèm nút bấm nổi/cố định **`[+ Thêm phòng]`** ở phía trên hoặc dưới màn hình.

#### Step 2: Form Modal "Thêm phòng mới" bật lên sau khi bấm nút (`AddRoomModal.tsx`)
![Mobile App - Form Modal Thêm phòng mới mở](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/app_ios_step2_2_add_room_modal_open.png)
*Chú thích:* Ngay sau khi người dùng nhấp vào nút `+ Thêm phòng`, giao diện Modal tạo phòng nảy lên mượt mà (`AddRoomModal.tsx`), hiển thị các ô nhập liệu bắt buộc:
- **Số / Mã phòng**: Nhập mã định danh phòng (VD: `Phòng 301`).
- **Tầng (Floor)**: Chọn số tầng lưu trú (VD: `Tầng 3`).
- **Giá thuê hàng tháng**: Nhập đơn giá phòng (VD: `4.500.000đ`).
- **Tiền cọc**: Nhập số tiền đặt cọc giữ phòng (VD: `4.500.000đ`).

#### Step 3: Form đã nhập dữ liệu mẫu và Nút `[Lưu phòng]`
![Mobile App - Form đã nhập dữ liệu mẫu](file:///Users/nguyen/TroHub_Local/docs/assets/screenshots/app_ios_step2_3_add_room_filled.png)
*Chú thích:* Màn hình hiển thị trạng thái Form Modal sau khi đã nhập đầy đủ các thông tin phòng mẫu (Phòng 301 - Tầng 3 - Giá 4.500.000đ - Tiền cọc 4.500.000đ). Người dùng rà soát lại thông tin và bấm nút **`[Lưu phòng]`** để lưu vào cơ sở dữ liệu.

## 3. Danh bạ người thuê và CCCD/OCR

### 3.1 Danh bạ

![Step 3.1 — Danh sách người thuê](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/03_1_tenants_directory.png)

Kiểm tra các nhãn **Chưa xếp phòng** để tìm hồ sơ chưa liên kết. Không xóa hồ sơ chỉ vì chưa xếp phòng; đây là trạng thái nghiệp vụ hợp lệ.

### 3.2 Thêm và tra cứu real-time

![Step 3.2a — Modal thêm người thuê](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/03_2a_tenant_modal.png)

1. Bấm **Thêm người thuê**.
2. Nhập SĐT `0909999993` (hoặc CCCD/email đã xác minh).
3. Chờ trạng thái tra cứu; không bấm submit khi đang loading.

![Step 3.2b — Đang tra cứu DB](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/03_2b_tenant_lookup_loading.png)

![Step 3.2c — Đã tìm thấy hồ sơ](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/03_2c_tenant_lookup_found.png)

Khi thấy **Đã tìm thấy tài khoản**, kiểm tra họ tên/CCCD và chỉ liên kết đúng phòng. Nếu thấy **Chưa có tài khoản**, hệ thống sẽ tạo mới với mật khẩu tạm; yêu cầu người thuê đổi mật khẩu ngay lần đầu.

### 3.3 Camera CCCD

![Step 3.3 — Trường CCCD trên WebAdmin](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/03_3_cccd_field_webadmin.png)

WebAdmin hiện hiển thị trường CCCD nhập thủ công, không có nút camera/OCR trong runtime browser. Thành phần `CCCDScannerModal` tồn tại trong Mobile App; cần build app iOS thành công và cấp quyền camera trước khi chụp trạng thái khung quét 260×260 px. Không nhập hoặc lưu số CCCD giả chỉ để vượt kiểm tra.

## 4. Hợp đồng và quyết toán trả phòng

### 4.1 Danh sách và trạng thái

![Step 4.1 — Danh sách hợp đồng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/04_1_contracts_list.png)

Các trạng thái cần hiểu đúng: **Chờ ký**, **Đang hiệu lực**, **Trả phòng** và **Bản nháp**. Đối chiếu người thuê, phòng, tiền cọc và ngày bắt đầu trước khi gửi ký.

### 4.2 Tạo hợp đồng và chỉ số đầu kỳ

![Step 4.2a — Form hợp đồng mới](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/04_2a_new_contract_step1.png)

1. Chọn phòng còn trống.
2. Chọn người thuê đã xác minh từ danh bạ.
3. Kiểm tra ngày bắt đầu/kết thúc, tiền thuê, tiền cọc và đơn giá điện/nước.

![Step 4.2b — Kế thừa chỉ số điện nước](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/04_2b_new_contract_inherited_meters.png)

Khi chọn phòng, chỉ số điện/nước đầu kỳ được kế thừa từ ledger của phòng. Nếu số liệu bất thường, dừng quy trình và đối chiếu ảnh đồng hồ/biên bản bàn giao.

### 4.3 Checkout Settlement

![Step 4.3a — Modal quyết toán](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/04_3a_checkout_modal.png)

**Step 4.3a:** Trong tab **Trả phòng**, bấm **Duyệt trả phòng**.  ̀
**Step 4.3b:** Nhập chỉ số điện/nước cuối kỳ, tiền hư hại và ghi chú; đọc lại tổng nợ, tiền điện nước cuối kỳ và số tiền hoàn/truy thu.

![Step 4.3b — Cân đối cọc sau khi điền](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/04_3b_checkout_filled_balance.png)

Ảnh chỉ ghi nhận trạng thái xem trước; nút xác nhận cuối không được bấm trong kiểm thử tài liệu. Khi vận hành thật, lưu biên bản bàn giao và chỉ xác nhận sau khi hai bên thống nhất số tiền.

## 5. Điện nước và hóa đơn

### 5.1 Chốt chỉ số

![Step 5.1a — Chỉ số cũ và mới](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/05_1a_utilities_old_new.png)

1. Mở **Điện & Nước**.
2. Kiểm tra chỉ số cũ được nạp từ hợp đồng.
3. Nhập chỉ số mới theo ảnh đồng hồ; không cho phép số mới thấp hơn số cũ.

![Step 5.1b — Modal chụp/nhập chỉ số](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/05_1b_utilities_meter_choice_modal.png)

Camera browser dùng input ảnh `capture=environment`; nếu OCR không đọc được, chọn nhập tay và lưu ảnh gốc để đối soát.

### 5.2 Tạo hóa đơn hàng loạt

![Step 5.2a — Modal tạo hàng loạt](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/05_2a_invoice_bulk_modal.png)

**Step 5.2a:** Chọn kỳ và ngày phát hành; kiểm tra `electricityPrice`/`waterPrice` không rỗng.  
**Step 5.2b:** Chuyển tới **Preview**, kiểm tra số hóa đơn được chọn và tổng tiền dự kiến; chỉ sau đó mới đi tới **Phát hành**.

![Step 5.2b — Preview tổng tiền](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/05_2b_invoice_preview.png)

### 5.3 Chi tiết hóa đơn

![Step 5.3 — Chi tiết hóa đơn](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/05_3_invoice_detail.png)

Mở biểu tượng xem chi tiết để đối chiếu số điện/nước cũ, mới, kWh/m³ tiêu thụ, đơn giá, phí phòng và giảm trừ. Không phát hành nếu tổng không khớp biên bản.

## 6. Thông báo và TroHub AI Co-Pilot

### 6.1 Chuông thông báo

![Step 6.1a — Badge chưa đọc](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/06_1a_notification_badge.png)

Badge đỏ là số tin chưa đọc, không phải số tiền nợ. Bấm chuông để mở nhóm **Trả phòng**, **Sự cố**, **Hợp đồng** và **Thanh toán**.

![Step 6.1b — Bảng thông báo](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/06_1b_notification_panel.png)

Đọc nội dung và thời điểm, mở deep-link tới đúng phân hệ, sau đó dùng **Đánh dấu đã đọc**. Không đánh dấu hàng loạt nếu chưa xử lý các việc cần chú ý.

### 6.2 AI Co-Pilot và micro

![Step 6.2a — Nút nổi AI](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/06_2a_ai_closed.png)

![Step 6.2b — Cửa sổ TroHub AI](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/06_2b_ai_open.png)

1. Bấm **Trợ lý AI** để mở cửa sổ.
2. Gửi câu hỏi có phạm vi rõ ràng, không đưa mật khẩu/OTP/CCCD đầy đủ.
3. Dùng nút micro khi trình duyệt đã cấp quyền; kiểm tra lại nội dung AI tự điền trước khi lưu.

![Step 6.2c — Nút micro sẵn sàng](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/06_2c_ai_microphone_ready.png)

Ảnh ghi nhận nút micro và trạng thái sẵn sàng; việc thu âm thật phụ thuộc quyền microphone và Speech Recognition của trình duyệt.

## 7. Kiểm tra iOS Simulator

Simulator iPhone 17 Pro đã boot, nhưng build Mobile App không hoàn tất nên không có ảnh runtime Mobile App/OCR để nhúng. Lệnh `npx expo run:ios --device F6E012C0-3183-4CE0-9D2B-B82452CFA3AA` dừng với hai lỗi Xcode:

- `[CP] Copy XCFrameworks` của `Pods/ReactNativeDependencies` thất bại.
- Thiếu file build input `/Users/nguyen/TroHub_Local/targets/TroHubWidget/Info.plist`.

Ảnh dưới chỉ là bằng chứng màn hình Simulator tại thời điểm build lỗi, không phải ảnh chức năng Mobile App:

![Bằng chứng iOS Simulator — app chưa cài do lỗi build](file:///Users/nguyen/TroHub_Local/docs/screenshots/deep/ios_simulator_build_blocker.png)

### Cách hoàn tất phần Mobile sau khi sửa build

1. Bổ sung/khôi phục `targets/TroHubWidget/Info.plist` và xử lý script `[CP] Copy XCFrameworks`.
2. Chạy lại `npx expo run:ios --device F6E012C0-3183-4CE0-9D2B-B82452CFA3AA`.
3. Đăng nhập Mobile App, chụp riêng login, dashboard, `CCCDScannerModal` (khung 260×260), `MeterCameraModal` (khung 280×100), toast OCR và AI voice; sau đó cập nhật các mục Mobile tương ứng.

## 8. Nhật ký xác minh

- 31 ảnh WebAdmin micro-step đã tạo trong `docs/screenshots/deep/` và kiểm tra trực quan các trạng thái đại diện.
- Backend và WebAdmin phản hồi HTTP 200 trong phiên chụp.
- Không có lỗi console/HTTP 4xx–5xx trong kịch bản Playwright.
- Các phản hồi mock chỉ phục vụ chụp UI; không thay thế kiểm thử tích hợp production.
- Không thực hiện xác nhận cuối cho quyết toán, phát hành hóa đơn hoặc tạo hồ sơ thật.
