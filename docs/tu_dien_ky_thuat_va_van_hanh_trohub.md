# Từ điển kỹ thuật và vận hành TroHub

**Tên tiếng Anh:** TroHub Developer Dictionary & Upgrade Guide  
**Phiên bản nguồn đã rà soát:** workspace `main` tại `/Users/nguyen/TroHub_Local`, ngày 07-08-2026.  
**Quy ước số dòng:** `Lx` là dòng bắt đầu route, export controller, field schema hoặc hàm trong phiên bản trên. Prefix API được ghép tại `backend/server.js:L56-L76`.  
**Phạm vi:** Backend Node.js/Express/Mongoose, WebAdmin Next.js và Mobile React Native/Expo. Nhánh worktree `feature/property-membership-dashboard` được giữ độc lập theo quyết định trước đó, nên không thuộc chỉ mục mã nguồn `main` này.

## Cách dùng nhanh

1. Tìm mã `API-*` để đi từ endpoint sang route, controller và logic.
2. Tìm mã `MODEL-*` để biết nơi dữ liệu được lưu, kiểu dữ liệu và liên kết MongoDB.
3. Dùng Mục 3 khi cần tái sử dụng helper hoặc đi theo một luồng tích hợp.
4. Dùng Mục 4 để xác định màn hình trước khi sửa UI.
5. Làm đúng danh sách Mục 5 khi mở rộng schema, Mobile, JWT hoặc MongoDB.

## Mục 1 — Từ điển tất cả API và Controllers

### 1.1. Điểm mount, bảo vệ và quy ước phản hồi

| Prefix | Mount | Phạm vi/bảo vệ thực tế |
|---|---|---|
| `/api/rooms` | `backend/server.js:L56` | Room router, yêu cầu Admin ở route. |
| `/api/tenants` | `backend/server.js:L57` | Quản lý người thuê; một số read endpoint không gắn middleware riêng trong route. |
| `/api/contracts` | `backend/server.js:L58` | Hợp đồng, ký, duyệt, checkout. |
| `/api/invoices` | `backend/server.js:L59` | Hóa đơn, lô hóa đơn, công nợ. |
| `/api/repairs` | `backend/server.js:L60` | Sửa chữa. |
| `/api/notifications` | `backend/server.js:L61` | Router áp `requireAuth` tại `notificationRoutes.js:L6`. |
| `/api/auth` | `backend/server.js:L62` | Đăng ký, đăng nhập, hồ sơ, OTP reset. |
| `/api/seed` | `backend/server.js:L63` | Seed/bảo trì; hiện không gắn middleware, chỉ dùng môi trường phát triển an toàn. |
| `/api/settings` | `backend/server.js:L64` | Settings, Admin. |
| `/api/me` | `backend/server.js:L65` | Portal và hành động Tenant. |
| `/api/payments` | `backend/server.js:L66` | VietQR, VNPay, transactions. |
| `/api/vnpay/ipn` | `backend/server.js:L67` | Alias IPN mount trực tiếp. |
| `/api/services` | `backend/server.js:L68` | Dịch vụ, Admin. |
| `/api/settings/billing-policy` | `backend/server.js:L69` | Chính sách hóa đơn, Admin. |
| `/api/utilities` | `backend/server.js:L70` | Dữ liệu đọc đồng hồ. |
| `/api/ocr` | `backend/server.js:L71` | OCR ảnh đồng hồ. |
| `/vqr` | `backend/server.js:L72` | VietQR direct, không có prefix `/api`. |
| `/api/dashboard`, `/api/landlord` | `backend/server.js:L73-L74` | Cùng dashboard controller. |
| `/api/ai` | `backend/server.js:L75` | AI chat, `requireAuth`. |
| `/api/admin/accounts` | `backend/server.js:L76` | Mật khẩu tạm, `requireAdmin`. |

Mọi endpoint thành công trả JSON; controller dùng các dạng `message`, `data`, entity trực tiếp hoặc dữ liệu nghiệp vụ. Bảng dưới dùng `Bearer` để chỉ header `Authorization: Bearer <JWT>` khi route yêu cầu đăng nhập. JWT hiện có thời hạn 30 ngày; không có API refresh token trong source hiện tại.

### 1.2. Auth, Account và AI

| Mã API | Phương thức | Endpoint | Route & dòng | Controller & dòng | Input | Output | Logic vận hành chi tiết |
|---|---|---|---|---|---|---|---|
| API-AUTH-01 | POST | `/api/auth/register` | `routes/authRoutes.js:L6` | `controllers/authController.js:L50` | `username,password,fullName,phone,email,idCard,role`; Landlord có `inviteCode,propertyAddress,latitude,longitude` | account an toàn + JWT | Chuẩn hóa SĐT, kiểm tra trùng; role 1 xác thực mã mời rồi tạo Account, trả token. |
| API-AUTH-02 | GET | `/api/auth/reverse-geocode` | `routes/authRoutes.js:L7` | `controllers/authController.js:L143` | Query `latitude,longitude` | Địa chỉ geocode | Chuyển tọa độ đăng ký nhà trọ thành địa chỉ hiển thị. |
| API-AUTH-03 | POST | `/api/auth/login` | `routes/authRoutes.js:L8` | `controllers/authController.js:L158` | `identifier,password` | JWT + account/profile | Tìm theo username/SĐT/email, kiểm tra hash mật khẩu và trạng thái, ký JWT. |
| API-AUTH-04 | POST | `/api/auth/forgot-password` | `routes/authRoutes.js:L9` | `controllers/authController.js:L321` | `identifier` | Trạng thái gửi OTP | Tạo/hash OTP reset và gửi theo cấu hình email. |
| API-AUTH-05 | POST | `/api/auth/verify-reset-otp` | `routes/authRoutes.js:L10` | `controllers/authController.js:L383` | `identifier,otp` | reset nonce | So hash OTP còn hạn và cấp nonce một lần cho bước đổi mật khẩu. |
| API-AUTH-06 | POST | `/api/auth/reset-password` | `routes/authRoutes.js:L11` | `controllers/authController.js:L428` | `identifier,resetNonce,newPassword` | Xác nhận đổi mật khẩu | Xác minh nonce rồi cập nhật mật khẩu và trạng thái reset. |
| API-AUTH-07 | GET | `/api/auth/me` | `routes/authRoutes.js:L12` | `controllers/authController.js:L209` | Bearer | Hồ sơ account | Nạp account hiện tại từ claim JWT, loại trừ dữ liệu nhạy cảm. |
| API-AUTH-08 | PUT | `/api/auth/me` | `routes/authRoutes.js:L13` | `controllers/authController.js:L233` | Bearer + profile/bank/property fields | Hồ sơ đã cập nhật | Cập nhật hồ sơ người dùng và thông tin ngân hàng/vị trí của Landlord. |
| API-AUTH-09 | PUT | `/api/auth/change-password` | `routes/authRoutes.js:L14` | `controllers/authController.js:L283` | Bearer + `currentPassword,newPassword` | Xác nhận đổi mật khẩu | Bắt buộc so khớp mật khẩu cũ trước khi lưu hash mới. |
| API-ACCOUNT-01 | POST | `/api/admin/accounts/:accountId/temporary-password` | `routes/adminAccountRoutes.js:L12-L16` | `controllers/passwordResetController.js:L84` | Admin Bearer + `temporaryPassword` | Account đã bật `mustChangePassword` | Admin cấp mật khẩu tạm cho Account đích. |
| API-AI-01 | POST | `/api/ai/chat` | `routes/aiRoutes.js:L6` | `controllers/aiController.js:L3` | Bearer + `message` | `answer`, `action` có allow-list | Đóng gói context theo role, gọi Gemini và chỉ cho Admin nhận auto-fill action. |

### 1.3. Rooms, Tenants và Contracts

