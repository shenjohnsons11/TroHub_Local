# BÁO CÁO KIỂM THỬ ĐA NỀN TẢNG: VAI TRÒ NGƯỜI THUÊ

Ngày kiểm thử: 08/07/2026  
Dự án: TroHub_Local  
Phạm vi: Mobile App Expo chạy web, Web Admin React/Next, Backend API  
Tài khoản Người thuê dùng kiểm thử: `0909111112 / 123456`  
Phòng dữ liệu kiểm thử: `A111`  
Marker E2E chính: `QA_NGUOI_THUE_UI_1783521600000`

## 1. Tổng quan & môi trường kiểm thử

| Thành phần | Lệnh/URL | Trạng thái | Ghi chú |
|---|---:|---|---|
| Backend API | `npm start` tại `backend`, `http://localhost:3000/api` | PASS | Server lắng nghe `0.0.0.0:3000`, MongoDB kết nối thành công. |
| Mobile App Expo web | `npx expo start --web --port 8083`, `http://localhost:8083` | PASS + WARNING | App chạy được. Expo cảnh báo một số package lệch patch version và React Native Web cảnh báo deprecated `shadow*`, `pointerEvents`. |
| Web Admin React/Next | `npm run dev -- -p 3001`, `http://localhost:3001` | PASS + WARNING | Dashboard chạy được. Next cảnh báo workspace root do có nhiều lockfile. |
| Legacy Web Admin static | `npx http-server . -p 8084` | PASS | Chạy để dùng hạ tầng Cypress sẵn có. |
| Cypress E2E | `node_modules/.bin/cypress run --spec cypress/e2e/nguoithue_visual.cy.js --browser electron --headless` | PASS | 2/2 test pass, 5 screenshot được lưu vào `reports/nguoithue_assets`. |

## 2. Chi tiết luồng kiểm thử hệ thống

### 📱 [BƯỚC 1 & 2: KẾT QUẢ TEST LUỒNG NGHIỆP VỤ (APP ↔ WEB)]

| Test case | Kịch bản | Kết quả | Bằng chứng |
|---|---|---|---|
| NT-E2E-01 | Người thuê đăng nhập App bằng số điện thoại `0909111112` | PASS | Login API trả `200`, role `2`; App vào trang chủ và hiển thị phòng `A111`. |
| NT-E2E-02 | Người thuê xem hóa đơn trên App | PASS | App hiển thị danh sách hóa đơn phòng `A111`; API `/me` ghi nhận `2` hóa đơn. |
| NT-E2E-03 | Người thuê xem hợp đồng trên App | PASS | App hiển thị hợp đồng phòng `A111`; API `/me` ghi nhận `1` hợp đồng. |
| NT-E2E-04 | Người thuê tạo yêu cầu sửa chữa bằng App | PASS | Cypress nhập marker `QA_NGUOI_THUE_UI_1783521600000`, App hiển thị lại bản ghi trong danh sách đã gửi. |
| NT-E2E-05 | Web Admin nhận dữ liệu yêu cầu sửa chữa từ App | PASS | Web Admin lọc được đúng marker `QA_NGUOI_THUE_UI_1783521600000` trên màn sửa chữa. |
| NT-API-01 | Tạo yêu cầu sửa chữa qua API portal `/api/me/repairs` | WARNING | API trả `201`, `/api/me` thấy bản ghi, nhưng App không hiển thị bản ghi này do App đang lấy `/api/repairs` rồi lọc client-side. Đây là dấu hiệu không thống nhất giữa service App và endpoint portal. |
| NT-SEC-01 | Gọi `/api/invoices` không token | FAIL | Backend trả `200`, cho phép đọc dữ liệu hóa đơn khi chưa xác thực. |
| NT-SEC-02 | Gọi `/api/repairs` không token | FAIL | Backend trả `200`, trả về `7` bản ghi sửa chữa tại thời điểm kiểm thử. |
| NT-SEC-03 | POST `/api/repairs` không token | FAIL | Backend trả `201`, tạo được bản ghi marker `QA_NGUOI_THUE_UNAUTH_1783521908846`. |

Kết quả API chính:

```json
{
  "login": { "status": 200, "success": true, "role": 2 },
  "portal": { "contracts": 1, "invoices": 2, "repairs": 3 },
  "noToken": { "invoicesStatus": 200, "repairsStatus": 200, "repairCount": 7 },
  "unauthCreate": {
    "status": 201,
    "success": true,
    "marker": "QA_NGUOI_THUE_UNAUTH_1783521908846"
  }
}
```

