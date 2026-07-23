# Báo cáo Audit chỉ số và Quản lý dịch vụ Backend

Ngày kiểm tra: 2026-07-23

## Audit chỉ số điện nước

### Root cause

- Chỉ số mới nhỏ hơn chỉ số cũ từng bị chuyển âm thầm thành mức sử dụng bằng 0.
- Nhánh tạo hóa đơn trực tiếp từng tin tổng tiền do frontend gửi.
- Preview từng có thể lấy chỉ số nháp làm chỉ số cũ khi chưa có hóa đơn trước.
- Công thức bị lặp giữa luồng tạo đơn lẻ và tạo hàng loạt.
- Giá trị `NaN`, `Infinity`, chuỗi rỗng và số âm chưa được từ chối nhất quán.

### Kết quả refactor

- `invoiceCalculator` là nguồn tính toán backend duy nhất.
- Mọi chỉ số và đơn giá phải hữu hạn, hợp lệ và không âm.
- Chỉ số mới nhỏ hơn chỉ số cũ trả HTTP 400 với mã `METER_INDEX_REGRESSION`.
- Tiền điện, nước và tổng hóa đơn được làm tròn đến VND.
- Backend bỏ qua `total` và `totalAmount` từ client.
- Giảm giá không thể tạo tổng hóa đơn âm.
- Luồng hàng loạt xác thực toàn bộ phép tính trước khi ghi hóa đơn đầu tiên.
- Preview lấy chỉ số cũ từ hóa đơn đã phát hành gần nhất; chỉ số nháp chỉ là gợi ý cho chỉ số mới.
- Luồng hóa đơn đơn lẻ, hàng loạt và chi tiết dịch vụ theo chỉ số dùng chung calculator.

## Quản lý dịch vụ Admin

### Bảo mật

- Toàn bộ `/api/services` yêu cầu Bearer JWT.
- Thiếu hoặc sai token trả HTTP 401.
- Tài khoản role `2` trả HTTP 403.
- `landlordId` luôn lấy từ Admin JWT; giá trị client gửi lên bị loại bỏ.
- Detail, update và delete đều truy vấn theo `_id + landlordId`.
- Update chỉ nhận các trường được whitelist.

### API

- `GET /api/services`: danh sách thuộc Admin hiện tại; hỗ trợ lọc `isActive`.
- `POST /api/services`: tạo dịch vụ có validate và chống trùng mã.
- `GET /api/services/:id`: lấy dịch vụ thuộc Admin hiện tại.
- `PUT /api/services/:id`: cập nhật các trường hợp lệ.
- `DELETE /api/services/:id`: xóa nếu chưa được dùng; chuyển `isActive=false` nếu hợp đồng đang tham chiếu.

### Schema và dữ liệu cũ

- Giữ nguyên `name`, `type`, `unit`, `defaultPrice`, `landlordId`.
- Bổ sung `code` dạng uppercase và `isActive` mặc định `true`.
- Unique index áp dụng theo `landlordId + code` và chỉ áp dụng cho bản ghi đã có `code`.
- `landlordId` tiếp tục optional ở tầng schema để bản ghi legacy vẫn đọc và cập nhật được.
- API tạo mới luôn bắt buộc gán ownership từ Admin JWT.

## Invariant nghiệp vụ

- Scanner thuật ngữ production pass.
- `RepairRequest.tenantId` vẫn required và tham chiếu trực tiếp `Account`.
- `RepairRequest` không có ownership bằng `roomId`.

## Kết quả kiểm thử

- Calculator: 7 test pass.
- Auth và business invariant: 7 test pass.
- Admin middleware và Service CRUD: 8 test pass.
- Tổng backend suite: 22/22 test pass.
- Syntax check cho controller, service, middleware, model và routes: pass.
- `git diff --check`: pass.

Lệnh chuẩn:

```bash
cd backend
npm test
```