| Mã API | Phương thức | Endpoint | Route & dòng | Controller & dòng | Input | Output | Logic vận hành chi tiết |
|---|---|---|---|---|---|---|---|
| API-ROOM-01 | GET | `/api/rooms` | `routes/roomRoutes.js:L7` | `controllers/roomController.js:L14` | Admin Bearer | Mảng Room | Lọc theo `landlordId` của Admin hiện tại. |
| API-ROOM-02 | POST | `/api/rooms` | `routes/roomRoutes.js:L8` | `controllers/roomController.js:L54` | Admin + `roomCode,area,defaultRentPrice,defaultDeposit,floor` | Room mới | Tạo phòng sở hữu bởi Landlord bearer. |
| API-ROOM-03 | GET | `/api/rooms/:id` | `routes/roomRoutes.js:L11` | `controllers/roomController.js:L105` | Admin + room id | Room | Kiểm tra ownership trước khi trả chi tiết. |
| API-ROOM-04 | PUT | `/api/rooms/:id` | `routes/roomRoutes.js:L12` | `controllers/roomController.js:L120` | Admin + room fields | Room đã sửa | Cập nhật thông tin, giá mặc định hoặc trạng thái phòng. |
| API-ROOM-05 | DELETE | `/api/rooms/:id` | `routes/roomRoutes.js:L13` | `controllers/roomController.js:L151` | Admin + room id | Xác nhận xóa | Xóa Room thuộc Landlord sau kiểm tra quyền. |
| API-ROOM-06 | POST | `/api/rooms/bulk-report-utility` | `routes/roomRoutes.js:L16` | `controllers/roomController.js:L205` | Admin + danh sách room/readings | Các Room đã lưu nháp | Lưu `draftElectricity,draftWater` cho nhiều phòng. |
| API-ROOM-07 | POST | `/api/rooms/:id/report-utility` | `routes/roomRoutes.js:L19` | `controllers/roomController.js:L181` | Admin + chỉ số điện/nước | Room đã lưu nháp | Lưu chỉ số nháp cho một phòng. |
| API-TENANT-01 | POST | `/api/tenants/check-duplicate` | `routes/tenantRoutes.js:L7` | `controllers/tenantController.js:L63` | `phone,idCard,email` | Cờ/match trùng | Kiểm tra trước khi tạo danh bạ hay liên kết người thuê. |
| API-TENANT-02 | GET | `/api/tenants/lookup` | `routes/tenantRoutes.js:L8` | `controllers/tenantController.js:L99` | Query `identifier` | Account Tenant hoặc không tìm thấy | Chuẩn hóa identifier và tra theo SĐT, CCCD hoặc email. |
| API-TENANT-03 | GET | `/api/tenants` | `routes/tenantRoutes.js:L9` | `controllers/tenantController.js:L14` | Landlord Bearer | Tenant/contract liên quan | Tổng hợp Tenant trong phạm vi Landlord. |
| API-TENANT-04 | POST | `/api/tenants` | `routes/tenantRoutes.js:L10` | `controllers/tenantController.js:L109`; `services/tenantLinkService.js:L40` | `fullName,phone,idCard,email`, tùy chọn `roomCode` và terms | Tenant/link/contract tùy dữ liệu | Không có `roomCode`: chỉ tạo/liên kết danh bạ. Có Room: tạo contract draft và chuyển phòng có khách. |
| API-TENANT-05 | GET | `/api/tenants/:id` | `routes/tenantRoutes.js:L11` | `controllers/tenantController.js:L138` | Tenant id | Profile Tenant | Đọc hồ sơ Tenant theo id. |
| API-TENANT-06 | PUT | `/api/tenants/:id` | `routes/tenantRoutes.js:L12` | `controllers/tenantController.js:L149` | Tenant fields | Tenant đã cập nhật | Sửa danh bạ/hồ sơ Tenant. |
| API-TENANT-07 | PUT | `/api/tenants/:id/terminate` | `routes/tenantRoutes.js:L13` | `controllers/tenantController.js:L183` | Tenant id | Trạng thái kết thúc | Thực hiện nhánh terminate theo controller hiện hữu. |
| API-TENANT-08 | GET | `/api/tenants/home-summary/:tenantId` | `routes/tenantRoutes.js:L16` | `controllers/tenantController.js:L224` | Tenant id | Tóm tắt home | Trả hợp đồng, phòng, invoice và dữ liệu home cho Mobile Tenant. |
| API-CONTRACT-01 | GET | `/api/contracts` | `routes/contractRoutes.js:L8` | `controllers/contractController.js:L43` | Bearer | Mảng Contract | Role 1 lấy theo rooms của mình; role 2 lấy theo `tenantId`. |
| API-CONTRACT-02 | POST | `/api/contracts` | `routes/contractRoutes.js:L9` | `controllers/contractController.js:L115` | Admin + room/tenant/start/end/rent/deposit/meters/services | Contract draft | Chuẩn hóa giá điện/nước và kế thừa chỉ số meter trước khi tạo. |
| API-CONTRACT-03 | POST | `/api/contracts/:id/send` | `routes/contractRoutes.js:L10` | `controllers/contractController.js:L247` | Admin + contract id | Contract + notification | Gửi hợp đồng cho Tenant và cập nhật `lastSentAt`. |
| API-CONTRACT-04 | GET | `/api/contracts/history` | `routes/contractRoutes.js:L13` | `controllers/contractController.js:L84` | Admin Bearer | Hợp đồng kết thúc | Trả lịch sử hợp đồng theo phạm vi Landlord. |
| API-CONTRACT-05 | GET | `/api/contracts/:id` | `routes/contractRoutes.js:L16` | `controllers/contractController.js:L231` | Bearer + id | Contract populated | Trả Room, Tenant và Service có kiểm tra quyền. |
| API-CONTRACT-06 | PUT | `/api/contracts/:id` | `routes/contractRoutes.js:L19` | `controllers/contractController.js:L411` | Admin + trường hợp đồng | Contract đã sửa | Cập nhật từng phần, chuẩn hóa lại meter terms khi giá/chỉ số đổi. |
| API-CONTRACT-07 | PUT | `/api/contracts/:id/sign` | `routes/contractRoutes.js:L22` | `controllers/contractController.js:L264` | Tenant Bearer + id | Contract status 4 | Tenant ký, ghi `tenantConfirmedAt`, chờ Admin xác nhận. |
| API-CONTRACT-08 | PUT | `/api/contracts/:id/confirm` | `routes/contractRoutes.js:L25` | `controllers/contractController.js:L294` | Admin + id | Contract active + Room occupied | Kiểm tra cọc rồi chuyển contract active và Room `status:1`. |
| API-CONTRACT-09 | GET | `/api/contracts/:id/checkout-preview` | `routes/contractRoutes.js:L28` | `controllers/contractController.js:L347`; `services/contractCheckoutService.js:L91` | Admin + id | Preview debt/deposit/meters | Tính chỉ số cũ, nợ chưa trả, cọc và số bù trừ chưa ghi DB. |
| API-CONTRACT-10 | PUT | `/api/contracts/:id/checkout` | `routes/contractRoutes.js:L29` | `controllers/contractController.js:L363`; `services/contractCheckoutService.js:L130` | Admin + meter mới, damage/note | Settlement, final invoice, Room trống | Mongo transaction lập quyết toán, chuyển invoice cũ `status:4`, kết thúc contract và Room `status:0`. |

### 1.4. Invoices, Utilities, Services, Settings và Dashboard

| Mã API | Phương thức | Endpoint | Route & dòng | Controller & dòng | Input | Output | Logic vận hành chi tiết |
|---|---|---|---|---|---|---|---|
| API-INVOICE-01 | GET | `/api/invoices` | `routes/invoiceRoutes.js:L8` | `controllers/invoiceController.js:L410` | Bearer, query filter | Mảng Invoice | Lọc invoice theo role và trạng thái. |
| API-INVOICE-02 | GET | `/api/invoices/bulk-preview` | `routes/invoiceRoutes.js:L11` | `controllers/invoiceController.js:L145` | Admin, query period | Room/contract/meter/price preview | Lấy contract active, chỉ số trước và điện/nước từ terms hoặc default `3500/15000`. |
| API-INVOICE-03 | GET | `/api/invoices/debts` | `routes/invoiceRoutes.js:L14` | `controllers/invoiceController.js:L835` | Admin Bearer | Công nợ theo contract | Tổng hợp invoice chưa thanh toán. |
| API-INVOICE-04 | POST | `/api/invoices/debts/:contractId/remind` | `routes/invoiceRoutes.js:L15` | `controllers/invoiceController.js:L892` | Admin + contract id | Kết quả gửi nhắc | Tạo notification công nợ cho Tenant hợp đồng. |
| API-INVOICE-05 | POST | `/api/invoices/bulk` | `routes/invoiceRoutes.js:L18` | `controllers/invoiceController.js:L252` | Admin + `period,invoices[]` | Invoice lô đã tạo | Tính từng dòng, lưu invoice, cập nhật meter Room và phát notification. |
| API-INVOICE-06 | POST | `/api/invoices` | `routes/invoiceRoutes.js:L21` | `controllers/invoiceController.js:L464` | Admin + invoice fields | Invoice mới | Lập invoice đơn lẻ trong phạm vi contract/room hợp lệ. |
| API-INVOICE-07 | GET | `/api/invoices/:id` | `routes/invoiceRoutes.js:L24` | `controllers/invoiceController.js:L716` | Bearer + invoice id | Invoice detail | Đọc chi tiết invoice có kiểm tra quyền. |
| API-INVOICE-08 | PUT | `/api/invoices/:id/pay` | `routes/invoiceRoutes.js:L27` | `controllers/invoiceController.js:L737` | Bearer + method/transaction fields | Invoice paid + Transaction | Chuyển thanh toán và sinh transaction. |
| API-INVOICE-09 | PUT | `/api/invoices/:id/remind` | `routes/invoiceRoutes.js:L30` | `controllers/invoiceController.js:L392` | Admin + invoice id | Invoice/reminder result | Tăng lần nhắc; có nhánh chuyển quá hạn và gửi notification. |
| API-INVOICE-10 | PUT | `/api/invoices/:id` | `routes/invoiceRoutes.js:L33` | `controllers/invoiceController.js:L778` | Admin + invoice fields | Invoice đã cập nhật | Sửa invoice phù hợp quyền Landlord. |
| API-UTILITY-01 | GET | `/api/utilities/readings` | `routes/utilityRoutes.js:L6` | `controllers/invoiceController.js:L145` | Admin, query period | Bulk-reading preview | Alias của bulk-preview cho màn utilities. |
| API-SERVICE-01 | GET | `/api/services` | `routes/serviceRoutes.js:L7` | `controllers/serviceController.js:L39` | Admin Bearer | Mảng Service | Lấy catalog dịch vụ theo Landlord. |
| API-SERVICE-02 | POST | `/api/services` | `routes/serviceRoutes.js:L8` | `controllers/serviceController.js:L145` | Admin + name/code/type/billing/price | Service mới | Tạo dịch vụ với ownership Landlord. |
| API-SERVICE-03 | POST | `/api/services/:id/price-impact` | `routes/serviceRoutes.js:L9` | `controllers/serviceController.js:L107` | Admin + proposed price | Preview contract bị ảnh hưởng | Xem trước contract active dùng dịch vụ trước khi đổi giá. |
| API-SERVICE-04 | PUT | `/api/services/:id/price` | `routes/serviceRoutes.js:L10` | `controllers/serviceController.js:L124` | Admin + `newPrice,contractIds` | Service/contracts/audit | Áp giá vào catalog và contract được chọn, ghi ServicePriceAudit. |
| API-SERVICE-05 | GET | `/api/services/:id` | `routes/serviceRoutes.js:L11` | `controllers/serviceController.js:L176` | Admin + service id | Service | Đọc một dịch vụ. |
| API-SERVICE-06 | PUT | `/api/services/:id` | `routes/serviceRoutes.js:L12` | `controllers/serviceController.js:L196` | Admin + fields | Service đã cập nhật | Cập nhật catalog dịch vụ. |
| API-SERVICE-07 | DELETE | `/api/services/:id` | `routes/serviceRoutes.js:L13` | `controllers/serviceController.js:L238` | Admin + service id | Xác nhận delete/archive | Xử lý dịch vụ đang được contract tham chiếu. |
| API-SETTING-01 | GET | `/api/settings` | `routes/settingsRoute.js:L7` | `controllers/settingsController.js:L5` | Admin Bearer | Settings Account | Đọc thiết lập Landlord. |
| API-SETTING-02 | PUT | `/api/settings` | `routes/settingsRoute.js:L8` | `controllers/settingsController.js:L29` | Admin + setting fields | Settings đã cập nhật | Lưu thiết lập Landlord. |
| API-BILLING-01 | GET | `/api/settings/billing-policy` | `routes/billingPolicyRoutes.js:L8` | `controllers/billingPolicyController.js:L16` | Admin Bearer | BillingPolicy | Đọc policy hoặc defaults của Landlord. |
| API-BILLING-02 | PUT | `/api/settings/billing-policy` | `routes/billingPolicyRoutes.js:L9` | `controllers/billingPolicyController.js:L31` | Admin + grace/fee/reminders | BillingPolicy đã lưu | Upsert policy hóa đơn theo Landlord. |
| API-DASHBOARD-01 | GET | `/api/dashboard/stats` | `routes/dashboardRoutes.js:L5`, `server.js:L73` | `controllers/dashboardController.js:L8` | Bearer | Stats dashboard | Tổng hợp thống kê cho role hiện tại. |
| API-DASHBOARD-02 | GET | `/api/landlord/stats` | `routes/dashboardRoutes.js:L5`, `server.js:L74` | `controllers/dashboardController.js:L8` | Landlord Bearer | Stats dashboard | Alias tương thích cho WebAdmin/Landlord. |

