# Thiết kế chính sách phạt hóa đơn quá hạn

Ngày duyệt: 23/07/2026

## 1. Mục tiêu

TroHub cho phép mỗi Chủ trọ/Admin cấu hình một chính sách phạt hóa đơn gồm:

- Số ngày ân hạn kể từ ngày phát hành hóa đơn.
- Tỷ lệ phạt một lần khi hóa đơn bắt đầu quá hạn.

Chính sách đang có hiệu lực được sao chép vào hóa đơn tại thời điểm phát hành. Việc Admin thay đổi cấu hình sau đó không làm thay đổi nghĩa vụ đã thông báo cho Người thuê trên các hóa đơn cũ.

## 2. Vị trí cấu hình

Web Admin bổ sung mục điều hướng:

```text
Cài đặt → Chính sách hóa đơn
```

Route dự kiến:

```text
/dashboard/settings/billing
```

Màn hình gồm:

- `Số ngày ân hạn`: số nguyên từ 0 đến 90.
- `Tỷ lệ phạt một lần`: phần trăm từ 0 đến 100, hỗ trợ tối đa hai chữ số thập phân.
- Bản xem trước ngày quá hạn và số tiền phạt trên một hóa đơn ví dụ.
- Nút `Lưu chính sách`.
- Ghi chú rõ chính sách mới chỉ áp dụng cho hóa đơn phát hành sau khi lưu.

## 3. Phạm vi sở hữu

Mỗi chính sách thuộc trực tiếp một Chủ trọ/Admin thông qua `landlordId` lấy từ JWT. API không nhận hoặc tin `landlordId` từ client.

Mỗi Admin chỉ đọc và cập nhật chính sách của chính mình.

## 4. Dữ liệu

### 4.1 BillingPolicy

```text
landlordId
lateFeeGraceDays
lateFeeRate
createdAt
updatedAt
```

`landlordId` có unique index để mỗi Admin chỉ có một chính sách hiện hành.

Giá trị mặc định khi chưa cấu hình:

```text
lateFeeGraceDays = 3
lateFeeRate = 5
```

### 4.2 Snapshot trên Invoice

```text
issuedAt
graceDaysSnapshot
penaltyRateSnapshot
overdueAt
penaltyBaseAmount
penalty
penaltyAppliedAt
```

- `createdAt` là timestamp audit của database và không được phép chỉnh sửa.
- `issuedAt` là ngày phát hành nghiệp vụ do Admin chọn.
- `issuedAt` chỉ được là hôm nay hoặc một ngày trong quá khứ.
- Hóa đơn tiếp tục liên kết với Người thuê qua `contractId → Contract.tenantId → NGUOI_THUE`.

## 5. Công thức

Tất cả phép tính ngày sử dụng múi giờ `Asia/Ho_Chi_Minh`.

```text
Ngày thanh toán cuối cùng =
  issuedAt + graceDaysSnapshot ngày

Thời điểm bắt đầu quá hạn =
  00:00:00 của ngày kế tiếp

penalty =
  roundVnd(penaltyBaseAmount × penaltyRateSnapshot / 100)

totalAmount =
  penaltyBaseAmount + penalty
```

`penaltyBaseAmount` là tổng hóa đơn sau giảm giá và trước tiền phạt. Giá trị này được đóng băng khi phát hành để việc tính lại luôn có cùng kết quả.

Ví dụ:

```text
issuedAt: 01/07/2026
graceDaysSnapshot: 5
Ngày thanh toán cuối cùng: 06/07/2026
overdueAt: 07/07/2026 00:00:00
penaltyBaseAmount: 3.000.000đ
penaltyRateSnapshot: 5
penalty: 150.000đ
totalAmount: 3.150.000đ
```

## 6. Chuyển trạng thái và tính phạt

Hệ thống dùng một service nghiệp vụ duy nhất để đánh giá quá hạn.

Service được gọi tại ba điểm:

1. Tác vụ định kỳ của backend.
2. Trước khi trả danh sách hoặc chi tiết hóa đơn cho Admin và Người thuê.
3. Ngay trước khi tạo giao dịch thanh toán.

Điều kiện áp dụng:

- Hóa đơn chưa thanh toán.
- Thời điểm hiện tại lớn hơn hoặc bằng `overdueAt`.
- `penaltyAppliedAt` chưa có giá trị.

Thao tác phải idempotent:

- Chỉ cập nhật nếu `penaltyAppliedAt` đang rỗng.
- Ghi `penaltyAppliedAt` cùng lúc với `penalty`, `totalAmount` và trạng thái `Quá hạn`.
- Hai request đồng thời không được cộng phạt hai lần.

