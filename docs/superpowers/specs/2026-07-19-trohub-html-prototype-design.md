# TroHub HTML Prototype Design

## 1. Mục tiêu

Tạo một prototype HTML tương tác độc lập để đánh giá tổng thể giao diện TroHub trước khi áp dụng vào Expo Mobile, Web Admin legacy và Web Admin Next.js. Prototype tái thiết kế mạnh toàn bộ màn hình nhưng giữ nguyên mô hình flow, hành động và dữ liệu nghiệp vụ hiện có.

Prototype không gọi API, không sửa backend, không thay đổi route hoặc handler production. Mọi thao tác thay đổi dữ liệu chỉ tồn tại trong local state của trình duyệt và có thể đặt lại.

## 2. Nguyên tắc nghiệp vụ bất biến

- Chỉ sử dụng thuật ngữ `Người thuê` trong nội dung, tên biến và dữ liệu demo.
- Yêu cầu sửa chữa thuộc về `nguoiThueId`; không sử dụng `roomId` làm quan hệ sở hữu.
- Phòng có thể được trình bày như thông tin suy ra từ hợp đồng đang hoạt động, không phải khóa liên kết trực tiếp của yêu cầu sửa chữa.
- Không thay đổi ý nghĩa của các trạng thái hợp đồng, hóa đơn, thanh toán, phòng hoặc sửa chữa.

## 3. Kiến trúc prototype

Prototype là một SPA thuần HTML, CSS và JavaScript đặt tại `demo/`:

- `index.html`: document shell, metadata và điểm mount.
- `styles.css`: semantic tokens, responsive layout, component states và motion.
- `data.js`: dữ liệu mẫu thực tế theo ngữ cảnh TroHub và hàm tạo state ban đầu.
- `app.js`: hash router, render functions, event delegation, validation, state mutations, modal và toast.
- `tests/demo-contract.test.js`: contract tests cho screen map, thuật ngữ, liên kết sửa chữa và các hành động chính.

Không dùng framework hoặc dependency mới. Prototype chạy bằng static server và không yêu cầu build.

## 4. Visual system

### 4.1 Màu sắc

- Canvas: warm off-white `#F3F0E9`.
- Surface: ivory `#FBFAF7` và white có kiểm soát.
- Text: charcoal `#1C1B18`; secondary text dùng warm gray.
- Primary: cam đất `#C85E35` cho CTA, selected state và focus quan trọng.
- Positive: xanh sage `#587255` cho trạng thái tích cực.
- Danger và warning dùng sắc độ trầm, không cạnh tranh với CTA.
- Dark mode dùng charcoal ấm, surface nâng nhẹ và giữ cùng semantic hierarchy.

### 4.2 Typography và hình khối

- Ưu tiên Geist và SF Pro fallback; không dùng Inter.
- Heading ngắn, tracking chặt; body text có line-height thoáng.
- Radius: control 8px, surface 12px, modal 16px; pill chỉ dùng cho badge và segmented control.
- Border hairline có độ tương phản thấp; shadow nhiều lớp nhưng rất nhẹ.
- Không gradient, neon, icon trang trí sặc sỡ hoặc card to bản vô nghĩa.

### 4.3 Motion

- Entry motion nhẹ bằng opacity và transform.
- Hover, press, modal và drawer dùng custom cubic-bezier mô phỏng spring.
- Tôn trọng `prefers-reduced-motion`.
- Không animate thuộc tính gây layout reflow.

## 5. Shell và responsive

### Desktop

- Sidebar gọn, tách khỏi content bằng divider tinh tế.
- Header theo ngữ cảnh, không dùng navbar template cố định.
- Bảng dữ liệu có toolbar, filter, bulk action và detail drawer/modal.

### Tablet

- Sidebar thu gọn.
- Grid giảm cột; bảng có vùng cuộn ngang cục bộ.
- Form vẫn giữ label và action rõ ràng.

### Mobile

- Một cột, padding 16px và touch target tối thiểu 44px.
- Người thuê dùng bottom navigation.
- Flow quản lý chuyển sang compact drawer và list blocks thay cho bảng rộng.
- Không dùng `h-screen`; viewport full-height dùng đơn vị ổn định.