### 1.5. Tenant portal, Repairs và Notifications

| Mã API | Phương thức | Endpoint | Route & dòng | Controller & dòng | Input | Output | Logic vận hành chi tiết |
|---|---|---|---|---|---|---|---|
| API-ME-01 | GET | `/api/me` | `routes/meRoute.js:L7` | `controllers/meController.js:L30` | Tenant Bearer | Portal payload | Nạp contract, invoice, repair và dữ liệu portal Tenant. |
| API-ME-02 | PUT | `/api/me/sign-contract/:contractId` | `routes/meRoute.js:L10` | `controllers/meController.js:L191` | Tenant + id | Contract ký | Portal variant của ký hợp đồng. |
| API-ME-03 | PUT | `/api/me/pay-invoice/:invoiceId` | `routes/meRoute.js:L13` | `controllers/meController.js:L220` | Tenant + payment fields | Invoice/payment state | Tenant báo thanh toán invoice. |
| API-ME-04 | POST | `/api/me/repairs` | `routes/meRoute.js:L16` | `controllers/meController.js:L256` | Tenant + title/content/priority/images | RepairRequest | Tạo yêu cầu sửa chữa cho contract active. |
| API-ME-05 | DELETE | `/api/me/repairs/:id` | `routes/meRoute.js:L19` | `controllers/meController.js:L344` | Tenant + id | Xác nhận delete | Tenant xóa request thuộc chính mình. |
| API-ME-06 | PUT | `/api/me/request-terminate/:contractId` | `routes/meRoute.js:L22` | `controllers/meController.js:L308` | Tenant + id | Contract checkout requested | Đưa hợp đồng vào luồng yêu cầu checkout. |
| API-ME-07 | POST | `/api/me/report-utility` | `routes/meRoute.js:L25` | `controllers/meController.js:L357` | Tenant + reading/image | Kết quả báo số | Tenant gửi số điện/nước cho Landlord xử lý. |
| API-ME-08 | GET | `/api/me/invites` | `routes/meRoute.js:L28` | `controllers/meController.js:L385` | Tenant Bearer | Pending invites | Trả lời mời liên kết Tenant. |
| API-ME-09 | PUT | `/api/me/invites/:id/accept` | `routes/meRoute.js:L29` | `controllers/meController.js:L405` | Tenant + invite id | Invite accepted | Chấp nhận liên kết. |
| API-ME-10 | PUT | `/api/me/invites/:id/reject` | `routes/meRoute.js:L30` | `controllers/meController.js:L431` | Tenant + invite id | Invite rejected | Từ chối liên kết. |
| API-REPAIR-01 | GET | `/api/repairs` | `routes/repairRoutes.js:L8` | `controllers/repairController.js:L8` | Admin Bearer | Mảng RepairRequest | Lấy yêu cầu trong phạm vi Landlord. |
| API-REPAIR-02 | POST | `/api/repairs` | `routes/repairRoutes.js:L11` | `controllers/repairController.js:L62` | Tenant + request fields | RepairRequest | Tạo request với contract active. |
| API-REPAIR-03 | PUT | `/api/repairs/:id` | `routes/repairRoutes.js:L14` | `controllers/repairController.js:L124` | Admin + status/priority/landlordNote | RepairRequest | Cập nhật và gửi notification Tenant. |
| API-REPAIR-04 | DELETE | `/api/repairs/:id` | `routes/repairRoutes.js:L17` | `controllers/repairController.js:L191` | Admin + id | Xác nhận delete | Xóa request đúng quyền Landlord. |
| API-NOTIFY-01 | POST | `/api/notifications/devices` | `routes/notificationRoutes.js:L8` | `controllers/notificationController.js:L59` | Bearer + Expo token/platform/deviceId | PushDevice | Upsert thiết bị nhận Expo Push. |
| API-NOTIFY-02 | POST | `/api/notifications/devices/deactivate` | `routes/notificationRoutes.js:L9` | `controllers/notificationController.js:L84` | Bearer + token/device | Xác nhận deactivate | Tắt token khi logout/opt-out. |
| API-NOTIFY-03 | DELETE | `/api/notifications/devices/:deviceId` | `routes/notificationRoutes.js:L10` | `controllers/notificationController.js:L96` | Bearer + device id | Xác nhận delete | Xóa thiết bị đăng ký. |
| API-NOTIFY-04 | GET | `/api/notifications/unread-count` | `routes/notificationRoutes.js:L11` | `controllers/notificationController.js:L25` | Bearer | `{count}` | Đếm inbox chưa đọc user hiện tại. |
| API-NOTIFY-05 | PATCH | `/api/notifications/read-all` | `routes/notificationRoutes.js:L12` | `controllers/notificationController.js:L51` | Bearer | Số bản ghi cập nhật | Đánh dấu toàn bộ đã đọc. |
| API-NOTIFY-06 | PUT | `/api/notifications/read-all` | `routes/notificationRoutes.js:L13` | `controllers/notificationController.js:L51` | Bearer | Số bản ghi cập nhật | Alias PUT của read-all. |
| API-NOTIFY-07 | PATCH | `/api/notifications/:id/read` | `routes/notificationRoutes.js:L14` | `controllers/notificationController.js:L33` | Bearer + id | Notification đã đọc | Đánh dấu một bản ghi đã đọc. |
| API-NOTIFY-08 | PUT | `/api/notifications/:id/read` | `routes/notificationRoutes.js:L15` | `controllers/notificationController.js:L33` | Bearer + id | Notification đã đọc | Alias PUT của mark-read. |
| API-NOTIFY-09 | GET | `/api/notifications` | `routes/notificationRoutes.js:L16` | `controllers/notificationController.js:L12` | Bearer, query page/limit | Inbox Notification | Lấy notification của user hiện tại theo phân trang. |

### 1.6. Payments, OCR, VietQR và Seed/bảo trì

| Mã API | Phương thức | Endpoint | Route & dòng | Controller & dòng | Input | Output | Logic vận hành chi tiết |
|---|---|---|---|---|---|---|---|
| API-PAY-01 | GET | `/api/payments` | `routes/paymentRoute.js:L6` | `controllers/paymentController.js:L31` | Admin Bearer | Transactions/payments | Danh sách thanh toán thuộc phạm vi quản trị. |
| API-PAY-02 | POST | `/api/payments/vietqr/create` | `routes/paymentRoute.js:L9` | `controllers/paymentController.js:L73` | Bearer + invoice/payment context | QR/payment payload | Tạo dữ liệu thanh toán VietQR. |
| API-PAY-03 | POST | `/api/payments/vietqr/webhook` | `routes/paymentRoute.js:L12` | `controllers/paymentController.js:L254` | Payload webhook | Kết quả xử lý | Nhận/xử lý xác nhận VietQR theo controller. |
| API-PAY-04 | POST | `/api/payments/vnpay/create` | `routes/paymentRoute.js:L15` | `controllers/paymentController.js:L421` | Bearer + invoice/order | URL VNPay | Tạo URL chuyển hướng thanh toán VNPay. |
| API-PAY-05 | GET | `/api/payments/vnpay/ipn` | `routes/paymentRoute.js:L16` | `controllers/paymentController.js:L499` | Query VNPay IPN | Phản hồi IPN | Xác thực/ghi trạng thái gateway callback. |
| API-PAY-06 | GET | `/api/payments/:id/status` | `routes/paymentRoute.js:L19` | `controllers/paymentController.js:L200` | Bearer + payment id | Payment status | Tra trạng thái thanh toán. |
| API-PAY-07 | GET | `/api/vnpay/ipn` | `server.js:L67` | `controllers/paymentController.js:L499` | Query VNPay IPN | Phản hồi IPN | Alias mount trực tiếp của API-PAY-05. |
| API-OCR-01 | POST | `/api/ocr/meter` | `routes/ocrRoutes.js:L6` | `controllers/ocrController.js:L12` | Ảnh meter base64/multipart theo client | Chỉ số OCR/confidence | Tesseract OCR chỉ số điện/nước từ ảnh. |
| API-VQR-01 | POST | `/vqr/api/token_generate` | `routes/vietqrDirectRoutes.js:L5` | `controllers/vietqrDirectController.js:L76` | Credential/payload VietQR | VietQR token | Sinh token direct theo hợp đồng VietQR. |
| API-VQR-02 | POST | `/vqr/bank/api/transaction-sync` | `routes/vietqrDirectRoutes.js:L7-L9` | `controllers/vietqrDirectController.js:L121` | Payload đồng bộ ngân hàng | Kết quả sync | Đồng bộ transaction qua direct integration. |
| API-SEED-01 | GET | `/api/seed` | `routes/seedRoute.js:L12` | Inline handler `routes/seedRoute.js:L12` | Không | Seed result | Xóa/tạo dữ liệu seed; không dùng production. |
| API-SEED-02 | GET | `/api/seed/rooms` | `routes/seedRoute.js:L84` | Inline handler `routes/seedRoute.js:L84` | Không | Seed room result | Seed phòng kiểm thử. |
| API-SEED-03 | GET | `/api/seed/fix-transactions` | `routes/seedRoute.js:L102` | Inline handler `routes/seedRoute.js:L102` | Không | Maintenance result | Sửa dữ liệu transaction theo script route. |
| API-SEED-04 | GET | `/api/seed/check` | `routes/seedRoute.js:L125` | Inline handler `routes/seedRoute.js:L125` | Không | Check result | Kiểm tra dữ liệu seed. |
| API-SEED-05 | GET | `/api/seed/cleanup-linked-landlords` | `routes/seedRoute.js:L133` | Inline handler `routes/seedRoute.js:L133` | Không | Cleanup result | Dọn liên kết landlord theo logic route. |
| API-SEED-06 | GET | `/api/seed/check-duplicates` | `routes/seedRoute.js:L162` | Inline handler `routes/seedRoute.js:L162` | Không | Duplicate report | Kiểm tra account trùng. |

### 1.7. Route khai báo nhưng chưa hoạt động

`backend/src/routes/passwordResetRoutes.js` có `POST /request` tại `L14` → `passwordResetController.js:L13`, `POST /verify` tại `L15` → `L40`, và `POST /complete` tại `L16` → `L67`. Router này không được import hoặc `app.use` trong `backend/server.js`, nên ba route trên **không phải API live**. `webadmin/src/lib/password-reset.ts:L4-L25` đang gọi prefix `/api/auth/password-reset`; cần mount router tương ứng hoặc chuyển WebAdmin sang `authRoutes` trước khi kỳ vọng luồng này hoạt động.

**Tổng số:** 99 endpoint mount/live, 3 endpoint password-reset khai báo nhưng unmounted.