## 3. Đánh giá Giao diện Mobile App

### 🎨 [BƯỚC 3: ĐÁNH GIÁ UI/UX MOBILE APP]

![Trang chủ Người thuê](nguoithue_assets/nguoithue-app-01-home.png)

**Screenshot 1 - Trang chủ Người thuê.** Màn hình ưu tiên số tiền, hạn thanh toán và các hành động nhanh. Bố cục dễ quét trên khung 430px, khoảng cách ổn, bottom navigation có vùng bấm rõ. Điểm yếu: chữ trong quick card khá ngắn nhưng chưa có icon ngữ nghĩa, làm giảm khả năng nhận diện nhanh khi người dùng thao tác một tay.

![Hóa đơn Người thuê](nguoithue_assets/nguoithue-app-02-invoices.png)

**Screenshot 2 - Hóa đơn.** Bộ lọc `Tất cả / Chưa TT / Đã TT` dễ hiểu, badge trạng thái nổi bật. Tuy nhiên nhãn `Chưa TT` và `Đã TT` là viết tắt, không tốt cho accessibility và có thể gây mơ hồ với người dùng mới. Nút `Thanh toán` đủ nổi bật nhưng cần đảm bảo trạng thái loading và chống double tap khi gọi API thanh toán.

![Hợp đồng Người thuê](nguoithue_assets/nguoithue-app-03-contracts.png)

**Screenshot 3 - Hợp đồng.** Card hợp đồng hiển thị phòng, trạng thái, thời hạn, tiền thuê và tiền cọc theo thứ tự hợp lý. Typography rõ, badge màu xanh cho trạng thái có hiệu lực dễ hiểu. Điểm cần sửa: nội dung tài chính nên dùng alignment cố định hoặc bảng nhỏ để giảm lệch nhịp đọc khi có nhiều hợp đồng.

![Yêu cầu sửa chữa Người thuê](nguoithue_assets/nguoithue-app-04-repairs.png)

**Screenshot 4 - Yêu cầu sửa chữa trên App.** Form tạo yêu cầu sửa chữa có đủ phòng, loại sự cố, mô tả, ảnh và CTA. Touch target của nút chính tốt. Điểm mù: upload ảnh đang chiếm nhiều chiều cao, đẩy lịch sử xuống thấp; với màn nhỏ, người dùng khó thấy bản ghi vừa tạo nếu danh sách dài. Nên thu gọn upload thành row compact sau khi chưa chọn ảnh.

![Đồng bộ Web Admin](nguoithue_assets/nguoithue-webadmin-01-repair-sync.png)

**Screenshot 5 - Web Admin nhận yêu cầu sửa chữa từ App.** Web Admin lọc được marker từ App, chứng minh đồng bộ dữ liệu hoạt động. UI bảng rõ ở desktop, nhưng cột nội dung bị truncate ở `max-w-[200px]`, khiến mã sự cố/dữ liệu dài dễ bị che; cần tooltip hoặc drawer chi tiết để Chủ trọ xử lý không bị mất ngữ cảnh.

### Nhất quán App ↔ Web

| Tiêu chí | Đánh giá | Nhận xét |
|---|---|---|
| Màu chủ đạo | PASS | Cam TroHub nhất quán ở CTA, active tab và badge chính. |
| Layout | PASS | App dùng card mobile; Web dùng table desktop. Hai nền tảng đúng theo ngữ cảnh sử dụng. |
| Ngôn ngữ nghiệp vụ | WARNING | Một số nhãn rút gọn như `Chưa TT` nên viết đầy đủ. |
| Trạng thái dữ liệu | WARNING | App có thể không hiển thị dữ liệu tạo qua endpoint portal vì service sửa chữa đang đọc `/repairs` và lọc ở client. |
| Accessibility | WARNING | Cần bổ sung label rõ cho icon-only action trên Web Admin và tránh viết tắt trong App. |

## 4. Red Teaming bảo mật & logic

### ⚔️ [BƯỚC 4: RED TEAMING BẢO MẬT & LOGIC]

**Rủi ro 1: Endpoint sửa chữa và hóa đơn không bắt buộc xác thực.**  
Kết quả kiểm thử cho thấy `/api/invoices` và `/api/repairs` trả `200` khi không có token; POST `/api/repairs` không token vẫn tạo bản ghi `201`. Đây là lỗi chặn release vì dữ liệu hóa đơn, phòng và yêu cầu sửa chữa có thể bị đọc hoặc bơm rác từ bên ngoài.  
Đề xuất: bắt buộc middleware auth cho toàn bộ route hóa đơn/sửa chữa; phân quyền role theo route; validate token trước khi query; ghi audit log cho mutation.

