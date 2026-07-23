# Báo cáo hợp nhất Web Admin và chính sách quá hạn

Ngày kiểm chứng: 23/07/2026

## Phạm vi hoàn thành

- Hợp nhất Web Admin về một ứng dụng Next.js duy nhất tại `webadmin`.
- Loại bỏ bản HTML/JS cũ khỏi thư mục dự án; bản sao có thể khôi phục nằm trong Thùng rác macOS.
- Bổ sung trang tổng quan, thanh toán, dịch vụ và nhóm cài đặt Admin.
- Giữ luồng tạo hợp đồng theo progress bar tại `/dashboard/contracts/new`.
- Thêm chính sách quá hạn dùng chung cho Admin:
  - số ngày ân hạn;
  - tỷ lệ phạt một lần;
  - chính sách được snapshot khi phát hành hóa đơn;
  - hóa đơn cũ không bị thay đổi khi Admin sửa chính sách;
  - ngày phát hành chỉ cho phép hôm nay hoặc ngày quá khứ;
  - xử lý quá hạn theo múi giờ Asia/Ho_Chi_Minh và có tính idempotent.
- Nguồn tính tổng hóa đơn nằm ở Backend; không tin `total` hoặc `landlordId` do client gửi.
- Repair Request tiếp tục liên kết trực tiếp bằng `tenantId` tới NGUOI_THUE.

## Vị trí chức năng

- Web Admin: `http://localhost:3000`
- Cài đặt phạt quá hạn: `http://localhost:3000/dashboard/settings/billing`
- Quản lý dịch vụ: `http://localhost:3000/dashboard/services`
- Tạo hợp đồng progress bar: `http://localhost:3000/dashboard/contracts/new`
- Quản lý hóa đơn và ngày phát hành: `http://localhost:3000/dashboard/invoices`

## Kết quả kiểm chứng

- Backend: 28/28 test pass.
- UI và hợp đồng kiến trúc: 17/17 test pass.
- ESLint: không có lỗi.
- Next.js production build: pass, sinh đủ 19 trang.
- Không push GitHub.

## Tự điền ngày hợp đồng Admin

- Web Admin và Expo role Admin tự điền ngày bắt đầu bằng ngày hiện tại.
- Ngày kết thúc mặc định là đúng 12 tháng sau và xử lý an toàn ngày `29/02`.
- Hai trường hiển thị, nhập tay và xem lại theo `dd/mm/yyyy`.
- Admin có thể mở lịch để chọn ngày trên cả hai nền tảng.
- Khi Admin chưa sửa ngày kết thúc, thay đổi ngày bắt đầu sẽ tự tính lại thời hạn 12 tháng.
- Khi Admin đã sửa ngày kết thúc, hệ thống không ghi đè lựa chọn đó.
- Payload gửi Backend luôn dùng ISO `yyyy-mm-dd`.
- Utility ngày có test cho định dạng, ngày không tồn tại, năm nhuận, khoảng ngày và hành vi không ghi đè.

## Thanh toán tiền cọc sau khi ký hợp đồng

- Hai endpoint ký hợp đồng tương thích dùng chung `contractSigningService`.
- Quyền ký được xác minh trực tiếp từ JWT Người thuê tới `Contract.tenantId`.
- Hóa đơn `Tiền cọc` được tạo idempotent và có unique partial index chống tạo trùng.
- Nếu lỗi phát hành hóa đơn, hợp đồng không bị chuyển sang Chờ duyệt dở dang.
- Hợp đồng Chờ duyệt trả `depositPayment` để Expo khôi phục CTA sau khi mở lại.
- Expo hiển thị `Tiền cọc chưa thanh toán` và nút `Thanh toán ngay`.
- Sau khi ký, app tải đúng hóa đơn và mở `PaymentModal`.
- PaymentModal giữ VietQR và VNPay, trong đó VNPay là lựa chọn ưu tiên.
- Admin bị chặn duyệt nếu hợp đồng có tiền cọc nhưng hóa đơn cọc chưa được thanh toán.
- Hợp đồng có tiền cọc bằng 0 không tạo hóa đơn và không bị chặn duyệt.