## Mục 2 — Từ điển cơ sở dữ liệu Mongoose Models

### 2.1. Quy ước chung

Tất cả schema bên dưới dùng MongoDB/Mongoose. `timestamps: true` tạo `createdAt` và `updatedAt`. ObjectId có `ref` là liên kết logic; MongoDB không tự tạo foreign key. Kết nối DB đọc `MONGODB_LOCAL_URI` ưu tiên hơn `MONGODB_URI` tại `backend/src/configs/db.js:L3-L13`; `MONGODB_DATABASE` có thể ghi đè tên database ở `L6`.

### MODEL-ACCOUNT — Tài khoản người dùng

**Tệp:** `backend/src/models/Account.js:L3-L27`. **Vai trò:** `1 = Admin/Landlord`, `2 = Tenant`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `username` (L4) | String, required, unique | Không | Tên đăng nhập. |
| `password` (L5) | String, required | Không | Hash mật khẩu, không phải password plaintext. |
| `fullName` (L6) | String, required | Không | Họ tên hiển thị. |
| `phone` (L7) | String, trim, unique, sparse | Không | SĐT tra cứu/đăng nhập. |
| `email` (L8) | String, trim, lowercase, unique, sparse | Không | Email tra cứu/đăng nhập. |
| `idCard` (L9) | String | Không | CCCD; luồng Mobile scanner tách 12 số. |
| `role` (L10) | Number, required, enum `1,2` | Không | Phân quyền chính. |
| `status` (L11) | Number, enum `0,1` | `1` | Trạng thái tài khoản. |
| `linkedLandlords` (L12) | `[ObjectId]` | `[]` | Ref `Account`; các Landlord Tenant đã liên kết. |
| `pendingLandlords` (L13) | `[ObjectId]` | `[]` | Ref `Account`; lời mời Landlord chờ Tenant xử lý. |
| `mustChangePassword` (L14) | Boolean | `false` | Bật sau Admin cấp mật khẩu tạm. |
| `passwordResetOtpHash` (L15) | String, `select:false` | Không | Hash OTP reset cũ. |
| `passwordResetExpiresAt` (L16) | Date, `select:false` | Không | Hạn OTP. |
| `passwordResetAttempts` (L17) | Number, `select:false` | `0` | Số lần thử OTP. |
| `passwordResetSentAt` (L18) | Date, `select:false` | Không | Thời điểm gửi OTP. |
| `passwordResetNonce` (L19) | String, `select:false` | Không | Nonce giữa verify và reset. |
| `passwordChangedAt` (L20) | Date | `null` | Mốc đổi password. |
| `bankId` (L21) | String | `""` | Mã ngân hàng Landlord nhận tiền. |
| `bankAccountNo` (L22) | String | `""` | Số tài khoản. |
| `bankAccountName` (L23) | String | `""` | Tên chủ tài khoản. |
| `propertyAddress` (L24) | String, trim | `""` | Địa chỉ nhà trọ. |
| `propertyLatitude` (L25) | Number | Không | Tọa độ latitude. |
| `propertyLongitude` (L26) | Number | Không | Tọa độ longitude. |

### MODEL-BILLING-POLICY — Chính sách thu phí hóa đơn

**Tệp:** `backend/src/models/BillingPolicy.js:L4-L17`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `landlordId` (L4-L10) | ObjectId, ref `Account`, required, unique, index | Không | Một policy cho mỗi Landlord. |
| `lateFeeGraceDays` (L11) | Number, min 0, max 90 | `3` | Số ngày ân hạn. |
| `lateFeeRate` (L12) | Number, min 0, max 100 | `5` | Tỷ lệ phạt. |
| `automaticReminders` (L13) | Boolean | `true` | Bật lịch nhắc tự động. |
| `remindBeforeDueDays` (L14) | `[Number]` | `[3]` | Ngày nhắc trước hạn. |
| `remindOnDueDate` (L15) | Boolean | `true` | Nhắc ngày đến hạn. |
| `remindAfterOverdueDays` (L16) | `[Number]` | `[1]` | Ngày nhắc sau quá hạn. |

### MODEL-CONTRACT — Hợp đồng thuê

**Tệp:** `backend/src/models/Contract.js:L3-L49`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `roomId` (L4) | ObjectId, ref `Room`, required | Không | Phòng được thuê. |
| `tenantId` (L5) | ObjectId, ref `Account`, required | Không | Account role 2. |
| `start`, `end` (L6-L7) | Date, required | Không | Khoảng thời gian thuê. |
| `fixedRentPrice` (L8) | Number, required | Không | Giá phòng snapshot theo hợp đồng. |
| `fixedDeposit` (L9) | Number, required | Không | Tiền cọc snapshot. |
| `electricityPrice`, `waterPrice` (L10-L11) | Number, min 0 | Không | Đơn giá meter; helper fallback 3.500/15.000 nếu thiếu. |
| `initialElec`, `initialWater` (L12-L13) | Number, min 0 | Không | Chỉ số đầu hợp đồng. |
| `tenantConfirmedAt` (L14) | Date | Không | Mốc Tenant ký. |
| `lastSentAt` (L15) | Date | Không | Mốc Admin gửi contract. |
| `unpaidAmount` (L16) | Number, min 0 | `0` | Công nợ snapshot. |
| `checkoutRequestedAt` (L17) | Date | Không | Mốc Tenant yêu cầu trả phòng. |
| `status` (L18) | Number, enum `0..5` | `0` | `0` draft/chờ ký; `1` active; `2` ended; `3` canceled; `4` Tenant signed/chờ Admin confirm; `5` checkout requested. |
| `checkoutSettlement.electricityOld/New/Price/Usage/Amount` (L19-L23) | Number | Không | Snapshot điện khi checkout. |
| `checkoutSettlement.waterOld/New/Price/Usage/Amount` (L24-L28) | Number | Không | Snapshot nước khi checkout. |
| `checkoutSettlement.utilitiesAmount` (L29) | Number | Không | Tổng điện nước. |
| `checkoutSettlement.depositAmount` (L30) | Number | Không | Cọc dùng để bù trừ. |
| `checkoutSettlement.unpaidAmount` (L31) | Number | Không | Nợ realtime tại thời điểm chốt. |
| `checkoutSettlement.damageAmount` (L32) | Number | Không | Phí hư hỏng. |
| `checkoutSettlement.totalDebt` (L33) | Number | Không | Tổng phải thu. |
| `checkoutSettlement.deductionAmount` (L34) | Number | Không | Phần cọc bị khấu trừ. |
| `checkoutSettlement.refundAmount` (L35) | Number | Không | Phần trả Tenant. |
| `checkoutSettlement.amountDue` (L36) | Number | Không | Phần Tenant còn phải nộp. |
| `checkoutSettlement.finalInvoiceId` (L38) | ObjectId, ref `Invoice` | Không | Hóa đơn quyết toán. |
| `checkoutSettlement.note` (L39) | String | Không | Ghi chú checkout. |
| `checkoutSettlement.approvedBy` (L40) | ObjectId, ref `Account` | Không | Admin duyệt. |
| `checkoutSettlement.approvedAt` (L41) | Date | Không | Mốc duyệt. |
| `services[]` (L45-L48) | Embedded array | `[]` | `serviceId` ref `Service` (L46), `fixedPrice` Number (L47): giá dịch vụ snapshot của contract. |

### MODEL-INVITE-CODE — Mã mời Landlord

**Tệp:** `backend/src/models/InviteCode.js:L3-L13`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `code` (L4-L9) | String, required, unique, regex 6 số | Không | Mã dùng khi đăng ký Landlord. |
| `isUsed` (L10) | Boolean | `false` | Trạng thái sử dụng. |
| `createdAt` (L11) | Date | `Date.now` | Thời điểm tạo mã. |
| `usedAt` (L12) | Date | Không | Thời điểm dùng. |
| `usedBy` (L13) | ObjectId, ref `Account` | Không | Landlord đã dùng mã. |

### MODEL-INVOICE — Hóa đơn

**Tệp:** `backend/src/models/Invoice.js:L3-L75`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `invoiceCode` (L4) | String, trim | Không | Mã hóa đơn; unique partial index `L67-L72`. |
| `contractId` (L5) | ObjectId, ref `Contract` | Không | Hợp đồng; optional cho dữ liệu legacy. |
| `period` (L6) | String, required | Không | Kỳ hóa đơn. |
| `dueDate` (L7) | Date | Không | Hạn thanh toán. |
| `totalAmount` (L8) | Number | Không | Tổng sau tính toán. |
| `status` (L9) | Number | `0` | `0` draft, `1` unpaid, `2` paid, `3` overdue, `4` merged settlement. |
| `remindCount` (L10) | Number | `0` | Số lần nhắc. |
| `issuedAt` (L11) | Date | Không | Mốc phát hành. |
| `graceDaysSnapshot`, `penaltyRateSnapshot` (L12-L13) | Number, min 0 | Không | Snapshot BillingPolicy. |
| `overdueAt`, `penaltyAppliedAt` (L14,L16) | Date | `penaltyAppliedAt:null` | Mốc quá hạn/phạt. |
| `penaltyBaseAmount` (L15) | Number, min 0 | Không | Cơ sở tính phạt. |
| `room`, `tenant`, `fromDate`, `toDate` (L19-L22) | String | `""` | Snapshot text cho trình bày. |
| `roomAmount` (L23) | Number | `0` | Tiền phòng. |
| `electricityOld`, `electricityNew`, `electricity` (L24-L26) | Number | `0` | Chỉ số và tiền điện. |
| `waterOld`, `waterNew`, `water` (L27-L29) | Number | `0` | Chỉ số và tiền nước. |
| `services`, `parking`, `internet`, `garbage` (L30-L33) | Number | `0` | Phí cố định/tổng dịch vụ. |
| `discount`, `penaltyDays`, `penalty`, `penaltyRate` (L34-L37) | Number | `0`, `0`, `0`, `0.1` | Điều chỉnh và phạt. |
| `paymentMethod`, `transactionCode`, `note` (L38-L40) | String | `""` | Metadata thanh toán. |
| `details[]` (L43-L54) | Embedded array | `[]` | `serviceId` ref `Service`; `serviceName,serviceCode,billingMode,unit`; old/new index, quantity, appliedPrice, amount. |
| Index (L57-L66) | Unique partial `{contractId,period}` | Không | Chỉ ràng buộc riêng kỳ `"Tiền cọc"` theo code hiện hữu. |
| Index (L75) | `{contractId,status,createdAt}` | Không | Tối ưu lọc công nợ/hợp đồng. |

### MODEL-NOTIFICATION — Inbox thông báo

