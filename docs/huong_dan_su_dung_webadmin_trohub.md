# HƯỚNG DẪN SỬ DỤNG WEBADMIN TROHUB

**Phiên bản tài liệu:** 1.0  
**Ngày kiểm chứng:** 12/08/2026  
**Hệ thống:** TroHub WebAdmin  
**Địa chỉ truy cập:** [http://localhost:3000](http://localhost:3000)  
**Đối tượng sử dụng:** Chủ trọ, quản lý vận hành và nhân sự phụ trách tài chính

---

## 1. Phạm vi tài liệu

Tài liệu này hướng dẫn các nghiệp vụ chính trên TroHub WebAdmin: đăng nhập và đăng ký Chủ trọ, theo dõi Dashboard, quản lý phòng, Người thuê, hợp đồng, chỉ số điện nước, hóa đơn, công nợ, thanh toán, sửa chữa và Trợ lý TroHub AI.

Ảnh minh họa được chụp trực tiếp từ hệ thống đang chạy tại `http://localhost:3000` với Backend tại `http://localhost:5000`, giao diện sáng và khung hình máy tính 1440 px. Dữ liệu tiền, phòng và Người thuê trong ảnh là dữ liệu môi trường kiểm thử tại thời điểm chụp.

### Kết quả kiểm tra nhanh

- Backend và WebAdmin phản hồi HTTP 200 tại thời điểm kiểm thử.
- 15 route quản trị và 3 route công khai đã được mở thành công.
- 10 ảnh PNG bắt buộc đã được kiểm tra trực quan; không có ảnh trắng, ảnh loading hoặc lỗi điều hướng.
- Không ghi nhận lỗi JavaScript Console hoặc phản hồi HTTP lỗi từ ứng dụng trong phiên chụp chính.
- Hợp đồng dùng để mở modal Quyết toán Trả phòng đã được hoàn nguyên về trạng thái hiệu lực sau khi chụp.

---

## 2. Bắt đầu sử dụng

### Yêu cầu trước khi đăng nhập

1. Dùng trình duyệt hiện đại và mở `http://localhost:3000`.
2. Chuẩn bị tài khoản Chủ trọ đã được cấp hoặc mã mời sáu chữ số nếu đăng ký mới.
3. Kiểm tra đúng môi trường trước khi nhập dữ liệu thật; không dùng dữ liệu khách thuê thật trên môi trường demo.

### Quy ước điều hướng

- Thanh menu bên trái chứa các phân hệ vận hành, tài chính, hỗ trợ và cài đặt.
- Thanh trên cùng có lịch, thông báo, chuyển đổi VI/EN, giao diện sáng/tối và đăng xuất.
- Nút **Trợ lý AI** nằm ở góc dưới bên phải trên các trang quản trị.
- Các nút màu đỏ thường là thao tác hủy, xóa hoặc xác nhận nghiệp vụ có ảnh hưởng tài chính; cần đọc kỹ trước khi bấm.

---

## 3. Đăng nhập và đăng ký Chủ trọ

### Mục đích

Cho phép Chủ trọ đăng nhập vào vùng quản trị hoặc tạo tài khoản mới bằng mã mời dùng một lần. Người thuê không sử dụng WebAdmin mà đăng nhập trên ứng dụng TroHub dành cho thiết bị di động.

![Màn hình Đăng nhập và Đăng ký Chủ trọ](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/01_login_register.png)

### Đăng nhập

**Step 1:** Mở trang WebAdmin, chọn ngôn ngữ **VI** hoặc **EN** ở góc trên bên phải.

**Step 2:** Nhập số điện thoại hoặc email đã đăng ký và mật khẩu. Chỉ bật **Ghi nhớ đăng nhập** trên thiết bị cá nhân đáng tin cậy.

**Step 3:** Bấm **Đăng nhập**. Khi xác thực thành công, hệ thống chuyển đến Dashboard Tổng quan.

### Đăng ký Chủ trọ

**Step 1:** Tại trang đăng nhập, bấm **Đăng ký tài khoản quản trị mới**.

**Step 2:** Nhập họ tên, số điện thoại, email, CCCD, mật khẩu, mã mời sáu chữ số và địa chỉ nhà trọ. Có thể dùng nút lấy vị trí để hỗ trợ điền địa chỉ.

**Step 3:** Kiểm tra thông tin rồi bấm **Đăng ký**. Sau khi thành công, quay lại chế độ đăng nhập và dùng tài khoản vừa tạo.

### Mẹo vận hành và lưu ý bảo mật

- Mã mời chỉ dùng một lần; không gửi mã lên nhóm công khai hoặc lưu trong ảnh chụp màn hình.
- Không chia sẻ mật khẩu giữa nhiều nhân sự. Hãy tạo tài khoản hoặc phân quyền riêng khi hệ thống hỗ trợ.
- Luôn đăng xuất trên máy dùng chung.
- Trang đăng nhập hiện còn hiển thị một số khóa i18n thô như `registerLandlord`, `inviteCode` và `propertyAddress`. Đây là lỗi hiển thị đã ghi nhận trong phần Visual QA; chức năng nhập liệu và nút VI/EN vẫn hoạt động.

---

## 4. Dashboard Tổng quan

### Mục đích

Cung cấp bức tranh vận hành tức thời: doanh thu đã thu, công nợ, tổng số phòng, phòng trống, phòng bảo trì, hợp đồng chờ xử lý, số Người thuê, sự cố và tỷ lệ lấp đầy.

![Màn hình Dashboard Tổng quan](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/02_dashboard_overview.png)

### Các bước sử dụng

**Step 1:** Chọn **Tổng quan** ở menu bên trái sau khi đăng nhập.

**Step 2:** Đọc khu vực **Cần xử lý hôm nay** trước, sau đó kiểm tra các thẻ KPI Doanh thu, Công nợ, Phòng trọ, Còn trống, Hợp đồng và Sự cố.

**Step 3:** Bấm **Xem tất cả** hoặc một thao tác nhanh để chuyển đến phân hệ cần xử lý.

### Mẹo vận hành và lưu ý tài chính

- Đối chiếu **Tổng doanh thu đã thu** với trang **Cổng thanh toán** trước khi chốt sổ.
- KPI **Tổng công nợ còn nợ** là tín hiệu theo dõi, không thay thế báo cáo kế toán hoặc sao kê ngân hàng.
- Nếu số phòng đang thuê và số hợp đồng hiệu lực không khớp, kiểm tra trạng thái phòng và hợp đồng trước khi sửa dữ liệu.

---

## 5. Quản lý Phòng trọ

### Mục đích

Quản lý danh mục phòng, giá thuê, tiền cọc, diện tích, trạng thái và Người thuê hiện tại. Các phòng được gom theo tầng để dễ theo dõi.

![Màn hình Quản lý Phòng theo tầng](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/03_room_management.png)

### Các bước sử dụng

**Step 1:** Chọn **Quản lý Phòng**. Dùng ô tìm kiếm hoặc nút tầng để thu hẹp danh sách.

**Step 2:** Bấm **Thêm phòng mới**, nhập mã phòng, diện tích, giá thuê, tiền cọc và trạng thái ban đầu, rồi lưu.

**Step 3:** Trên thẻ phòng, dùng **Sửa** để cập nhật thông tin hoặc nút trạng thái để chuyển giữa Còn trống, Đang thuê và Bảo trì.

### Mẹo vận hành và lưu ý

- Nên thống nhất mã phòng theo cấu trúc dễ hiểu, ví dụ A101 hoặc B203, để hệ thống nhóm tầng chính xác.
- Không chuyển phòng thành **Còn trống** khi vẫn còn hợp đồng hiệu lực.
- Giá thuê và tiền cọc trên hợp đồng đã chốt có thể khác giá mặc định hiện tại của phòng; không sửa hồi tố nếu chưa có thỏa thuận.
- Bộ lọc tầng hiện hiển thị khóa `all`, `floor 1` thay vì bản dịch hoàn chỉnh; xem phần Visual QA.

---

## 6. Danh bạ Người thuê

### Mục đích

Lưu và tra cứu hồ sơ Người thuê, trạng thái liên kết ứng dụng, phòng đang thuê và các hồ sơ chưa được xếp phòng.

![Màn hình Danh bạ Người thuê](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/04_tenant_directory.png)

### Các bước sử dụng

**Step 1:** Chọn **Người thuê**. Tìm theo họ tên hoặc số điện thoại; nhãn **Chưa xếp phòng** cho biết hồ sơ chưa có hợp đồng/phòng hiện tại.

**Step 2:** Bấm **+ Thêm người thuê**, nhập số điện thoại để hệ thống tra cứu tài khoản. Nếu chưa có tài khoản, bổ sung họ tên, email và CCCD theo biểu mẫu.

**Step 3:** Lưu hồ sơ. Sau đó tạo hợp đồng để gán Người thuê vào phòng; dùng **Gửi lời mời** nếu cần liên kết ứng dụng TroHub.

### Mẹo vận hành và lưu ý bảo mật

- Tra cứu bằng số điện thoại trước khi tạo mới để tránh hồ sơ trùng.
- Chỉ thu thập CCCD và thông tin liên hệ phục vụ hợp đồng; hạn chế sao chép sang tệp cá nhân.
- Hồ sơ **Chưa xếp phòng** không làm thay đổi trạng thái phòng cho đến khi có hợp đồng.
- Xác minh danh tính trước khi cấp lại mật khẩu hoặc sửa số điện thoại.

---

## 7. Hợp đồng thuê và Quyết toán Trả phòng

### Mục đích

Theo dõi toàn bộ vòng đời hợp đồng: bản nháp, chờ ký, chờ duyệt, hiệu lực, yêu cầu trả phòng và đã kết thúc. Modal Quyết toán giúp cấn trừ tiền cọc, công nợ, điện nước cuối kỳ và bồi thường.

![Màn hình Hợp đồng và Modal Quyết toán Trả phòng](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/05_contract_management.png)

### Tạo hợp đồng mới

**Step 1:** Chọn **Hợp đồng** rồi bấm **Tạo hợp đồng mới**.

**Step 2:** Thực hiện lần lượt các bước chọn phòng, chọn Người thuê, nhập điều khoản tiền thuê/tiền cọc/điện nước và xem lại nội dung.

**Step 3:** Gửi hợp đồng cho Người thuê ký. Sau khi Người thuê ký, Chủ trọ duyệt để hợp đồng chuyển sang hiệu lực.

### Duyệt trả phòng và quyết toán

**Step 1:** Mở tab **Trả phòng** và tìm hợp đồng có trạng thái **Chờ duyệt trả phòng**.

**Step 2:** Bấm **Duyệt trả phòng**. Kiểm tra tiền cọc ban đầu, hóa đơn nợ cũ, chỉ số điện/nước kỳ trước và kỳ này, tiền bồi thường cùng ghi chú.

**Step 3:** Chỉ bấm nút xác nhận **Duyệt trả phòng** sau khi số liệu khớp biên bản bàn giao. Hệ thống tính khoản hoàn lại cho khách hoặc số tiền khách còn phải trả.

### Mẹo vận hành và lưu ý tài chính

- Ghi nhận chỉ số cuối kỳ tại hiện trường và lưu ảnh đồng hồ trước khi quyết toán.
- Không nhập chỉ số mới nhỏ hơn chỉ số cũ.
- Đối chiếu tiền cọc trên hợp đồng, công nợ hóa đơn và biên bản hư hại; không dựa riêng vào số tổng trên modal.
- Nút duyệt là thao tác có ảnh hưởng tài chính và trạng thái phòng. Nên áp dụng nguyên tắc một người lập, một người kiểm tra khi giá trị lớn.
- Bản chụp cho thấy nội dung Meter Ledger ở cạnh phải có dấu hiệu bị cắt trong modal hẹp; cần kiểm tra giá trị đầy đủ trước khi xác nhận.

---

## 8. Chốt chỉ số Điện Nước

### Mục đích

Ghi chỉ số điện/nước theo kỳ cho từng phòng, hỗ trợ nhập thủ công hoặc chụp ảnh đồng hồ, sau đó chuyển dữ liệu sang quy trình lập hóa đơn.

![Màn hình Chốt chỉ số Điện Nước](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/06_utility_meter.png)

### Các bước sử dụng

**Step 1:** Chọn **Điện & Nước**, đặt khoảng kỳ ghi nhận và tìm phòng cần chốt.

**Step 2:** So sánh **Số điện cũ / Số nước cũ** với đồng hồ thực tế. Nhập **Số điện mới / Số nước mới** hoặc bấm **Chụp ảnh** rồi chọn Điện hoặc Nước.

**Step 3:** Bấm **Lưu sổ điện nước**, xem Preview và chỉ chuyển sang phát hành hóa đơn sau khi đã đối chiếu.

### Mẹo vận hành và lưu ý

- Ghi chỉ số cùng một ngày hàng tháng để số liệu dễ so sánh.
- Nếu mức tiêu thụ tăng bất thường, kiểm tra ảnh đồng hồ và xác nhận đúng phòng trước khi lưu.
- Ảnh đồng hồ có thể chứa thông tin vị trí hoặc tài sản; chỉ lưu trong hệ thống và giới hạn người truy cập.
- Không sửa chỉ số cũ để ép số tiền. Nếu phát hiện sai, ghi nhận lý do điều chỉnh và lưu bằng chứng.

---

## 9. Quản lý Hóa đơn và Chi tiết Hóa đơn

### Mục đích

Tạo hóa đơn lẻ hoặc hàng loạt, theo dõi trạng thái thanh toán và xem chi tiết tiền phòng, điện, nước, dịch vụ, phí quá hạn và giảm trừ.

![Màn hình Quản lý và Chi tiết Hóa đơn](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/07_invoice_management.png)

### Tạo và phát hành hóa đơn

**Step 1:** Chọn **Hóa đơn**. Dùng **Tạo Hóa đơn lẻ** cho một phòng hoặc quy trình hàng loạt cho nhiều phòng cùng kỳ.

**Step 2:** Chọn kỳ, kiểm tra chỉ số điện/nước, giá dịch vụ, giảm trừ và hạn thanh toán trên màn hình Preview.

**Step 3:** Phát hành hóa đơn sau khi kiểm tra tổng tiền. Tìm hóa đơn theo phòng/kỳ khi cần tra cứu.

### Xem chi tiết hóa đơn

**Step 1:** Bấm biểu tượng mắt hoặc chọn hàng hóa đơn.

**Step 2:** Kiểm tra mã hóa đơn, kỳ thanh toán, hạn thanh toán, trạng thái, Người thuê và tổng tiền.

**Step 3:** Trong phần chi tiết khoản thu, đối chiếu **Kỳ trước**, **Kỳ này**, **Tiêu thụ**, **Đơn giá**, **Thành tiền** của điện/nước cùng các khoản phí khác.

### Mẹo vận hành và lưu ý tài chính

- Không phát hành hai hóa đơn cho cùng phòng và cùng kỳ.
- Hóa đơn quá hạn có thể có phí phạt theo chính sách; xác minh ngày ân hạn và tỷ lệ phạt trong Cài đặt.
- Chỉ đánh dấu đã thu khi có tiền mặt được xác nhận hoặc giao dịch ngân hàng khớp.
- Dữ liệu ảnh đang có một số mã hóa đơn `PERF-` và khóa i18n thô như `invoices`, `invoiceDescription`; đây là dữ liệu/hiển thị của môi trường kiểm thử, không phải quy ước mã khuyến nghị.

---

## 10. Công nợ và Thanh toán

### Mục đích

Theo dõi tổng số tiền còn nợ theo phòng, số hóa đơn chưa thanh toán, gửi nhắc nợ và đối soát lịch sử giao dịch thành công.

![Màn hình Công nợ và Thanh toán](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/08_debt_financials.png)

### Theo dõi và nhắc công nợ

**Step 1:** Chọn **Công nợ**. Đọc Tổng công nợ hiện tại và số hóa đơn chưa thanh toán.

**Step 2:** Tìm theo phòng hoặc Người thuê; kiểm tra số hóa đơn và tổng nợ của từng phòng.

**Step 3:** Bấm biểu tượng chuông để gửi nhắc thanh toán cho đúng Người thuê.

### Đối soát thanh toán

**Step 1:** Chọn **Cổng thanh toán** để mở lịch sử các khoản đã thanh toán thành công.

**Step 2:** Lọc theo mã giao dịch, hóa đơn, Người thuê, phương thức và khoảng ngày.

**Step 3:** Mở chi tiết giao dịch, đối chiếu mã tham chiếu, số tiền và sao kê trước khi chốt sổ.

### Mẹo vận hành và lưu ý tài chính

- Gửi nhắc đúng tần suất; tránh gửi liên tục khi giao dịch đang trong thời gian đối soát.
- Không xóa hoặc sửa chứng từ để làm khớp công nợ. Hãy lập điều chỉnh có lý do và bằng chứng.
- Tổng công nợ trên Dashboard, trang Công nợ và tổng hóa đơn phải được đối chiếu theo cùng thời điểm dữ liệu.
- Không công khai ảnh có số điện thoại, mã giao dịch hoặc số tiền nợ của Người thuê.

---

## 11. Quản lý Sự cố Sửa chữa

### Mục đích

Tiếp nhận yêu cầu sửa chữa từ Người thuê, phân loại, giao người phụ trách, theo dõi chi phí dự kiến và cập nhật tiến độ.

![Màn hình Quản lý Sự cố Sửa chữa](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/09_repair_tickets.png)

### Các bước sử dụng

**Step 1:** Chọn **Sửa chữa & Sự cố**. Dùng ô tìm kiếm theo phòng hoặc nội dung.

**Step 2:** Khi có yêu cầu mới, mở yêu cầu để đọc mô tả và ảnh đính kèm; xác định mức độ ưu tiên, người phụ trách và chi phí dự kiến.

**Step 3:** Chuyển trạng thái sang Đang xử lý khi đã tiếp nhận, thêm ghi chú, rồi đánh dấu hoàn thành sau khi Người thuê xác nhận.

### Mẹo vận hành và lưu ý

- Ưu tiên ngay các sự cố điện, cháy nổ, rò nước hoặc mất an toàn.
- Không đánh dấu hoàn thành chỉ dựa vào báo cáo của nhà thầu; cần xác nhận hiện trạng.
- Ảnh minh họa hiển thị trạng thái rỗng **Chưa có sự cố**, phù hợp với dữ liệu kiểm thử tại thời điểm chụp.
- Ảnh hiện trường có thể chứa đồ dùng cá nhân; giới hạn người xem và thời gian lưu.

---

## 12. Trợ lý TroHub AI Co-Pilot

### Mục đích

Hỗ trợ tra cứu nhanh, tóm tắt vận hành, soạn nội dung nhắc nợ và gợi ý thao tác trong WebAdmin.

![Màn hình Trợ lý TroHub AI Co-Pilot](file:///Users/nguyen/TroHub_Local/docs/screenshots/webadmin/10_ai_copilot_assistant.png)

### Các bước sử dụng

**Step 1:** Bấm **Trợ lý AI** ở góc dưới bên phải để mở cửa sổ TroHub AI Assistant.

**Step 2:** Chọn một gợi ý có sẵn hoặc nhập câu hỏi. Có thể dùng nút micro nếu trình duyệt đã được cấp quyền.

**Step 3:** Đọc câu trả lời, sao chép hoặc nghe nội dung khi cần. Nếu AI gợi ý mở biểu mẫu, kiểm tra lại toàn bộ dữ liệu trước khi lưu.

### Mẹo vận hành và lưu ý bảo mật

- Không nhập mật khẩu, mã mời, CCCD đầy đủ, token, khóa API hoặc thông tin ngân hàng nhạy cảm vào hội thoại.
- AI chỉ hỗ trợ; quyết định tài chính, pháp lý, chấm dứt hợp đồng và xử lý dữ liệu cá nhân phải do người có thẩm quyền xác nhận.
- Khi soạn nhắc nợ, kiểm tra tên, phòng, số tiền, kỳ hóa đơn và giọng điệu trước khi gửi.
- Xóa lịch sử trò chuyện khi dùng máy chung hoặc khi hội thoại có dữ liệu nội bộ.

---

## 13. Cài đặt vận hành

WebAdmin còn có các trang cấu hình đã được kiểm tra trong phiên QA:

- **Quản lý dịch vụ:** cấu hình tên dịch vụ, đơn vị, cách tính và đơn giá mặc định.
- **Tài khoản:** cập nhật hồ sơ Chủ trọ và thông tin đăng nhập.
- **Ngân hàng:** cấu hình thông tin nhận thanh toán.
- **Chính sách và lịch nhắc:** cài ngày ân hạn, tỷ lệ phạt và lịch nhắc tự động.

### Nguyên tắc thay đổi cài đặt

1. Ghi lại giá trị trước khi thay đổi.
2. Kiểm tra phạm vi áp dụng với hợp đồng cũ và hợp đồng mới.
3. Sau khi lưu, mở một hóa đơn Preview để xác nhận giá và chính sách được tính đúng.
4. Không nhập thông tin ngân hàng trên máy không tin cậy hoặc khi đang chia sẻ màn hình.

---

## 14. Danh sách route đã kiểm tra

| Nhóm | Route | Kết quả |
|---|---|---|
| Công khai | `/` | HTTP 200 |
| Công khai | `/forgot-password` | HTTP 200 |
| Công khai | `/request-invite` | HTTP 200 |
| Tổng quan | `/dashboard` | HTTP 200 |
| Phòng | `/dashboard/rooms` | HTTP 200 |
| Người thuê | `/dashboard/tenants` | HTTP 200 |
| Hợp đồng | `/dashboard/contracts` | HTTP 200 |
| Tạo hợp đồng | `/dashboard/contracts/new` | HTTP 200 |
| Điện nước | `/dashboard/utilities` | HTTP 200 |
| Hóa đơn | `/dashboard/invoices` | HTTP 200 |
| Công nợ | `/dashboard/debts` | HTTP 200 |
| Thanh toán | `/dashboard/payments` | HTTP 200 |
| Dịch vụ | `/dashboard/services` | HTTP 200 |
| Sửa chữa | `/dashboard/repairs` | HTTP 200 |
| Cài đặt | `/dashboard/settings` | HTTP 200 |
| Tài khoản | `/dashboard/settings/account` | HTTP 200 |
| Ngân hàng | `/dashboard/settings/banking` | HTTP 200 |
| Chính sách hóa đơn | `/dashboard/settings/billing` | HTTP 200 |

---

## 15. Phát hiện Visual QA cần theo dõi

### Mức ưu tiên cao

1. **Khóa i18n hiển thị thô:** trang đăng nhập/đăng ký, Hóa đơn, bộ lọc tầng và mục Dịch vụ có các chuỗi như `registerLandlord`, `invoices`, `all`, `floor 1`, `nav.services`. Cần chuẩn hóa lời gọi dịch sang namespace hiện có.
2. **Modal Quyết toán hẹp:** phần Meter Ledger có nội dung cạnh phải bị cắt ở khung hình desktop 1440 px. Cần kiểm tra overflow và bố cục responsive trước khi dùng trong vận hành thật.

### Mức ưu tiên trung bình

1. **Dữ liệu kiểm thử không đồng nhất:** một số hóa đơn có mã `PERF-`, tên hiển thị không chuẩn và công nợ lớn. Nên tách bộ seed hướng dẫn khỏi dữ liệu performance test.
2. **Sửa chữa đang rỗng:** ảnh minh họa xác nhận empty state hoạt động, nhưng cần bổ sung một yêu cầu mẫu nếu dùng tài liệu cho đào tạo thao tác xử lý ticket.

### Trạng thái dữ liệu sau QA

- Không bấm xác nhận quyết toán, phát hành hóa đơn, đánh dấu đã thu hoặc xóa dữ liệu.
- Một hợp đồng hiệu lực được chuyển tạm sang trạng thái chờ trả phòng để mở modal; sau khi chụp đã được hoàn nguyên về trạng thái hiệu lực.
- Các giá trị nhập thử trên màn hình điện nước không được lưu.

---

## 16. Checklist vận hành hằng ngày

### Đầu ngày

- Kiểm tra **Cần xử lý hôm nay**, hợp đồng chờ duyệt và sự cố mới.
- Kiểm tra thông báo thanh toán và các hóa đơn sắp đến hạn.
- Xác nhận tình trạng phòng trống, bảo trì và phòng đang thuê.

### Cuối kỳ điện nước

- Ghi/chụp chỉ số từng phòng.
- Đối chiếu chỉ số mới không nhỏ hơn chỉ số cũ.
- Kiểm tra Preview trước khi phát hành hóa đơn.

### Cuối ngày hoặc cuối tháng

- Đối soát thanh toán với sao kê.
- Kiểm tra tổng công nợ và các khoản quá hạn.
- Đăng xuất khỏi thiết bị dùng chung và bảo vệ bản xuất dữ liệu có thông tin cá nhân.

---

## 17. Hỗ trợ và xử lý lỗi cơ bản

- Nếu trang không tải, kiểm tra WebAdmin ở cổng 3000 và Backend ở cổng 5000.
- Nếu bị chuyển về trang đăng nhập, đăng nhập lại; không cố chỉnh local storage hoặc token.
- Nếu số tiền không khớp, dừng thao tác phát hành/duyệt và đối chiếu hợp đồng, chỉ số, dịch vụ cùng lịch sử thanh toán.
- Nếu camera không mở, kiểm tra quyền camera của trình duyệt hoặc nhập chỉ số thủ công kèm bằng chứng.
- Nếu AI không phản hồi, tiếp tục thao tác trực tiếp trên phân hệ; không trì hoãn nghiệp vụ an toàn hoặc tài chính khẩn cấp.