Prototype có viewport switcher Desktop, Tablet và Mobile để review cùng một flow.

## 6. Screen map

### Entry và xác thực

- Chọn vai trò demo.
- Đăng nhập.
- Đăng ký.
- Quên mật khẩu.

### Quản lý

- Tổng quan vận hành.
- Phòng: danh sách, lọc, chi tiết, thêm, sửa và xóa.
- Người thuê: danh sách, tìm kiếm, thêm, sửa, kiểm tra trùng và xóa.
- Hợp đồng: danh sách, lọc, chi tiết, wizard tạo mới, sửa, duyệt và xóa.
- Hóa đơn: danh sách, lọc, chi tiết, tạo đơn, tạo hàng loạt, nhắc thanh toán, đánh dấu đã thu và xóa.
- Công nợ: tổng hợp, lọc và gửi nhắc.
- Điện nước: nhập chỉ số hàng loạt, validation và lưu.
- Yêu cầu sửa chữa: danh sách, lọc, chi tiết, chọn nhiều, cập nhật mức độ/trạng thái và xóa.
- Cài đặt: hồ sơ, theme, đổi mật khẩu, đăng xuất và đặt lại dữ liệu demo.

### Người thuê

- Tổng quan và lời mời thuê: chấp nhận hoặc từ chối.
- Hợp đồng: danh sách, chi tiết, ký và gửi yêu cầu chấm dứt.
- Hóa đơn: lọc, chi tiết, QR thanh toán và xác nhận mô phỏng.
- Điện nước: lịch sử và báo sai chỉ số.
- Yêu cầu sửa chữa: tạo mới, đính kèm ảnh preview, danh sách, chọn nhiều và xóa.
- Hồ sơ: cập nhật thông tin.
- Tài khoản: đổi mật khẩu và đăng xuất.

## 7. Hành vi và state

- Hash router giữ trạng thái URL cho mỗi màn hình.
- Event delegation xử lý navigation và action qua `data-action`.
- Local state quản lý records, filter, selected IDs, modal, toast, role, theme và viewport.
- Mọi create/update/delete cập nhật giao diện ngay và hiển thị toast.
- Action phá hủy yêu cầu confirm dialog.
- Form hiển thị validation inline; submit lỗi không đóng modal.
- Loading mô phỏng ngắn để thể hiện disabled, progress và skeleton state.
- Empty state xuất hiện khi filter hoặc xóa hết dữ liệu.
- Nút đặt lại dữ liệu khôi phục seed state ban đầu.

## 8. Accessibility

- Semantic headings, form labels, buttons và dialog roles.
- Keyboard focus rõ ràng; hỗ trợ Escape đóng modal và Enter submit form.
- Không dùng màu làm tín hiệu duy nhất.
- Body text và controls đạt WCAG AA theo token đã chọn.
- Touch target tối thiểu 44px ở mobile.

## 9. Testing và verification

- Contract test xác nhận mọi route và action chính tồn tại.
- Scan toàn bộ `demo/` để ngăn thuật ngữ bị cấm.
- Test xác nhận repair seed và mutations chỉ dùng `nguoiThueId` làm ownership.
- Syntax check JavaScript và chạy Node tests.
- Browser QA tại 1440×900, 768×1024 và 390×844.
- Kiểm tra light/dark, keyboard focus, modal, toast, CRUD, filter, bulk action và reset.
- Pre-flight taste kiểm tra typography, spacing, accent hierarchy, responsive collapse và motion.

## 10. Tiêu chí hoàn thành

- Tất cả màn hình và chức năng trong screen map có thể truy cập và bấm thử.
- Flow quản lý và người thuê có navigation liên tục, không có dead end.
- Ba viewport thể hiện cùng một design system nhưng có bố cục phù hợp thiết bị.
- Không gọi backend và không sửa logic production.
- Không còn placeholder hoặc action giả không phản hồi.
- Các invariant nghiệp vụ và thuật ngữ được test tự động.