**Tệp:** `backend/src/models/Notification.js:L3-L53`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `recipientId` (L4-L9) | ObjectId, ref `Account`, required, index | Không | Người nhận chính. |
| `userId` (L10) | ObjectId, ref `Account`, index | Không | Alias compatibility cho recipient. |
| `type` (L11-L28) | String enum, required | Không | Contract, invoice, repair, utility, checkout, system và loại event khác. |
| `title`, `message` (L29-L30) | String, required, trim | Không | Nội dung inbox. |
| `content`, `category` (L31-L32) | String | Không | Nội dung/nhóm bổ sung. |
| `entityType` (L33) | String enum `Contract,Invoice` | Không | Loại object mở từ notification. |
| `entityId` (L34) | ObjectId | Không | Object đích. |
| `deepLink` (L35) | String | `""` | Đường dẫn mở client. |
| `metadata` (L36) | Mixed | `{}` | Payload điều hướng. |
| `eventKey`, `deduplicationKey` (L37,L40) | String | Không | Chống event trùng. |
| `isRead` (L38) | Boolean, index | `false` | Cờ chưa đọc. |
| `readAt` (L39) | Date | `null` | Mốc đọc. |
| `delivery` (L41-L44) | Number enum `0,1` | `0` | Trạng thái gửi. |
| Index (L47-L53) | Compound/unique sparse | Không | Inbox ordering và dedup theo user/event hoặc deduplication key. |

### MODEL-PASSWORD-RESET — Token reset độc lập

**Tệp:** `backend/src/models/PasswordReset.js:L3-L19`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `accountId` (L4-L9) | ObjectId, ref `Account`, required, index | Không | Account đang reset. |
| `otpHash`, `resetTokenHash` (L10-L11) | String | `null` | Hash OTP và reset token. |
| `expiresAt` (L12) | Date, required, TTL index | Không | Mongo tự xóa sau expiry. |
| `attemptCount` (L13) | Number | `0` | Lần thử token. |
| `usedAt` (L14) | Date | `null` | Dấu đã dùng. |
| `requestedIp` (L15) | String, required | Không | Audit IP yêu cầu. |
| Index (L18-L19) | `{accountId,createdAt}`, `{requestedIp,createdAt}` | Không | Truy vấn chống lạm dụng/audit. |

### MODEL-PUSH-DEVICE — Thiết bị Expo Push

**Tệp:** `backend/src/models/PushDevice.js:L3-L19`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `nguoiThueId` (L4-L9) | ObjectId, ref `Account`, required, index | Không | Chủ thiết bị theo naming legacy. |
| `userId` (L10) | ObjectId, ref `Account`, index | Không | Alias user hiện hành. |
| `expoPushToken` (L11) | String, required, unique, trim | Không | Token Expo Push. |
| `platform` (L12) | String enum `android,ios`, required | Không | Nền tảng device. |
| `deviceId` (L13) | String, required, trim | Không | ID client device. |
| `lastActiveAt` (L14) | Date | `Date.now` | Hoạt động gần nhất. |
| `isActive`, `active` (L15-L16) | Boolean, index | `true`, `true` | Cờ active tương thích hai naming. |
| Index (L19) | Unique `{nguoiThueId,deviceId}` | Không | Một record mỗi device/user. |

### MODEL-REPAIR-REQUEST — Yêu cầu sửa chữa

**Tệp:** `backend/src/models/RepairRequest.js:L3-L12`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `tenantId` (L4) | ObjectId, ref `Account`, required | Không | Tenant gửi request. |
| `contractId` (L5) | ObjectId, ref `Contract` | Không | Contract liên quan. |
| `title`, `content` (L6-L7) | String, required | Không | Tiêu đề và mô tả. |
| `priority` (L8) | Number enum `0..3` | `0` | Mức ưu tiên. |
| `status` (L9) | Number enum `0..3` | `0` | Tiến độ xử lý. |
| `landlordNote` (L10) | String | Không | Phản hồi Admin. |
| `images` (L11) | `[String]` | `[]` | URL/encoded image đính kèm. |

### MODEL-ROOM — Phòng trọ

**Tệp:** `backend/src/models/Room.js:L3-L23`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `roomCode` (L4) | String, required, unique | Không | Mã phòng, hiện unique toàn cục. |
| `area` (L5) | String | Không | Diện tích dạng text. |
| `defaultRentPrice`, `defaultDeposit` (L6-L7) | Number, required | Không | Giá/cọc mặc định khi tạo contract. |
| `floor` (L8-L16) | Number, min 1, default 1, integer validator | `1` | Tầng. |
| `status` (L17) | Number enum `0,1,2` | `0` | `0` trống, `1` có khách, `2` trạng thái thứ ba theo UI. |
| `landlordId` (L18) | ObjectId, ref `Account`, required | Không | Chủ trọ sở hữu phòng. |
| `lastElectricityReading`, `lastWaterReading` (L19-L20) | Number | Không | Chỉ số đã chốt gần nhất. |
| `draftElectricity`, `draftWater` (L21-L22) | Number | Không | Chỉ số nháp trước lập invoice. |

### MODEL-SERVICE — Danh mục dịch vụ

**Tệp:** `backend/src/models/Service.js:L3-L22`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `name` (L4) | String, required | Không | Tên dịch vụ. |
| `code` (L5) | String, trim, uppercase | Không | Mã service. |
| `type` (L6) | Number enum `1,2`, required | Không | `1` meter, `2` fixed. |
| `billingMode` (L7) | String enum `FIXED,QUANTITY,METER` | Không | Cách tính tiền. |
| `unit` (L8) | String, required | Không | Đơn vị. |
| `defaultPrice` (L9) | Number, required | Không | Giá catalog. |
| `defaultQuantity` (L10) | Number, min 0 | `1` | Số lượng mặc định. |
| `landlordId` (L12) | ObjectId, ref `Account` | Không | Ownership; ghi chú legacy trong code. |
| `isActive` (L13) | Boolean | `true` | Không hiển thị khi archive. |
| Index (L16-L22) | Unique partial `{landlordId,code}` | Không | Không trùng code trong cùng Landlord. |

### MODEL-SERVICE-PRICE-AUDIT — Audit đổi giá service

**Tệp:** `backend/src/models/ServicePriceAudit.js:L3-L12`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `adminId` (L4) | ObjectId, ref `Account`, required | Không | Admin thực hiện. |
| `serviceId` (L5) | ObjectId, ref `Service`, required | Không | Service đổi giá. |
| `contractId` (L6) | ObjectId, ref `Contract`, required | Không | Contract chịu tác động. |
| `oldPrice`, `newPrice` (L7-L8) | Number, required, min 0 | Không | Giá trước/sau. |
| `changedAt` (L9) | Date | `Date.now` | Mốc audit. |
| Index (L12) | Compound index | Không | Tối ưu truy vấn audit. |

### MODEL-TRANSACTION — Giao dịch thanh toán

**Tệp:** `backend/src/models/Transaction.js:L3-L53`.

| Field (dòng) | Kiểu / ràng buộc | Default | Liên kết / ý nghĩa |
|---|---|---|---|
| `invoiceId` (L4-L8) | ObjectId, ref `Invoice`, required | Không | Invoice được thanh toán. |
| `amount` (L10-L13) | Number, required | Không | Số tiền. |
| `method` (L15-L18) | String | `VietQR` | Kênh thanh toán. |
| `status` (L21-L25) | Number enum `0,1,2,3` | `2` | `0` failed, `1` successful, `2` pending, `3` canceled. |
| `orderCode` (L28-L32) | String, unique sparse | Không | Mã order gateway. |
| `description` (L35-L37) | String | Không | Mô tả. |
| `qrUrl` (L40-L42) | String | Không | URL/ảnh QR. |
| `gatewayReference` (L45-L47) | String | Không | Mã tham chiếu payment gateway. |
| `paidAt` (L49-L52) | Date | `null` | Thời điểm đã thanh toán. |

## Mục 3 — Thư viện hàm dùng chung và tiện ích

### 3.1. Formatter và an toàn dữ liệu client

| Nhóm | Tệp & dòng | Hàm / thành phần | Đầu vào → đầu ra | Quy tắc dùng |
|---|---|---|---|---|
| Mobile formatter | `utils/formatters.ts:L1-L32` | `digitsOnly` | Chuỗi bất kỳ → chỉ ký tự số | Dùng trước khi định dạng số. |
| Mobile formatter | `utils/formatters.ts:L3-L5` | `unformatDigits` | `0901.234.567` → `0901234567` | Gọi trước khi gửi SĐT/CCCD vào API hoặc DB lookup. |
| Mobile formatter | `utils/formatters.ts:L7-L9` | `unformatNumber` | Chuỗi định dạng → Number | Làm sạch input số tiền/chỉ số. |
| Mobile formatter | `utils/formatters.ts:L11-L14` | `formatNumberInput` | Numeric text → chuỗi có phân cách | Dùng khi người dùng đang nhập số. |
| Mobile formatter | `utils/formatters.ts:L16-L18` | `formatCurrency` | Number → `VNĐ` | Hiển thị tiền trên App. |
| Mobile formatter | `utils/formatters.ts:L20-L25` | `formatPhone` | `0901234567` → `0901.234.567` | Hiển thị SĐT. |
| Mobile formatter | `utils/formatters.ts:L27-L32` | `formatIdCard` | 12 số → `0123.4567.8901` | Hiển thị CCCD. |
| Web formatter | `webadmin/src/lib/formatters.ts` | Các formatter tương ứng | Cùng contract input/output | Dùng chung quy tắc visual với Mobile; giữ hai bản đồng bộ khi đổi format. |
| Web storage | `webadmin/src/lib/client-storage.ts:L15-L22` | `safeJsonParse` | `string \| null \| undefined` → parsed value hoặc fallback | Bọc `JSON.parse` để storage hỏng/undefined không làm crash UI. |
| Web storage | `webadmin/src/lib/client-storage.ts:L24-L28` | `safeStorageString` | localStorage value → string/fallback | Đọc storage an toàn trước khi parse. |
| Web storage | `webadmin/src/lib/client-storage.ts:L39-L45` | `normalizeWebAdminSession` | Session legacy/current → cùng shape | Duy trì tương thích session WebAdmin. |
| Mobile language | `contexts/LanguageContext.tsx:L6-L108` | `useTranslation`, `toggleLanguage` | `vi ↔ en`, key → translated text | Language type chỉ có lowercase `vi`,`en`; lock `useRef` tại L78-L81 tránh click đua nhau. |
| Mobile HTTP | `services/apiClient.ts:L11-L103` | request client | endpoint/options → JSON hoặc lỗi chuẩn hóa | Chèn bearer token và parse HTTP response tại một boundary. |
| Web HTTP | `webadmin/src/lib/api.ts:L3-L55` | fetch wrapper | Relative `/api` + token → JSON | Gateway client của WebAdmin; không hard-code host trong các page. |
| Mobile API base | `constants/api.ts:L12-L13` | `API_BASE_URL` | env `EXPO_PUBLIC_API_BASE_URL` hoặc local URL → base | Chỉ một nơi cấu hình host Mobile; không dùng `localhost` của điện thoại. |