**Rủi ro 2: App lọc dữ liệu Người thuê ở client sau khi đọc danh sách sửa chữa chung.**  
`repairService.getRequests()` gọi `/repairs`, nhận danh sách chung rồi lọc `tenantId` phía App. Nếu API trả quá nhiều dữ liệu hoặc populate thiếu, App vừa lộ dữ liệu không cần thiết vừa dễ sai trạng thái.  
Đề xuất: thay bằng endpoint server-side scoped như `GET /api/me/repairs`; backend chỉ trả bản ghi thuộc Người thuê trong token; không truyền `tenantId` từ client khi tạo.

**Rủi ro 3: Có thể spam yêu cầu sửa chữa.**  
POST không token đã tạo được bản ghi. Ngay cả khi bổ sung token, hiện chưa thấy rate limit, idempotency key, captcha nhẹ hoặc giới hạn theo phòng/ngày. Người dùng xấu có thể bơm hàng trăm yêu cầu làm nghẽn Web Admin.  
Đề xuất: rate limit theo account/IP/phòng, giới hạn số yêu cầu mở, chống nội dung trùng lặp trong khung thời gian ngắn, thêm trạng thái soft-delete và hàng đợi xử lý.

**Rủi ro 4: Web Admin dùng localStorage để mở dashboard nhưng API chưa bảo vệ đủ.**  
Trong kiểm thử screenshot, chỉ cần set `trohub_user` ở localStorage là UI dashboard render và gọi `/repairs`. Khi backend route không chặn token, bảo vệ UI không còn giá trị.  
Đề xuất: Web Admin chỉ là lớp hiển thị; mọi quyền truy cập phải enforced ở API. Next route nên redirect nếu thiếu token, nhưng backend vẫn phải là nguồn kiểm soát chính.

**Rủi ro 5: Mapping trạng thái sửa chữa thiếu hợp đồng rõ ràng giữa App và Web.**  
App map `0/1/2` thành `pending/processing/done`, Web Admin hiển thị chuỗi tiếng Việt. Nếu backend trả format khác, UI dễ rơi vào badge mặc định hoặc không hiện nút thao tác.  
Đề xuất: chuẩn hóa enum backend, tạo shared contract hoặc OpenAPI schema; test contract cho trạng thái `pending`, `processing`, `done`, `cancelled`.

## 5. Action Items ưu tiên

| Ưu tiên | Hạng mục | Chủ sở hữu đề xuất | Tiêu chí hoàn tất |
|---|---|---|---|
| P0 | Bắt buộc auth + role guard cho `/api/invoices`, `/api/repairs`, mutation liên quan sửa chữa/hóa đơn | Backend | Không token trả `401`; sai role trả `403`; Người thuê chỉ thấy dữ liệu của chính mình. |
| P0 | Chuyển App sửa chữa sang `/api/me/repairs` server-side scoped | Mobile/API | App không gọi danh sách chung; dữ liệu tạo qua App và portal thống nhất. |
| P1 | Thêm rate limit và chống spam tạo yêu cầu sửa chữa | Backend | Quá ngưỡng trả `429`; nội dung trùng lặp được chặn hoặc cảnh báo. |
| P1 | Bổ sung E2E regression cho App ↔ Web | QA | Test login, hóa đơn, hợp đồng, tạo sửa chữa, Web Admin nhận dữ liệu chạy trong CI. |
| P2 | Cải thiện UI mobile cho màn sửa chữa | Frontend | Upload ảnh compact hơn; lịch sử nằm trong vùng dễ thấy; trạng thái gửi có loading/disabled. |
| P2 | Cải thiện bảng Web Admin sửa chữa | Frontend | Nội dung dài có tooltip/drawer; icon action có accessible label. |

## 6. Kết luận kiểm thử

Luồng nghiệp vụ chính của Người thuê trên App chạy được: đăng nhập, xem hóa đơn, xem hợp đồng, tạo yêu cầu sửa chữa và Web Admin nhận được bản ghi tương ứng. Tuy nhiên hệ thống chưa đạt ngưỡng an toàn để release vì backend đang cho đọc và tạo dữ liệu nhạy cảm không cần token ở các endpoint trọng yếu. Vấn đề cần xử lý đầu tiên là phân quyền API, sau đó mới tối ưu UI và mở rộng test coverage.