Hóa đơn đã thanh toán không bị chuyển quá hạn hoặc cộng phạt.

## 7. Luồng tạo hóa đơn

1. Admin chọn ngày phát hành, mặc định là hôm nay.
2. Backend kiểm tra ngày không nằm trong tương lai.
3. Backend lấy BillingPolicy bằng `landlordId` trong JWT.
4. Backend tính và lưu snapshot chính sách.
5. Backend tính `penaltyBaseAmount` bằng invoice calculator có thẩm quyền.
6. Backend tính `overdueAt`.
7. Hóa đơn được phát hành mà chưa có tiền phạt.

Client không được gửi giá trị có thẩm quyền cho:

- `graceDaysSnapshot`
- `penaltyRateSnapshot`
- `overdueAt`
- `penaltyBaseAmount`
- `penalty`
- `penaltyAppliedAt`

## 8. Luồng thay đổi cấu hình

1. Admin mở `Cài đặt → Chính sách hóa đơn`.
2. API tải chính sách theo JWT.
3. Admin cập nhật số ngày ân hạn hoặc tỷ lệ phạt.
4. Backend validate và lưu.
5. UI thông báo chính sách mới chỉ áp dụng cho hóa đơn phát hành sau thời điểm lưu.
6. Hóa đơn cũ giữ nguyên snapshot.

## 9. Demo quá hạn

Admin có thể chọn `issuedAt` trong quá khứ khi tạo hóa đơn.

Ví dụ để demo ngay:

```text
Hôm nay: 23/07/2026
issuedAt: 17/07/2026
Số ngày ân hạn: 5
overdueAt: 23/07/2026 00:00:00
```

Ngay sau khi phát hành, backend đánh giá hóa đơn đã quá hạn và áp dụng tiền phạt một lần.

## 10. API dự kiến

```text
GET /api/settings/billing-policy
PUT /api/settings/billing-policy
```

Payload cập nhật:

```json
{
  "lateFeeGraceDays": 5,
  "lateFeeRate": 5
}
```

Các API hóa đơn hiện tại được mở rộng để nhận `issuedAt`, nhưng toàn bộ snapshot và tiền phạt do backend tự tính.

## 11. UI hóa đơn

Form tạo hóa đơn bổ sung trường `Ngày phát hành`.

Chi tiết hóa đơn hiển thị:

- Ngày phát hành.
- Số ngày ân hạn.
- Ngày thanh toán cuối cùng.
- Tỷ lệ phạt đã chốt.
- Tiền phạt, nếu đã áp dụng.
- Thời điểm áp dụng tiền phạt.

Thông báo sử dụng thuật ngữ Người thuê và hệ thống `useNotification`.

## 12. Xử lý dữ liệu cũ

Hóa đơn legacy được backfill an toàn:

- `issuedAt = createdAt`.
- `graceDaysSnapshot` và `penaltyRateSnapshot` lấy từ giá trị mặc định.
- `penaltyBaseAmount` được suy ra từ `totalAmount - penalty`.
- Hóa đơn đã có tiền phạt được gán `penaltyAppliedAt` từ `updatedAt`.
- Không cộng lại tiền phạt cho hóa đơn legacy.

Migration phải có chế độ dry-run và báo cáo số bản ghi trước khi cập nhật.

## 13. Kiểm thử

TDD bao phủ:

- Policy mặc định và policy theo từng Admin.
- Không nhận `landlordId` từ client.
- Snapshot không đổi khi Admin đổi policy.
- Chặn `issuedAt` trong tương lai.
- Tính đúng ranh giới ngày theo `Asia/Ho_Chi_Minh`.
- Không phạt trước hoặc đúng ngày thanh toán cuối cùng.
- Phạt từ đầu ngày kế tiếp.
- Làm tròn VND chính xác.
- Không phạt hóa đơn đã thanh toán.
- Không cộng phạt hai lần khi có request đồng thời.
- Đọc hóa đơn và tạo giao dịch đều gọi overdue evaluator.
- Hóa đơn vẫn truy được đúng Người thuê qua `Contract.tenantId`.
- Migration legacy không cộng lại tiền phạt.

## 14. Ngoài phạm vi

- Phạt lũy tiến theo ngày.
- Nhiều bậc tỷ lệ phạt.
- Ghi đè chính sách trên từng hóa đơn.
- Cho phép ngày phát hành trong tương lai.
- Thay đổi snapshot của hóa đơn đã phát hành.
