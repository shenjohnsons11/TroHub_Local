# Thiết kế thanh toán tiền cọc sau khi Người thuê ký hợp đồng

Ngày: 23/07/2026  
Phạm vi: Backend và Expo role Người thuê

## 1. Mục tiêu

Sau khi Người thuê ký hợp đồng, hệ thống phải tạo hóa đơn tiền cọc và mở lại `PaymentModal` hiện có. Người thuê được chọn VietQR hoặc VNPay, trong đó VNPay được trình bày ưu tiên. Nếu modal bị đóng hoặc app được mở lại, yêu cầu thanh toán vẫn xuất hiện trên màn hình Hợp đồng cho đến khi Backend xác nhận hóa đơn cọc đã thanh toán.

## 2. Nguồn nghiệp vụ duy nhất

Backend hiện có hai endpoint ký hợp đồng với hành vi khác nhau. Hai endpoint phải được giữ để tương thích nhưng cùng gọi một service nghiệp vụ:

- `PUT /api/contracts/:id/sign`
- `PUT /api/me/sign-contract/:contractId`

Service ký hợp đồng chịu trách nhiệm:

1. Xác thực request thuộc role Người thuê.
2. Kiểm tra `contract.tenantId` trùng trực tiếp với ID `NGUOI_THUE` trong JWT.
3. Chỉ cho ký hợp đồng ở trạng thái Chờ ký.
4. Chuyển hợp đồng sang Chờ Admin duyệt và ghi `tenantConfirmedAt`.
5. Nếu `fixedDeposit > 0`, tìm hoặc tạo đúng một hóa đơn `period: "Tiền cọc"` theo `contractId`.
6. Trả về `invoiceId`, trạng thái và số tiền cọc.
7. Nếu `fixedDeposit === 0`, không tạo hóa đơn và trả `invoiceId: null`.

Không suy diễn quyền Người thuê thông qua Phòng.

## 3. Chống tạo hóa đơn trùng

- Hóa đơn cọc được nhận diện bằng cặp `contractId` và `period: "Tiền cọc"`.
- Model Invoice có unique partial index cho cặp này chỉ khi `period` là tiền cọc.
- Service dùng thao tác upsert hoặc bắt duplicate-key và tải lại hóa đơn hiện hữu.
- Request lặp lại sau khi hợp đồng đã ký trả về hóa đơn cọc hiện hữu thay vì tạo mới.
- Request lặp lại không được thay đổi số tiền của hóa đơn đã phát hành.

Migration/index phải bảo vệ dữ liệu cũ: trước khi tạo unique index, kiểm tra và báo cáo các hóa đơn cọc trùng; không tự xóa dữ liệu.

## 4. Truy vấn trạng thái thanh toán cọc

API hợp đồng dành cho Người thuê bổ sung trạng thái thanh toán:

```json
{
  "depositPayment": {
    "required": true,
    "invoiceId": "...",
    "amount": 3500000,
    "status": "unpaid"
  }
}
```

Quy tắc:

- `required: false` khi tiền cọc bằng 0.
- `status: "unpaid"` khi hóa đơn có status Chưa thanh toán hoặc Quá hạn.
- `status: "paid"` chỉ khi hóa đơn có status Đã thanh toán.
- Hợp đồng Chờ Admin duyệt phải trả trường này để app có thể khôi phục CTA sau khi tải lại.

## 5. Trải nghiệm Expo

### Ngay sau khi ký

- App nhận `invoiceId`.
- App tải lại danh sách hóa đơn để lấy đầy đủ dữ liệu ngân hàng và số tiền.
- App mở `PaymentModal` với hóa đơn cọc.
- PaymentModal giữ hai lựa chọn VietQR và VNPay; VNPay được đặt ở vị trí ưu tiên.

### Khi đóng hoặc mở lại app

Trên thẻ hợp đồng Chờ Admin duyệt:

- Nếu cọc chưa thanh toán, hiển thị thẻ cảnh báo `Tiền cọc chưa thanh toán`.
- Hiển thị số tiền cọc.
- Nút `Thanh toán ngay` mở cùng `PaymentModal`.
- Nếu hóa đơn đang được tải, nút có loading state và chống bấm lặp.
- Nếu không tìm thấy hóa đơn dù Backend báo cần thanh toán, app hiển thị Notification thân thiện và cho phép tải lại.

Sau khi PaymentModal xác nhận thành công:

- tải lại hóa đơn và hợp đồng;
- đóng modal;
- bỏ thẻ cảnh báo nếu Backend trả trạng thái `paid`;
- vẫn hiển thị trạng thái Chờ Admin duyệt.

## 6. Điều kiện Admin duyệt

- Nếu `fixedDeposit > 0`, Admin chỉ được duyệt khi hóa đơn cọc tồn tại và có status Đã thanh toán.
- Nếu `fixedDeposit === 0`, Admin được duyệt mà không cần hóa đơn cọc.
- Thông báo lỗi phải dùng thuật ngữ Người thuê.

## 7. Bảo mật và ràng buộc dữ liệu

- Endpoint ký hợp đồng không nhận hoặc tin `tenantId` từ client.
- ID Người thuê chỉ lấy từ JWT.
- Hóa đơn cọc luôn liên kết với `contractId`; quyền truy cập được kiểm tra qua `contract.tenantId`.
- Repair Request tiếp tục liên kết trực tiếp bằng `tenantId` tới NGUOI_THUE; thay đổi này không sửa hoặc suy diễn liên kết qua Phòng.
- Không sử dụng thuật ngữ bị cấm trong UI, biến mới hoặc log mới.

## 8. Xử lý lỗi

- Hợp đồng không tồn tại: 404.
- JWT không hợp lệ hoặc không phải Người thuê: 401/403.
- Hợp đồng thuộc Người thuê khác: 403.
- Trạng thái không thể ký: 409, trừ request lặp có hóa đơn cọc hiện hữu thì trả trạng thái idempotent.
- Không tạo được hóa đơn: transaction rollback trạng thái ký hoặc trả lỗi nhất quán; không để hợp đồng đã ký nhưng thiếu hóa đơn cọc.
- Lỗi mở VNPay/VietQR được hiển thị qua hệ thống Notification hiện có.

## 9. TDD và nghiệm thu

Backend:

- Người thuê chỉ ký được hợp đồng của chính mình.
- Hai endpoint gọi cùng một service.
- Ký tạo đúng một hóa đơn cọc và trả `invoiceId`.
- Request lặp không tạo hóa đơn thứ hai.
- Cọc bằng 0 không tạo hóa đơn.
- Lỗi tạo hóa đơn không để trạng thái hợp đồng dở dang.
- Admin bị chặn duyệt khi cọc chưa thanh toán.
- Admin duyệt được khi cọc đã thanh toán hoặc cọc bằng 0.

Expo:

- Sau khi ký có `invoiceId`, PaymentModal được mở.
- Thẻ Chờ duyệt có CTA thanh toán nếu cọc chưa thanh toán.
- Mở lại app vẫn khôi phục CTA từ Backend.
- Nút CTA mở đúng hóa đơn cọc.
- Thanh toán thành công làm mới hợp đồng và hóa đơn.
- VietQR và VNPay tiếp tục dùng service thanh toán hiện có.

## 10. Ngoài phạm vi

- Không thay đổi nhà cung cấp VNPay hoặc VietQR.
- Không tự động duyệt hợp đồng sau thanh toán.
- Không sửa UI Web Admin ngoài thông báo điều kiện duyệt nếu cần.
- Không thay đổi luồng Repair Request.
- Không push GitHub.