### 3.2. Backend utilities và service lõi

| Nhóm | Tệp & dòng | Hàm / thành phần | Trách nhiệm và điểm cần nhớ |
|---|---|---|---|
| Liên kết Tenant | `backend/src/services/tenantLinkService.js:L15-L21` | `normalizeTenantIdentifier` | Chuẩn hóa SĐT/CCCD/email trước tìm kiếm. |
| Liên kết Tenant | `backend/src/services/tenantLinkService.js:L34-L38` | lookup | Tìm Tenant tồn tại theo identifier. |
| Liên kết Tenant | `backend/src/services/tenantLinkService.js:L40-L130` | `createOrLinkTenant` | Không có Room thì chỉ liên kết danh bạ; chỉ tạo Contract trong nhánh có `room` ở `L98-L114`. Đây là điểm bảo vệ “không tạo hợp đồng nháp khi chỉ thêm danh bạ”. |
| Terms contract | `backend/src/services/contractTerms.js:L7-L10` | Defaults | Giá điện `3500`, nước `15000` khi contract không có giá hợp lệ. |
| Terms contract | `backend/src/services/contractTerms.js:L22-L42` | `resolveUtilityPriceDefaults` | Chuẩn hóa/fallback đơn giá utility. |
| Terms contract | `backend/src/services/contractTerms.js:L54-L87` | `normalizeContractMeterTerms` | Chuẩn hóa meter/terms trước create hoặc update contract. |
| Terms contract | `backend/src/services/contractTerms.js:L89-L103` | `resolveLatestMeterValue` | Thứ tự kế thừa: invoice gần nhất → Room reading → checkout trước → initial contract → `0`. |
| Terms contract | `backend/src/services/contractTerms.js:L105-L150` | `resolveContractMeterSnapshot` | Gói chỉ số và đơn giá dùng cho preview/invoice/checkout. |
| Calculator | `backend/src/services/invoiceCalculator.js:L10-L29` | number parser | Chuyển giá trị vào sang số hữu hạn an toàn. |
| Calculator | `backend/src/services/invoiceCalculator.js:L40-L72` | meter calculator | Tính usage không âm và amount theo `new - old` cùng đơn giá. |
| Calculator | `backend/src/services/invoiceCalculator.js:L75-L128` | aggregate | Cộng room, utilities, services, discount, penalty thành `totalAmount`. |
| Checkout | `backend/src/services/contractCheckoutService.js:L21-L73` | settlement calculation | Tính điện/nước, nợ, cọc, damage, refund hoặc amount due. |
| Checkout | `backend/src/services/contractCheckoutService.js:L76-L89` | live debt | Tái tính invoice chưa trả, tránh dùng debt cũ không chính xác. |
| Checkout | `backend/src/services/contractCheckoutService.js:L91-L128` | preview | Trả preview không mutate dữ liệu. |
| Checkout | `backend/src/services/contractCheckoutService.js:L130-L228` | checkout transaction | Dùng Mongo transaction để ghi final invoice/settlement, kết thúc contract và giải phóng Room đồng bộ. |
| Notification | `backend/src/services/notificationService.js:L82-L166` | `sendNotification` | Một lời gọi phát đủ ba kênh: lưu `Notification` (L107-L114), Socket event (L116-L132), Expo Push (L134-L164). |
| Socket | `backend/src/services/socketService.js:L5-L39` | `initSocket` | Xác thực JWT handshake (L15-L24), đưa socket vào room theo user (L26-L33). |
| AI | `backend/src/services/aiService.js:L13-L58` | action parser | Chỉ cho `FILL_CONTRACT_FORM` và `FILL_UTILITY_READING`, kiểm tra room/tenant/date/số trước trả client. |
| AI | `backend/src/services/aiService.js:L60-L150` | `getUserContext` | Role 1 chỉ đọc Room/Contract/Invoice thuộc Landlord; role 2 chỉ đọc contract/invoice chính Tenant. |
| AI | `backend/src/services/aiService.js:L152-L205` | Gemini client | Khởi tạo từ `GEMINI_API_KEY`; thử model candidates tại L176-L202; tenant bị đặt `action:null` tại L193-L194. |
| OCR | `backend/src/controllers/ocrController.js:L12` | meter OCR endpoint | Boundary server nhận ảnh và trả chỉ số OCR; scanner CCCD QR phía Mobile là luồng khác. |

### 3.3. Luồng dữ liệu cần hiểu trước khi sửa

#### Đăng nhập và role

`LoginScreen` hoặc Web login → `POST /api/auth/login` → `authController.js:L158` tìm identifier đã chuẩn hóa → xác thực password → ký JWT 30 ngày → client lưu token → `apiClient`/Web fetch wrapper gắn Bearer → middleware bảo vệ API và Socket handshake xác minh cùng JWT. Role `1` mở admin screens, role `2` mở tenant screens trong `app/index.tsx:L219-L307`. Không có refresh token, refresh-token store hay refresh endpoint trong mã nguồn hiện tại.

#### Thêm người thuê và hợp đồng

Admin nhập SĐT/CCCD/email → Mobile `AddTenantModal` debounce lookup → `GET /api/tenants/lookup` → nếu account có sẵn thì liên kết, nếu chưa có thì tạo Tenant. `POST /api/tenants` gọi `createOrLinkTenant`. Payload không có `roomCode` chỉ tạo/liên kết danh bạ. Khi chọn Room và terms, service mới tạo draft Contract. CCCD scanner chỉ bóc 12 số rồi đổ vào form, không tự tạo Account hay Contract.

#### Meter, invoice và giá

Contract giữ giá phòng/cọc/utility snapshot. Khi tạo/preview invoice, `resolveContractMeterSnapshot` lấy meter cũ theo thứ tự kế thừa được nêu ở bảng trên. `resolveUtilityPriceDefaults` bảo đảm `electricityPrice`/`waterPrice` có fallback 3.500/15.000. Invoice calculator dùng chỉ số mới trừ cũ, sau đó cộng service/room/discount/penalty. Bulk create lưu invoice, cập nhật meter Room và gửi notification.

#### Checkout

Admin mở preview → backend tái tính nợ realtime và utility chưa chốt → Admin submit meter mới/damage/note → Mongo transaction tạo final invoice, đánh dấu invoice cũ `status:4`, lưu `checkoutSettlement`, đưa Contract sang ended và Room về `status:0`. Nhờ transaction, một bước lỗi sẽ rollback thay vì để Room và Contract lệch nhau.

#### Thông báo và AI

Backend gọi `sendNotification` một lần; inbox tồn tại ngay cả khi Socket/Expo offline. Client Mobile lắng nghe Socket `new_notification`, Expo foreground/response và deep-link tại `app/index.tsx:L162-L200`. AI chỉ nhận text; STT/TTS thuộc client. Web `AIChatWidget` gọi AI và điều hướng/điền form khi backend trả action hợp lệ; Mobile role 1 xử lý action tại `app/index.tsx:L157-L160`.

## Mục 4 — Từ điển giao diện và bản đồ component

### 4.1. Điểm vào, điều hướng và contexts

| Tệp | Vị trí / dòng | Trách nhiệm |
|---|---|---|
| `app/index.tsx` | L7-L29, L49-L65, L140-L145, L214-L312 | Entry Mobile; khai báo union tab, điều hướng state-based và render tách role Admin/Tenant. |
| `app/index.tsx` | L157-L160 | Chỉ Admin xử lý AI action và chuyển vào Contract/Bulk Invoice. |
| `app/index.tsx` | L162-L200 | Đăng ký Push device, Socket.io, foreground/background notification và deep-link. |
| `contexts/LanguageContext.tsx` | L6-L108 | State `vi/en`, persist AsyncStorage, `useTranslation`, toggle chống click đua nhau. |
| `contexts/ThemeContext.tsx` | Toàn tệp | Theme provider cho Mobile. |
| `constants/api.ts` | L12-L13 | Một nguồn API base URL Mobile. |
| `webadmin/src/app/layout.tsx` | Toàn tệp | Root layout Next.js. |
| `webadmin/src/app/dashboard/layout.tsx` | Toàn tệp | Shell/sidebar khu Dashboard WebAdmin. |
| `webadmin/src/lib/api.ts` | L3-L55 | API gateway wrapper của WebAdmin, dùng relative `/api`. |

### 4.2. WebAdmin pages

| Đường dẫn UI | Tệp | Chức năng / API tiêu biểu |
|---|---|---|
| `/` | `webadmin/src/app/page.tsx` | Đăng nhập/đăng ký, gọi nhóm Auth. |
| `/forgot-password` | `webadmin/src/app/forgot-password/page.tsx` | Khởi tạo luồng quên mật khẩu. |
| `/request-invite` | `webadmin/src/app/request-invite/page.tsx` | Giao diện yêu cầu/thao tác invite. |
| `/dashboard` | `webadmin/src/app/dashboard/page.tsx` | Dashboard Admin; đọc `/api/landlord/stats` hoặc dashboard stats. |
| `/dashboard/rooms` | `webadmin/src/app/dashboard/rooms/page.tsx` | Danh sách, thêm/sửa/xóa Room. |
| `/dashboard/tenants` | `webadmin/src/app/dashboard/tenants/page.tsx` | Tra cứu, liên kết và quản lý Tenant. |
| `/dashboard/contracts` | `webadmin/src/app/dashboard/contracts/page.tsx` | Danh sách, ký, duyệt và checkout Contract. |
| `/dashboard/contracts/new` | `webadmin/src/app/dashboard/contracts/new/page.tsx` | Tạo Contract từ Room/Tenant/terms. |
| `/dashboard/invoices` | `webadmin/src/app/dashboard/invoices/page.tsx` | Hóa đơn đơn/lô, preview, sửa và drawer detail; modal bulk nằm inline trong file này. |
| `/dashboard/debts` | `webadmin/src/app/dashboard/debts/page.tsx` | Công nợ và nhắc nợ. |
| `/dashboard/payments` | `webadmin/src/app/dashboard/payments/page.tsx` | Theo dõi Payment/Transaction. |
| `/dashboard/utilities` | `webadmin/src/app/dashboard/utilities/page.tsx` | Chốt/đọc utilities và bulk-reading preview. |
| `/dashboard/services` | `webadmin/src/app/dashboard/services/page.tsx` | Catalog Service, preview/áp giá. |
| `/dashboard/repairs` | `webadmin/src/app/dashboard/repairs/page.tsx` | Xử lý RepairRequest. |
| `/dashboard/settings` | `webadmin/src/app/dashboard/settings/page.tsx` | Hub settings. |
| `/dashboard/settings/account` | `webadmin/src/app/dashboard/settings/account/page.tsx` | Hồ sơ account/property. |
| `/dashboard/settings/banking` | `webadmin/src/app/dashboard/settings/banking/page.tsx` | Thông tin ngân hàng/QR nhận tiền. |
| `/dashboard/settings/billing` | `webadmin/src/app/dashboard/settings/billing/page.tsx` | BillingPolicy, grace/late fee/reminder. |

