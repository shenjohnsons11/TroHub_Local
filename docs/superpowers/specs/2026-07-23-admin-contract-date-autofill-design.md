# Thiết kế tự điền ngày hợp đồng cho Admin

Ngày: 23/07/2026  
Phạm vi: Web Admin Next.js và Expo role Admin

## 1. Mục tiêu

Khi Admin mở luồng tạo hợp đồng mới:

- Ngày bắt đầu được tự điền bằng ngày hiện tại.
- Ngày kết thúc được tự điền bằng đúng 12 tháng sau ngày bắt đầu.
- Cả hai trường luôn hiển thị theo định dạng `dd/mm/yyyy`.
- Admin vẫn có thể sửa trực tiếp hoặc chọn ngày bằng lịch.
- Backend tiếp tục nhận giá trị ngày chuẩn ISO `yyyy-mm-dd`.

Thay đổi chỉ áp dụng cho luồng tạo hợp đồng của role Admin trên Web Admin và Expo. Luồng ký hợp đồng của Người thuê không thay đổi.

## 2. Quy tắc ngày

### Giá trị mặc định

- `startDate`: ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh`.
- `endDate`: ngày cùng ngày và cùng tháng của năm kế tiếp.
- Trường hợp ngày bắt đầu là `29/02`, ngày kết thúc mặc định là `28/02` của năm kế tiếp nếu năm đó không nhuận.

### Chỉnh sửa

- Admin có thể nhập bằng bàn phím theo mặt nạ `dd/mm/yyyy`.
- Admin có thể mở bộ chọn lịch để chọn ngày.
- Giá trị không hợp lệ không được gửi lên Backend.
- Ngày kết thúc phải sau ngày bắt đầu.
- Khi Admin đổi ngày bắt đầu, hệ thống tự tính lại ngày kết thúc nếu ngày kết thúc chưa từng được Admin sửa thủ công.
- Sau khi Admin sửa ngày kết thúc, các thay đổi tiếp theo của ngày bắt đầu không được ghi đè ngày kết thúc.

### Chuyển đổi dữ liệu

- State giao diện dùng chuỗi hiển thị `dd/mm/yyyy`.
- Trước khi gọi API, chuỗi được parse nghiêm ngặt và chuyển thành `yyyy-mm-dd`.
- Không dùng `new Date("dd/mm/yyyy")` vì cách parse này không ổn định giữa trình duyệt và thiết bị.
- Việc cộng 12 tháng và kiểm tra ngày được đặt trong utility thuần dùng chung về quy tắc; mỗi nền tảng chỉ chịu trách nhiệm render input phù hợp.

## 3. Web Admin

Màn hình: `/dashboard/contracts/new`

- Thay hai `<input type="date">` bằng trường ngày có định dạng rõ ràng `dd/mm/yyyy`.
- Trường hỗ trợ nhập tay, nút mở lịch và trạng thái lỗi bên dưới.
- Khi tải bản nháp:
  - nếu bản nháp có ngày, giữ nguyên bản nháp;
  - nếu chưa có ngày, áp dụng giá trị mặc định.
- Bản tóm tắt bước cuối hiển thị ngày theo `dd/mm/yyyy`.

## 4. Expo role Admin

Màn hình: `AdminContractsScreen`

- Khởi tạo ngày mặc định khi Admin mở wizard tạo hợp đồng.
- TextInput hiển thị và nhận `dd/mm/yyyy`.
- Nhấn vào biểu tượng lịch mở date picker native phù hợp iOS/Android.
- Bước xem lại hiển thị cùng định dạng với Web Admin.
- Payload gửi API được chuyển về `yyyy-mm-dd`.

Không áp dụng thay đổi này cho màn hình hợp đồng của Người thuê.

## 5. Xử lý lỗi

- Thiếu ngày: `Vui lòng nhập ngày bắt đầu/ngày kết thúc.`
- Sai định dạng hoặc ngày không tồn tại: `Ngày phải đúng định dạng dd/mm/yyyy.`
- Ngày kết thúc không sau ngày bắt đầu: `Ngày kết thúc phải sau ngày bắt đầu.`
- Lỗi được hiển thị tại trường tương ứng và qua hệ thống Notification khi Admin cố chuyển bước hoặc gửi form.

## 6. Kiểm thử TDD

Utility ngày phải có test cho:

- tự điền ngày hiện tại;
- cộng đúng 12 tháng;
- năm nhuận `29/02`;
- parse và format hai chiều;
- từ chối `31/02`, sai thứ tự ngày và sai định dạng;
- không tự ghi đè ngày kết thúc đã được Admin sửa.

Contract test cho Web Admin và Expo phải xác nhận:

- cả hai nền tảng dùng cùng semantic ngày;
- payload gửi Backend là ISO;
- UI hiển thị `dd/mm/yyyy`;
- thuật ngữ Người thuê được giữ nguyên;
- không thay đổi liên kết trực tiếp `RepairRequest.tenantId` tới NGUOI_THUE.

## 7. Ngoài phạm vi

- Không thay đổi schema Contract.
- Không thay đổi trạng thái hợp đồng.
- Không thay đổi luồng thanh toán tiền cọc.
- Không áp dụng cho role Người thuê.
- Không push GitHub.