### 4.3. WebAdmin shared components và modals

| Tệp | Trách nhiệm |
|---|---|
| `webadmin/src/components/AIChatWidget.tsx` | Widget TroHub AI; gọi API ở L64-L102, điều hướng action ở L89-L91, browser STT L121-L135 và TTS L137-L149. |
| `webadmin/src/components/notification-bell.tsx` | Quả chuông, unread count và inbox notification. |
| `webadmin/src/components/invoice-detail-drawer.tsx` | Drawer hiển thị Invoice detail. |
| `webadmin/src/components/payment-detail-drawer.tsx` | Drawer Payment/Transaction detail. |
| `webadmin/src/app/dashboard/invoices/page.tsx` | Chứa Batch Invoice modal inline; không có file `BatchInvoiceModal.tsx` độc lập ở source hiện tại. |

### 4.4. Mobile screens

| Screen / tệp | Role chính | Trách nhiệm |
|---|---|---|
| `screens/LoginScreen.tsx` | Cả hai | Đăng nhập, reset entry và đổi ngôn ngữ. |
| `screens/HomeScreen.tsx` | Tenant | Trang chủ Tenant, tóm tắt hợp đồng/hóa đơn. |
| `screens/InvoiceScreen.tsx` | Tenant | Danh sách/chi tiết hóa đơn và thanh toán. |
| `screens/RepairScreen.tsx` | Tenant | Tạo/theo dõi sửa chữa. |
| `screens/ContractScreen.tsx` | Tenant | Xem/ký Contract và trả phòng. |
| `screens/AccountScreen.tsx` | Tenant | Account hub, logout và settings liên quan. |
| `screens/UtilityScreen.tsx` | Tenant | Báo chỉ số utility. |
| `screens/ProfileScreen.tsx` | Tenant | Cập nhật profile. |
| `screens/NotificationsScreen.tsx` | Tenant | Inbox notification và điều hướng entity. |
| `screens/MeterScannerScreen.tsx` | Tenant | Mở camera OCR meter và đưa kết quả về Utility. |
| `screens/CCCDScannerScreen.tsx` | Tenant/Admin entry | Quét CCCD từ camera/QR. |
| `screens/AIChatScreen.tsx` | Cả hai | Hội thoại AI; Admin mới có auto-fill action. |
| `screens/ChangePasswordScreen.tsx` | Cả hai | Bắt buộc đổi mật khẩu tạm hoặc đổi password. |
| `screens/AdminDashboardScreen.tsx` | Admin | Dashboard thống kê, notification entry, quick actions. |
| `screens/AdminRoomsScreen.tsx` | Admin | Quản lý Room. |
| `screens/AdminTenantsScreen.tsx` | Admin | Quản lý/lookup Tenant và mở `AddTenantModal`. |
| `screens/AdminContractsScreen.tsx` | Admin | Tạo/gửi/duyệt/quản lý Contract. |
| `screens/AdminInvoicesScreen.tsx` | Admin | Hóa đơn đơn lẻ, detail/payment navigation. |
| `screens/BulkInvoiceScreen.tsx` | Admin | Chốt meter, preview và tạo Invoice hàng loạt. |
| `screens/AdminRepairsScreen.tsx` | Admin | Xử lý RepairRequest. |
| `screens/AdminNotificationsScreen.tsx` | Admin | Inbox notification Admin. |
| `screens/AdminSettingsScreen.tsx` | Admin | Profile/property/banking/push/logout settings. |

### 4.5. Mobile components, modals và vai trò cụ thể

| Tệp | Trách nhiệm |
|---|---|
| `components/AddTenantModal.tsx` | Modal Admin thêm/link Tenant; lookup debounce L36-L52, validation L54-L66, form L76-L86; chỉ tạo contract khi flow truyền Room. |
| `components/modals/CheckoutModal.tsx` | Modal checkout; gọi preview tại L34-L42 và submit meter/damage/note tại L44-L50. |
| `components/CCCDScannerModal.tsx` | Camera/QR CCCD; tách đúng 12 chữ số ở L58-L70 rồi trả callback cho form. |
| `components/MeterCameraModal.tsx` | Camera scanner chỉ số điện/nước, gọi OCR meter. |
| `screens/MeterScannerScreen.tsx` và `screens/CCCDScannerScreen.tsx` | Screen wrappers cho hai modal scanner. Không có tệp đúng tên `CameraScannerModal.tsx` trong source hiện tại; hai modal trên là điểm tra cứu tương ứng. |
| `components/InvoiceDetailModal.tsx` | Hiển thị chi tiết hóa đơn Mobile. |
| `components/PaymentModal.tsx` | Luồng thanh toán Invoice. |
| `components/SignContractWizard.tsx` | Wizard ký/xác nhận Contract trên Mobile. |
| `components/ChangePasswordModal.tsx` | Đổi password dạng modal. |
| `components/ForgotPasswordModal.tsx` | UI quên password/OTP. |
| `components/LanguageToggle.tsx` | Nút đổi ngôn ngữ; phải dùng `toggleLanguage` từ context. |
| `components/ThemeToggle.tsx` | Nút đổi theme. |
| `components/BottomNav.tsx` | Tab navigation Mobile theo role. |
| `components/AppLoadingScreen.tsx` | Màn chờ khi bootstrap login/profile. |
| `components/TroHubLogo.tsx` | Logo dùng lại. |
| `components/Card.tsx` | Khung card cơ bản. |
| `components/MiniCalendarPopover.tsx` | Chọn/hiển thị date nhỏ. |
| `components/calm-ops/PriorityCard.tsx` | Card ưu tiên cho giao diện vận hành. |
| `components/calm-ops/QuickAction.tsx` | Quick action Admin. |
| `components/calm-ops/ScreenHeader.tsx` | Header screen dùng lại. |
| `components/calm-ops/SectionHeader.tsx` | Header section dùng lại. |
| `components/calm-ops/StatusBadge.tsx` | Badge trạng thái. |
| `components/ui/AnimatedEntry.tsx` | Animation entry dùng lại. |
| `components/ui/AppButton.tsx` | Nút chuẩn. |
| `components/ui/GradientHero.tsx` | Hero nền gradient. |
| `components/ui/IllustratedEmptyState.tsx` | Empty state. |
| `components/ui/ProgressStepper.tsx` | Step progress cho wizard. |
| `components/notification-status-animation.tsx`, `components/notification-status-toast.tsx` | Visual phản hồi notification. |
| `components/external-link.tsx`, `components/haptic-tab.tsx`, `components/hello-wave.tsx`, `components/parallax-scroll-view.tsx`, `components/themed-text.tsx`, `components/themed-view.tsx`, `components/ui/collapsible.tsx`, `components/ui/icon-symbol.tsx` | Bộ UI/Expo support components. |

### 4.6. Quy tắc sửa UI không làm lệch hệ thống

1. Page/Screen không gọi `fetch` rải rác khi đã có `webadmin/src/lib/api.ts` hoặc `services/apiClient.ts`.
2. Số/SĐT/CCCD đi qua formatter trước khi hiển thị và unformat trước khi gửi API.
3. Text Mobile mới phải thêm cả `vi` và `en` vào `i18n/locales/vi.json` và `i18n/locales/en.json`, sau đó dùng `useTranslation()`.
4. Một hành động thay đổi dữ liệu phải refresh state/list đúng screen, không tự suy ra trạng thái Room ngoài response backend.
5. Action AI là dữ liệu không tin cậy: chỉ render/điền khi khớp allow-list backend và role Admin.

## Mục 5 — Cẩm nang hướng dẫn nâng cấp và mở rộng

### 5.1. Thêm một field mới vào Contract hoặc Room

Ví dụ A dùng `wifiPrice` trên Contract. Ví dụ B dùng `areaSqm` trên Room. Chọn một nơi là nguồn sự thật: `wifiPrice` phụ thuộc người thuê/contract thì đặt trong Contract; `areaSqm` là đặc tính vật lý phòng thì đặt trong Room. Không đặt cùng một dữ liệu ở cả hai nơi nếu không có quy tắc đồng bộ.

#### A. Thêm `wifiPrice` vào Contract

1. **Model:** thêm `wifiPrice: { type: Number, min: 0, default: 0 }` gần các giá `fixedRentPrice`/`electricityPrice` trong `backend/src/models/Contract.js:L8-L13`. Chọn `default: 0` chỉ khi miễn phí Wi‑Fi là hợp lệ; nếu bắt buộc nhập, dùng validation required và chuẩn bị migration dữ liệu cũ.
2. **Create/update boundary:** đọc, validate và lưu field trong `backend/src/controllers/contractController.js:L115` (create) và `L411` (update). Nếu field có fallback/normalization giống điện nước, đặt quy tắc tập trung trong `backend/src/services/contractTerms.js:L22-L87`, không copy logic vào nhiều controller.
3. **Invoice logic:** nếu Wi‑Fi xuất hiện như một phí riêng, thêm nó vào `backend/src/models/Invoice.js:L30-L33` hoặc đưa thành một `details[]` Service. Hướng khuyến nghị cho khoản phí định kỳ là tạo `Service` billing mode `FIXED` để dùng dòng `details[]` có sẵn, thay vì thêm cột invoice riêng.
4. **Calculator:** khi thực sự thêm field invoice riêng, đưa nó vào aggregate tại `backend/src/services/invoiceCalculator.js:L75-L128` và thêm test calculation tương ứng. Nếu dùng `Service`, calculator hiện có đã cộng `services`, không cần thêm nhánh Wi‑Fi.
5. **API typing/client:** cập nhật type Contract/request ở `services/adminService.ts:L4-L158`, các type WebAdmin liên quan và payload create/update. Không gửi số đã format; dùng `unformatNumber` khi lấy input text.
6. **WebAdmin UI:** thêm control vào `webadmin/src/app/dashboard/contracts/new/page.tsx` và editor ở `webadmin/src/app/dashboard/contracts/page.tsx`; dùng `webadmin/src/lib/formatters.ts` để hiển thị.
7. **Mobile UI:** thêm field trong `screens/AdminContractsScreen.tsx` hoặc component form tạo contract mà screen dùng; dùng `utils/formatters.ts`. Nếu text hiển thị mới, bổ sung key cho cả hai file `i18n/locales/vi.json` và `i18n/locales/en.json`.
8. **Regression check:** tạo contract mới, edit contract cũ, preview invoice, tạo invoice, logout/login; xác nhận giá đã lưu, invoice đúng và hợp đồng cũ không crash do field thiếu.

#### B. Thêm `areaSqm` vào Room

1. **Model:** Room hiện có `area` kiểu String tại `backend/src/models/Room.js:L5`. Nếu cần diện tích số để lọc/tính toán, thêm `areaSqm: { type: Number, min: 0 }` ngay sau L5; giữ `area` tạm thời để không làm hỏng dữ liệu legacy.
2. **Controller:** cho phép create/update field tại `backend/src/controllers/roomController.js:L54` và `L120`; validate finite non-negative number ở boundary.
3. **API clients:** cập nhật Room type và create/update payload trong `services/adminService.ts`, cùng type/request WebAdmin gọi `/api/rooms`.
4. **WebAdmin:** bổ sung ô số ở `webadmin/src/app/dashboard/rooms/page.tsx`, hiển thị `m²`; không thay thế value cũ `area` trước khi migration hoàn thành.
5. **Mobile:** bổ sung ô và display ở `screens/AdminRoomsScreen.tsx`; thêm i18n cả `vi`/`en`.
6. **Migration:** viết script chỉ đọc/ghi có review để parse các `area` legacy như `"20 m2"` thành `areaSqm`. Chạy trên bản backup, log record không parse được, rồi xác minh count trước/sau. Không chạy update hàng loạt trực tiếp trên production mà không backup.
7. **Check:** tạo Room có `areaSqm`, sửa Room cũ, filter/sort nếu có, rồi kiểm tra API trả cả field legacy và field mới đúng ý.

### 5.2. Thêm một Mobile screen hoàn toàn mới

Ví dụ: screen `TenantDocumentsScreen` cho Tenant xem tài liệu. Các bước không phụ thuộc Expo Router vì Mobile hiện điều hướng bằng state union trong `app/index.tsx`.

1. Tạo `screens/TenantDocumentsScreen.tsx`, nhận các props tối thiểu như `onBack` và `params` nếu screen cần điều hướng ngược.
2. Nếu server cần dữ liệu, thêm endpoint theo đầy đủ chuỗi **model → service/helper → controller → route → mount**. Chỉ thêm service khi logic tái sử dụng hoặc đủ phức tạp; không tạo file trung gian cho một `find` đơn giản.
3. Thêm hàm typed trong `services/adminService.ts` hoặc service theo tenant hiện có. Hàm gọi qua `services/apiClient.ts:L11-L103`, không tự viết fetch token mới trong screen.
4. Import screen tại `app/index.tsx:L7-L29`.
5. Thêm tab name, ví dụ `"tenant_documents"`, vào union `Tab` tại `app/index.tsx:L49-L65`.
6. Render screen bên nhánh Tenant `profile.role !== 1` tại vùng `app/index.tsx:L256-L307`; truyền callback `onBack={() => setActiveTab("home")}` hoặc dùng `handleChangeTab` khi cần params.
7. Nếu screen được mở từ bottom navigation, bổ sung item phù hợp vào `components/BottomNav.tsx`; nếu chỉ là action phụ, thêm QuickAction/link từ screen nguồn để tránh làm nav quá tải.
8. Thêm mọi text key vào cả `i18n/locales/vi.json` và `i18n/locales/en.json`, rồi gọi `const { t } = useTranslation()` từ LanguageContext thay vì hard-code tiếng Việt/Anh.
9. Đặt loading, empty, error state bằng component dùng lại (`AppLoadingScreen`, `IllustratedEmptyState`, `AppButton`) trước khi thêm component mới.
10. Kiểm thử role: Tenant mở screen, Back, reload app và mở lại từ notification/deep-link nếu có; Admin không thấy entry Tenant khi screen không thuộc Admin.

### 5.3. Đổi khóa JWT an toàn

**Tình trạng hiện tại:** token được tạo trong `backend/src/controllers/authController.js:L50-L195`; xác minh token xảy ra ở middleware bảo vệ và Socket handshake tại `backend/src/services/socketService.js:L15-L24`. Hệ thống không có refresh token, nên đổi secret sẽ làm các JWT đang đăng nhập hết hiệu lực.

1. Inventory chỗ ký/xác minh bằng `rg "JWT_SECRET|jwt\.sign|jwt\.verify" backend/src`; kiểm tra controller auth, auth middleware, Socket service và test.
2. Sinh secret mật mã đủ mạnh bằng password manager/secret manager. Không commit secret vào `.env` được theo dõi hoặc tài liệu này.
3. Đặt secret mới trong secret store/environment deployment với biến `JWT_SECRET`; giữ cấu hình giống nhau giữa HTTP API và Socket process.
4. Lên lịch bảo trì: với single-secret hiện tại, deploy key mới sẽ buộc tất cả WebAdmin/Mobile đăng nhập lại. Thông báo trước cho người dùng đang hoạt động.
5. Restart backend; xác minh `POST /api/auth/login`, `GET /api/auth/me`, endpoint Admin, endpoint Tenant và Socket `new_notification` đều chấp nhận token mới.
6. Xác minh một token ký bằng secret cũ bị từ chối. Đây là bằng chứng rotation đã hoàn tất, không phải lỗi ngẫu nhiên.
7. Khi cần grace period không logout đồng loạt, thiết kế có chủ đích `kid`/key-version và dual verification có expiry ngắn, sau đó loại bỏ old secret đúng ngày. Chỉ thực hiện khi có test revoke/version rõ ràng; không giữ hai secret vĩnh viễn.

### 5.4. Chuyển từ MongoDB local sang MongoDB Atlas

1. Tạo Atlas project/cluster, database user có quyền tối thiểu với database TroHub, và cấu hình IP access list cho IP của môi trường backend. Không dùng account owner cho application.
2. Lấy connection URI dạng `mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority`, URL-encode password có ký tự đặc biệt (`@`, `:`, `/`, `?`, `#`) trước khi chèn vào URI.
3. Tạo backup MongoDB local trước khi chuyển. Import dữ liệu bằng công cụ backup/restore phù hợp sau khi thử trên database staging. Giữ nguyên collection names và ObjectId để ref Account/Room/Contract/Invoice không gãy.
4. Đặt URI Atlas vào `MONGODB_URI` của backend. Cấu hình hiện có tại `backend/src/configs/db.js:L5` ưu tiên `MONGODB_LOCAL_URI`; phải xóa/đổi biến local nếu muốn Atlas thực sự được dùng. Có thể đặt `MONGODB_DATABASE` để ép database name ở L6.
5. Không đưa URI lên WebAdmin/Mobile. Chỉ Backend giữ database credential; client chỉ biết API base URL.
6. Deploy/restart Backend và kiểm tra log `Kết nối MongoDB thành công!` từ `backend/src/configs/db.js:L8`.
7. Smoke test theo thứ tự: login → GET rooms/contracts → tạo/sửa test Room ở staging → invoice preview → notification inbox → payment status. Kiểm tra ObjectId populated và index unique/TTL ở Atlas.
8. Khi production ổn định, giữ backup local theo chính sách lưu trữ rồi chỉ đổi DNS/API backend nếu client cần. Không xóa dữ liệu local trước khi đối chiếu count của các collection cốt lõi.

### 5.5. Lệnh vận hành hiện hành

```bash
# Backend
cd /Users/nguyen/TroHub_Local/backend
npm install
npm run dev

# Sinh mã mời Chủ trọ
cd /Users/nguyen/TroHub_Local/backend
npm run gen-code

# WebAdmin
cd /Users/nguyen/TroHub_Local/webadmin
npm install
npm run dev

# Mobile Expo
cd /Users/nguyen/TroHub_Local
npm install
npm start
# Hoặc: npm run android
# Hoặc: npm run ios
```

Backend có `start: node server.js`, `dev: nodemon server.js`, `gen-code: node scripts/generateInviteCode.js` trong `backend/package.json`. WebAdmin có `dev`, `build`, `start`, `lint`; Mobile có Expo `start`, Android, iOS, web và lint theo `package.json` tương ứng.

### 5.6. Checklist trước khi merge một nâng cấp

- [ ] Model/schema, validation và index phù hợp với dữ liệu cũ.
- [ ] Route mount được tại `backend/server.js` và có middleware role đúng.
- [ ] Controller không chấp nhận ObjectId hoặc numeric input chưa validate.
- [ ] Mobile/Web dùng API client và formatter dùng chung.
- [ ] Text Mobile có đủ `vi` và `en`.
- [ ] Empty/loading/error state không làm crash UI.
- [ ] Test manual một luồng Admin và một luồng Tenant; nếu sửa notification thì test DB inbox, Socket và Expo registration.
- [ ] Không thêm URI database, JWT secret hay API credential vào Git.

## Phụ lục — Chỉ mục file backend theo vai trò

| Vai trò | Files |
|---|---|
| Routes | `backend/src/routes/adminAccountRoutes.js`, `aiRoutes.js`, `authRoutes.js`, `billingPolicyRoutes.js`, `contractRoutes.js`, `dashboardRoutes.js`, `invoiceRoutes.js`, `meRoute.js`, `notificationRoutes.js`, `ocrRoutes.js`, `passwordResetRoutes.js`, `paymentRoute.js`, `repairRoutes.js`, `roomRoutes.js`, `seedRoute.js`, `serviceRoutes.js`, `settingsRoute.js`, `tenantRoutes.js`, `utilityRoutes.js`, `vietqrDirectRoutes.js`. |
| Controllers | `backend/src/controllers/aiController.js`, `authController.js`, `billingPolicyController.js`, `contractController.js`, `dashboardController.js`, `invoiceController.js`, `meController.js`, `notificationController.js`, `ocrController.js`, `passwordResetController.js`, `paymentController.js`, `repairController.js`, `roomController.js`, `serviceController.js`, `settingsController.js`, `tenantController.js`, `vietqrDirectController.js`. |
| Models | `backend/src/models/Account.js`, `BillingPolicy.js`, `Contract.js`, `InviteCode.js`, `Invoice.js`, `Notification.js`, `PasswordReset.js`, `PushDevice.js`, `RepairRequest.js`, `Room.js`, `Service.js`, `ServicePriceAudit.js`, `Transaction.js`. |

---

**Kết luận tra cứu:** Mọi thay đổi nghiệp vụ đi qua source of truth backend trước, sau đó cập nhật typed API client và UI. Giữ snapshot giá trong Contract/Invoice, dùng `tenantLinkService` để phân biệt danh bạ với quan hệ thuê, và dùng `notificationService` cho thông báo đa kênh.
