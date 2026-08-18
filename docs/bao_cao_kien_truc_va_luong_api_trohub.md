# Báo cáo kiến trúc và luồng API TroHub

**Phạm vi rà soát:** mã nguồn hiện tại tại `/Users/nguyen/TroHub_Local`, tập trung `backend/` Node.js/Express; đối chiếu WebAdmin Next.js và Mobile React Native/Expo.  
**Thời điểm rà soát:** 2026-08-07.  
**Cách đọc số dòng:** `L` là dòng bắt đầu khai báo route hoặc handler trong phiên bản mã nguồn đã rà soát. Các prefix API được mount tại `backend/server.js:L56-L76`.

## Tóm tắt kiến trúc

| Lớp | Thành phần | Trách nhiệm và điểm vào chính |
|---|---|---|
| Backend | Express + Mongoose | `backend/server.js:L25-L100` nạp middleware JSON 50 MB, CORS, MongoDB, HTTP server và Socket.io. Backend lắng nghe `0.0.0.0:${PORT}` tại `L98-L100`. |
| API | 20 route file, 17 controller file | Có 99 endpoint đang được mount. `passwordResetRoutes.js` có 3 route khai báo nhưng chưa được import hoặc mount trong `server.js`, nên chưa phải API hoạt động. |
| Dữ liệu | MongoDB/Mongoose | Các thực thể cốt lõi: Account, Room, Contract, Invoice, Transaction, RepairRequest, Notification, PushDevice, Service. |
| WebAdmin | Next.js | `webadmin/src/lib/api.ts:L3-L55` gọi relative `/api`, tự thêm Bearer token từ `localStorage.trohub_token`. |
| Mobile | Expo/React Native | `constants/api.ts:L12-L13` xác định base URL; `app/index.tsx:L162-L200` đăng ký Expo Push, Socket.io và deep-link thông báo. |
| Thông báo | DB + Socket.io + Expo Push | `notificationService.js:L82-L166` lưu inbox, emit `new_notification` theo room Socket và gửi Expo Push theo device token. |
| AI | Google GenAI/Gemini | `/api/ai/chat` gọi `askTroHubAI`; action AI chỉ được trả cho role 1 ở `aiService.js:L193-L194`. |

## Phần 1. Tổng quan tập lệnh API và chỉ mục dòng

### 1.1. Quy ước prefix và bảo vệ

| Prefix thực tế | Mount | Ghi chú |
|---|---|---|
| `/api/rooms` | `backend/server.js:L56` | Route phòng; hầu hết yêu cầu `requireAdmin`. |
| `/api/tenants` | `L57` | Chủ trọ quản lý người thuê; endpoint home summary không có middleware ở route. |
| `/api/contracts` | `L58` | Hợp đồng, ký, duyệt, checkout. |
| `/api/invoices` | `L59` | Hóa đơn, bulk preview, công nợ. |
| `/api/repairs` | `L60` | Yêu cầu sửa chữa. |
| `/api/notifications` | `L61` | Toàn bộ router dùng `requireAuth` tại `notificationRoutes.js:L6`. |
| `/api/auth` | `L62` | Đăng ký, đăng nhập, hồ sơ, OTP reset cũ. |
| `/api/seed` | `L63` | Các endpoint seed/bảo trì, hiện không có middleware. |
| `/api/settings` | `L64` | Router settings dùng `requireAdmin`; billing policy được mount bên dưới. |
| `/api/me` | `L65` | Portal và hành động người thuê. |
| `/api/payments` | `L66` | VietQR/VNPay và danh sách thanh toán. |
| `/api/vnpay/ipn` | `L67` | Mount trực tiếp, trùng handler IPN với `/api/payments/vnpay/ipn`. |
| `/api/services` | `L68` | Router dùng `requireAdmin` tại `serviceRoutes.js:L6`. |
| `/api/settings/billing-policy` | `L69` | Router dùng `requireAdmin` tại `billingPolicyRoutes.js:L7`. |
| `/api/utilities` | `L70` | Chỉ đọc bulk meter preview. |
| `/api/ocr` | `L71` | OCR chỉ số đồng hồ. |
| `/vqr` | `L72` | Route VietQR trực tiếp, không có tiền tố `/api`. |
| `/api/dashboard`, `/api/landlord` | `L73-L74` | Cùng map sang dashboard stats. |
| `/api/ai` | `L75` | AI chat, yêu cầu `requireAuth`. |
| `/api/admin/accounts` | `L76` | Cấp mật khẩu tạm, yêu cầu `requireAdmin`. |

### 1.2. Auth, quản trị tài khoản và AI

| STT | Phương thức | Endpoint | Tệp route & dòng | Tệp controller & dòng | Mô tả chức năng |
|---:|---|---|---|---|---|
| 1 | `POST` | `/api/auth/register` | `routes/authRoutes.js:L6` | `controllers/authController.js:L50` | Đăng ký Tenant hoặc Landlord; Landlord cần invite code và địa chỉ nhà trọ. |
| 2 | `GET` | `/api/auth/reverse-geocode` | `routes/authRoutes.js:L7` | `controllers/authController.js:L143` | Đổi tọa độ thành địa chỉ nhà trọ. |
| 3 | `POST` | `/api/auth/login` | `routes/authRoutes.js:L8` | `controllers/authController.js:L158` | Xác thực identifier/SĐT/email và mật khẩu, trả JWT 30 ngày. |
| 4 | `POST` | `/api/auth/forgot-password` | `routes/authRoutes.js:L9` | `controllers/authController.js:L321` | Gửi OTP reset mật khẩu theo luồng auth controller cũ. |
| 5 | `POST` | `/api/auth/verify-reset-otp` | `routes/authRoutes.js:L10` | `controllers/authController.js:L383` | Kiểm tra OTP và cấp reset nonce. |
| 6 | `POST` | `/api/auth/reset-password` | `routes/authRoutes.js:L11` | `controllers/authController.js:L428` | Đặt lại mật khẩu từ reset nonce. |
| 7 | `GET` | `/api/auth/me` | `routes/authRoutes.js:L12` | `controllers/authController.js:L209` | Đọc hồ sơ của bearer token. |
| 8 | `PUT` | `/api/auth/me` | `routes/authRoutes.js:L13` | `controllers/authController.js:L233` | Cập nhật hồ sơ, thông tin ngân hàng và vị trí Landlord. |
| 9 | `PUT` | `/api/auth/change-password` | `routes/authRoutes.js:L14` | `controllers/authController.js:L283` | Đổi mật khẩu sau khi so khớp mật khẩu hiện tại. |
| 10 | `POST` | `/api/admin/accounts/:accountId/temporary-password` | `routes/adminAccountRoutes.js:L12-L16` | `controllers/passwordResetController.js:L84` | Admin cấp mật khẩu tạm cho tài khoản Tenant. |
| 11 | `POST` | `/api/ai/chat` | `routes/aiRoutes.js:L6` | `controllers/aiController.js:L3` | Gửi prompt có ngữ cảnh theo role tới TroHub AI. |

### 1.3. Phòng, người thuê và hợp đồng

| STT | Phương thức | Endpoint | Tệp route & dòng | Tệp controller & dòng | Mô tả chức năng |
|---:|---|---|---|---|---|
| 12 | `GET` | `/api/rooms` | `routes/roomRoutes.js:L7` | `controllers/roomController.js:L14` | Danh sách phòng thuộc Landlord đang đăng nhập. |
| 13 | `POST` | `/api/rooms` | `routes/roomRoutes.js:L8` | `controllers/roomController.js:L54` | Tạo phòng mới cho Landlord. |
| 14 | `GET` | `/api/rooms/:id` | `routes/roomRoutes.js:L11` | `controllers/roomController.js:L105` | Xem chi tiết một phòng. |
| 15 | `PUT` | `/api/rooms/:id` | `routes/roomRoutes.js:L12` | `controllers/roomController.js:L120` | Cập nhật thông tin hoặc trạng thái phòng. |
| 16 | `DELETE` | `/api/rooms/:id` | `routes/roomRoutes.js:L13` | `controllers/roomController.js:L151` | Xóa phòng thuộc Landlord. |
| 17 | `POST` | `/api/rooms/bulk-report-utility` | `routes/roomRoutes.js:L16` | `controllers/roomController.js:L205` | Lưu chỉ số điện/nước nháp hàng loạt của các phòng. |
| 18 | `POST` | `/api/rooms/:id/report-utility` | `routes/roomRoutes.js:L19` | `controllers/roomController.js:L181` | Ghi chỉ số điện/nước nháp cho một phòng. |
| 19 | `POST` | `/api/tenants/check-duplicate` | `routes/tenantRoutes.js:L7` | `controllers/tenantController.js:L63` | Kiểm tra trùng SĐT, CCCD hoặc email. |
| 20 | `GET` | `/api/tenants/lookup` | `routes/tenantRoutes.js:L8` | `controllers/tenantController.js:L99` | Tìm nhanh Tenant bằng SĐT, CCCD 12 số hoặc email. |
| 21 | `GET` | `/api/tenants` | `routes/tenantRoutes.js:L9` | `controllers/tenantController.js:L14` | Danh sách Tenant trong phạm vi Landlord. |
| 22 | `POST` | `/api/tenants` | `routes/tenantRoutes.js:L10` | `controllers/tenantController.js:L109` → `services/tenantLinkService.js:L40` | Tạo hoặc liên kết Tenant; có thể tạo draft contract khi truyền `roomCode`. |
| 23 | `GET` | `/api/tenants/:id` | `routes/tenantRoutes.js:L11` | `controllers/tenantController.js:L138` | Lấy hồ sơ Tenant. |
| 24 | `PUT` | `/api/tenants/:id` | `routes/tenantRoutes.js:L12` | `controllers/tenantController.js:L149` | Cập nhật hồ sơ Tenant. |
| 25 | `PUT` | `/api/tenants/:id/terminate` | `routes/tenantRoutes.js:L13` | `controllers/tenantController.js:L183` | Kết thúc quan hệ Tenant theo controller hiện hữu. |
| 26 | `GET` | `/api/tenants/home-summary/:tenantId` | `routes/tenantRoutes.js:L16` | `controllers/tenantController.js:L224` | Tóm tắt trang chủ Mobile Tenant. |
| 27 | `GET` | `/api/contracts` | `routes/contractRoutes.js:L8` | `controllers/contractController.js:L43` | Danh sách hợp đồng theo Landlord hoặc Tenant bearer token. |
| 28 | `POST` | `/api/contracts` | `routes/contractRoutes.js:L9` | `controllers/contractController.js:L115` | Tạo hợp đồng dự thảo, gán meter terms và giá dịch vụ. |
| 29 | `POST` | `/api/contracts/:id/send` | `routes/contractRoutes.js:L10` | `controllers/contractController.js:L247` | Gửi hợp đồng tới Tenant. |
| 30 | `GET` | `/api/contracts/history` | `routes/contractRoutes.js:L13` | `controllers/contractController.js:L84` | Lịch sử hợp đồng đã thanh lý. |
| 31 | `GET` | `/api/contracts/:id` | `routes/contractRoutes.js:L16` | `controllers/contractController.js:L231` | Chi tiết hợp đồng, phòng, Tenant và dịch vụ. |
| 32 | `PUT` | `/api/contracts/:id` | `routes/contractRoutes.js:L19` | `controllers/contractController.js:L411` | Cập nhật hợp đồng và meter terms từng phần. |
| 33 | `PUT` | `/api/contracts/:id/sign` | `routes/contractRoutes.js:L22` | `controllers/contractController.js:L264` | Tenant ký hợp đồng, chuyển sang chờ Admin duyệt. |
| 34 | `PUT` | `/api/contracts/:id/confirm` | `routes/contractRoutes.js:L25` | `controllers/contractController.js:L294` | Admin duyệt sau tiền cọc, kích hoạt contract và phòng. |
| 35 | `GET` | `/api/contracts/:id/checkout-preview` | `routes/contractRoutes.js:L28` | `controllers/contractController.js:L347` → `services/contractCheckoutService.js:L91` | Xem nợ, cọc, chỉ số cũ và đơn giá trước checkout. |
| 36 | `PUT` | `/api/contracts/:id/checkout` | `routes/contractRoutes.js:L29` | `controllers/contractController.js:L363` → `services/contractCheckoutService.js:L130` | Quyết toán, bù trừ cọc và giải phóng phòng trong Mongo transaction. |

### 1.4. Hóa đơn, utilities, services, dashboard và billing policy

| STT | Phương thức | Endpoint | Tệp route & dòng | Tệp controller & dòng | Mô tả chức năng |
|---:|---|---|---|---|---|
| 37 | `GET` | `/api/invoices` | `routes/invoiceRoutes.js:L8` | `controllers/invoiceController.js:L410` | Danh sách hóa đơn cho Admin hoặc Tenant. |
| 38 | `GET` | `/api/invoices/bulk-preview` | `routes/invoiceRoutes.js:L11` | `controllers/invoiceController.js:L145` | Preview phòng có contract active, chỉ số và đơn giá để lập hóa đơn hàng loạt. |
| 39 | `GET` | `/api/invoices/debts` | `routes/invoiceRoutes.js:L14` | `controllers/invoiceController.js:L835` | Tổng hợp công nợ theo hợp đồng. |
| 40 | `POST` | `/api/invoices/debts/:contractId/remind` | `routes/invoiceRoutes.js:L15` | `controllers/invoiceController.js:L892` | Gửi nhắc nợ theo contract. |
| 41 | `POST` | `/api/invoices/bulk` | `routes/invoiceRoutes.js:L18` | `controllers/invoiceController.js:L252` | Tạo lô hóa đơn, cập nhật meter room và phát notification. |
| 42 | `POST` | `/api/invoices` | `routes/invoiceRoutes.js:L21` | `controllers/invoiceController.js:L464` | Tạo hóa đơn đơn lẻ. |
| 43 | `GET` | `/api/invoices/:id` | `routes/invoiceRoutes.js:L24` | `controllers/invoiceController.js:L716` | Chi tiết hóa đơn. |
| 44 | `PUT` | `/api/invoices/:id/pay` | `routes/invoiceRoutes.js:L27` | `controllers/invoiceController.js:L737` | Thanh toán hóa đơn và sinh transaction. |
| 45 | `PUT` | `/api/invoices/:id/remind` | `routes/invoiceRoutes.js:L30` | `controllers/invoiceController.js:L392` | Nhắc hóa đơn; lần nhắc thứ hai có thể chuyển quá hạn. |
| 46 | `PUT` | `/api/invoices/:id` | `routes/invoiceRoutes.js:L33` | `controllers/invoiceController.js:L778` | Cập nhật hóa đơn. |
| 47 | `GET` | `/api/utilities/readings` | `routes/utilityRoutes.js:L6` | `controllers/invoiceController.js:L145` | Alias của bulk invoice preview cho màn utilities. |
| 48 | `GET` | `/api/services` | `routes/serviceRoutes.js:L7` | `controllers/serviceController.js:L39` | Danh mục dịch vụ Landlord. |
| 49 | `POST` | `/api/services` | `routes/serviceRoutes.js:L8` | `controllers/serviceController.js:L145` | Tạo dịch vụ theo Landlord. |
| 50 | `POST` | `/api/services/:id/price-impact` | `routes/serviceRoutes.js:L9` | `controllers/serviceController.js:L107` | Preview ảnh hưởng đổi đơn giá đến contract active. |
| 51 | `PUT` | `/api/services/:id/price` | `routes/serviceRoutes.js:L10` | `controllers/serviceController.js:L124` | Áp dụng đơn giá catalog và các contract được chọn. |
| 52 | `GET` | `/api/services/:id` | `routes/serviceRoutes.js:L11` | `controllers/serviceController.js:L176` | Đọc một dịch vụ. |
| 53 | `PUT` | `/api/services/:id` | `routes/serviceRoutes.js:L12` | `controllers/serviceController.js:L196` | Cập nhật một dịch vụ. |
| 54 | `DELETE` | `/api/services/:id` | `routes/serviceRoutes.js:L13` | `controllers/serviceController.js:L238` | Xóa hoặc archive dịch vụ đang được tham chiếu. |
| 55 | `GET` | `/api/settings` | `routes/settingsRoute.js:L7` | `controllers/settingsController.js:L5` | Đọc thiết lập tài khoản Landlord. |
| 56 | `PUT` | `/api/settings` | `routes/settingsRoute.js:L8` | `controllers/settingsController.js:L29` | Cập nhật thiết lập Landlord. |
| 57 | `GET` | `/api/settings/billing-policy` | `routes/billingPolicyRoutes.js:L8` | `controllers/billingPolicyController.js:L16` | Đọc grace days, late fee và lịch nhắc. |
| 58 | `PUT` | `/api/settings/billing-policy` | `routes/billingPolicyRoutes.js:L9` | `controllers/billingPolicyController.js:L31` | Lưu chính sách hóa đơn Landlord. |
| 59 | `GET` | `/api/dashboard/stats` | `routes/dashboardRoutes.js:L5`, mount `server.js:L73` | `controllers/dashboardController.js:L8` | Thống kê dashboard theo bearer token. |
| 60 | `GET` | `/api/landlord/stats` | `routes/dashboardRoutes.js:L5`, mount `server.js:L74` | `controllers/dashboardController.js:L8` | Alias dashboard stats cho Landlord. |

### 1.5. Portal Tenant, sửa chữa và notifications

| STT | Phương thức | Endpoint | Tệp route & dòng | Tệp controller & dòng | Mô tả chức năng |
|---:|---|---|---|---|---|
| 61 | `GET` | `/api/me` | `routes/meRoute.js:L7` | `controllers/meController.js:L30` | Nạp toàn bộ portal Tenant. |
| 62 | `PUT` | `/api/me/sign-contract/:contractId` | `routes/meRoute.js:L10` | `controllers/meController.js:L191` | Tenant ký hợp đồng qua portal. |
| 63 | `PUT` | `/api/me/pay-invoice/:invoiceId` | `routes/meRoute.js:L13` | `controllers/meController.js:L220` | Tenant báo thanh toán hóa đơn. |
| 64 | `POST` | `/api/me/repairs` | `routes/meRoute.js:L16` | `controllers/meController.js:L256` | Tenant tạo repair request qua portal. |
| 65 | `DELETE` | `/api/me/repairs/:id` | `routes/meRoute.js:L19` | `controllers/meController.js:L344` | Tenant xóa repair request của mình. |
| 66 | `PUT` | `/api/me/request-terminate/:contractId` | `routes/meRoute.js:L22` | `controllers/meController.js:L308` | Tenant yêu cầu trả phòng, đưa contract vào luồng checkout. |
| 67 | `POST` | `/api/me/report-utility` | `routes/meRoute.js:L25` | `controllers/meController.js:L357` | Tenant báo chỉ số điện nước. |
| 68 | `GET` | `/api/me/invites` | `routes/meRoute.js:L28` | `controllers/meController.js:L385` | Liệt kê lời mời liên kết Tenant. |
| 69 | `PUT` | `/api/me/invites/:id/accept` | `routes/meRoute.js:L29` | `controllers/meController.js:L405` | Tenant chấp nhận lời mời. |
| 70 | `PUT` | `/api/me/invites/:id/reject` | `routes/meRoute.js:L30` | `controllers/meController.js:L431` | Tenant từ chối lời mời. |
| 71 | `GET` | `/api/repairs` | `routes/repairRoutes.js:L8` | `controllers/repairController.js:L8` | Admin lấy các repair request thuộc phạm vi mình. |
| 72 | `POST` | `/api/repairs` | `routes/repairRoutes.js:L11` | `controllers/repairController.js:L62` | Tenant tạo repair request với contract active. |
| 73 | `PUT` | `/api/repairs/:id` | `routes/repairRoutes.js:L14` | `controllers/repairController.js:L124` | Admin cập nhật trạng thái, priority, note và thông báo Tenant. |
| 74 | `DELETE` | `/api/repairs/:id` | `routes/repairRoutes.js:L17` | `controllers/repairController.js:L191` | Admin xóa repair request. |
| 75 | `POST` | `/api/notifications/devices` | `routes/notificationRoutes.js:L8` | `controllers/notificationController.js:L59` | Đăng ký Expo device token. |
| 76 | `POST` | `/api/notifications/devices/deactivate` | `routes/notificationRoutes.js:L9` | `controllers/notificationController.js:L84` | Tắt device token khi logout hoặc opt-out. |
| 77 | `DELETE` | `/api/notifications/devices/:deviceId` | `routes/notificationRoutes.js:L10` | `controllers/notificationController.js:L96` | Xóa device token theo ID. |
| 78 | `GET` | `/api/notifications/unread-count` | `routes/notificationRoutes.js:L11` | `controllers/notificationController.js:L25` | Đếm inbox chưa đọc. |
| 79 | `PATCH` | `/api/notifications/read-all` | `routes/notificationRoutes.js:L12` | `controllers/notificationController.js:L51` | Đánh dấu toàn bộ notification đã đọc. |
| 80 | `PUT` | `/api/notifications/read-all` | `routes/notificationRoutes.js:L13` | `controllers/notificationController.js:L51` | Alias PUT của mark-all-read. |
| 81 | `PATCH` | `/api/notifications/:id/read` | `routes/notificationRoutes.js:L14` | `controllers/notificationController.js:L33` | Đánh dấu một notification đã đọc. |
| 82 | `PUT` | `/api/notifications/:id/read` | `routes/notificationRoutes.js:L15` | `controllers/notificationController.js:L33` | Alias PUT của mark-read. |
| 83 | `GET` | `/api/notifications` | `routes/notificationRoutes.js:L16` | `controllers/notificationController.js:L12` | Liệt kê inbox notification của user. |

### 1.6. Thanh toán, OCR, VietQR direct và seed/bảo trì

| STT | Phương thức | Endpoint | Tệp route & dòng | Tệp controller & dòng | Mô tả chức năng |
|---:|---|---|---|---|---|
| 84 | `GET` | `/api/payments` | `routes/paymentRoute.js:L6` | `controllers/paymentController.js:L31` | Admin xem toàn bộ payment/transaction. |
| 85 | `POST` | `/api/payments/vietqr/create` | `routes/paymentRoute.js:L9` | `controllers/paymentController.js:L73` | Tạo dữ liệu thanh toán VietQR. |
| 86 | `POST` | `/api/payments/vietqr/webhook` | `routes/paymentRoute.js:L12` | `controllers/paymentController.js:L254` | Webhook giả lập xác nhận VietQR. |
| 87 | `POST` | `/api/payments/vnpay/create` | `routes/paymentRoute.js:L15` | `controllers/paymentController.js:L421` | Tạo URL thanh toán VNPay. |
| 88 | `GET` | `/api/payments/vnpay/ipn` | `routes/paymentRoute.js:L16` | `controllers/paymentController.js:L499` | Nhận IPN VNPay qua payment router. |
| 89 | `GET` | `/api/payments/:id/status` | `routes/paymentRoute.js:L19` | `controllers/paymentController.js:L200` | Kiểm tra trạng thái payment. |
| 90 | `GET` | `/api/vnpay/ipn` | `server.js:L67` | `controllers/paymentController.js:L499` | Alias IPN VNPay mount trực tiếp. |
| 91 | `POST` | `/api/ocr/meter` | `routes/ocrRoutes.js:L6` | `controllers/ocrController.js:L12` | Tesseract OCR đọc chỉ số đồng hồ từ base64 image. |
| 92 | `POST` | `/vqr/api/token_generate` | `routes/vietqrDirectRoutes.js:L5`, mount `server.js:L72` | `controllers/vietqrDirectController.js:L76` | Sinh token VietQR direct. |
| 93 | `POST` | `/vqr/bank/api/transaction-sync` | `routes/vietqrDirectRoutes.js:L7-L9`, mount `server.js:L72` | `controllers/vietqrDirectController.js:L121` | Đồng bộ giao dịch bank direct. |
| 94 | `GET` | `/api/seed` | `routes/seedRoute.js:L12` | Inline handler `routes/seedRoute.js:L12` | Xóa và nạp dữ liệu demo, không có middleware. |
| 95 | `GET` | `/api/seed/rooms` | `routes/seedRoute.js:L84` | Inline handler `routes/seedRoute.js:L84` | Nạp thêm các phòng demo trống. |
| 96 | `GET` | `/api/seed/fix-transactions` | `routes/seedRoute.js:L102` | Inline handler `routes/seedRoute.js:L102` | Bổ sung transaction thiếu cho invoice đã thanh toán. |
| 97 | `GET` | `/api/seed/check` | `routes/seedRoute.js:L125` | Inline handler `routes/seedRoute.js:L125` | Đếm dữ liệu demo. |
| 98 | `GET` | `/api/seed/cleanup-linked-landlords` | `routes/seedRoute.js:L133` | Inline handler `routes/seedRoute.js:L133` | Khử trùng linkedLandlords của Tenant. |
| 99 | `GET` | `/api/seed/check-duplicates` | `routes/seedRoute.js:L162` | Inline handler `routes/seedRoute.js:L162` | Truy vấn kiểm tra account demo. |

### 1.7. Khai báo route chưa được mount

| STT | Phương thức | Đường dẫn khai báo | Tệp route & dòng | Tệp controller & dòng | Hiện trạng chính xác |
|---:|---|---|---|---|---|
| 100 | `POST` | `/request` | `routes/passwordResetRoutes.js:L14` | `controllers/passwordResetController.js:L13` | Router không được import/mount trong `backend/server.js`; endpoint không thể gọi qua HTTP hiện tại. |
| 101 | `POST` | `/verify` | `routes/passwordResetRoutes.js:L15` | `controllers/passwordResetController.js:L40` | Router chưa mount; WebAdmin hiện gọi `/api/auth/password-reset/verify`, cũng không khớp đường dẫn khai báo. |
| 102 | `POST` | `/complete` | `routes/passwordResetRoutes.js:L16` | `controllers/passwordResetController.js:L67` | Router chưa mount; endpoint không hoạt động cho đến khi có prefix và mount. |

**Phát hiện chỉ mục:** bảng 1.2 đến 1.6 có **99 endpoint đang expose**, cộng endpoint `/api/contracts` nhóm contract gồm 10 hàng đã bao gồm đầy đủ, và bảng 1.7 ghi riêng 3 route không mount. Tổng số endpoint hoạt động thực tế là **99**, không phải 102. Các STT 100-102 là mục kiểm toán route khai báo, không phải endpoint live.

## Phần 2. Phân tích luồng dữ liệu cốt lõi

### 2.1. Đăng ký, đăng nhập và phân quyền role

1. **Đăng ký Tenant.** `POST /api/auth/register` nhận `role`, SĐT, email, CCCD và mật khẩu. Khi không phải Landlord registration, controller chuẩn hóa SĐT bằng `normalizePhone`, email bằng `normalizeEmail`, lọc CCCD chỉ còn chữ số và yêu cầu CCCD đủ 12 chữ số tại `authController.js:L57-L73`. Account mới được lưu với `role: 2` tại `L73`.
2. **Đăng ký Landlord.** Nhánh `role === 1` yêu cầu mã mời sáu số, địa chỉ property và dữ liệu định danh hợp lệ tại `authController.js:L78-L120`. Mã mời được claim nguyên tử bằng `InviteCode.findOneAndUpdate` ở `L114-L118`; trường hợp save account thất bại có rollback invite code tại `L128-L136`. Account Landlord được ghi với `role: 1` ở `L100-L112`.
3. **Đăng nhập.** `POST /api/auth/login` lấy `identifier`, sử dụng `buildLoginLookup` để ưu tiên SĐT rồi username, vẫn hỗ trợ email cũ tại `authController.js:L158-L195`. Mật khẩu được so sánh bcrypt tại `L184-L188`.
4. **JWT và role wall.** Token là JWT payload `{ id, role }`, hạn 30 ngày ở register `authController.js:L74`, `L125` và login `L190-L195`. `requireAuth` giải mã token rồi gắn `req.auth`; `requireAdmin` chỉ chấp nhận role 1; `requireTenant` chỉ chấp nhận role 2. Các route quan trọng còn gắn middleware tại chính route files, ví dụ `contractRoutes.js:L9`, `L22`, `L25`.
5. **Refresh token.** Mã nguồn hiện tại **không có refresh token, refresh-token route, refresh-token model hoặc rotation flow**. Đây là hiện trạng, không phải suy luận thiếu dữ liệu: auth controller chỉ ký access JWT 30 ngày; API index không có `/refresh`; Account không có token refresh trong luồng controller đã rà soát. Client phải đăng nhập lại sau khi token hết hạn hoặc bị vô hiệu hóa.
6. **Khóa/chuẩn hóa định danh.** Tenant linking dùng `normalizeTenantIdentifier` tại `tenantLinkService.js:L15-L21`: email hợp lệ, SĐT đúng 10 số hoặc CCCD đúng 12 số. `createOrLinkTenant` tiếp tục lọc ký tự không phải số và kiểm tra tính duy nhất SĐT/CCCD/email tại `L48-L77`.

### 2.2. Thêm Tenant và liên kết hợp đồng

1. **Tra cứu thời gian thực.** WebAdmin gọi `/api/tenants/lookup`; Mobile `AddTenantModal` đợi 450 ms sau khi identifier hợp lệ rồi gọi `adminService.lookupTenant` tại `components/AddTenantModal.tsx:L36-L52`. Identifier có thể là SĐT 10 số, CCCD 12 số hoặc email.
2. **Camera CCCD.** `CCCDScannerModal` dùng `expo-camera`, chỉ nhận QR trong vùng viewfinder, lấy phần đầu QR, lọc ký tự không phải số và cắt 12 ký tự tại `components/CCCDScannerModal.tsx:L58-L70`. Đây là quét QR CCCD, không phải OCR ảnh văn bản CCCD. OCR Tesseract của backend hiện chỉ phục vụ meter qua `/api/ocr/meter`.
3. **Tạo hoặc nối account.** `tenantController.createTenant` tại `backend/src/controllers/tenantController.js:L109` gọi `createOrLinkTenant` tại `tenantLinkService.js:L40`. Service tìm room theo `{ roomCode, landlordId }`, bắt buộc `room.status === 0` và chặn room đã có contract status `[0,1,4,5]` tại `L56-L63`. Sau đó nó tìm tất cả identifier, khử trùng theo account ID và chặn trường hợp các identifier thuộc nhiều người khác nhau tại `L65-L69`.
4. **Thêm danh bạ không tạo hợp đồng.** Nếu payload không có `roomCode`, biến `room` giữ `null`; block tạo contract chỉ chạy trong `if (room)` tại `tenantLinkService.js:L98-L114`. Vì vậy thêm danh bạ thuần túy chỉ tạo hoặc liên kết Account và notification, không tạo draft contract.
5. **Có chọn phòng thì tạo draft.** Khi truyền `roomCode` hợp lệ, service tạo contract status `0`, với room ID, tenant ID, giá thuê/cọc default của room, tại `L99-L114`. Đây là luồng liên kết phòng có chủ đích, không phải side effect của lookup.
6. **Thông báo kết quả.** Service gửi notification cùng event key chống trùng tại `L116-L128`; nội dung khác nhau giữa thêm danh bạ và gán phòng.

### 2.3. Chốt điện nước và kế thừa chỉ số đồng hồ

1. **Nguồn chỉ số cũ.** `resolveLatestMeterValue` tại `contractTerms.js:L89-L103` dùng thứ tự ưu tiên: `previousInvoice.electricityNew/waterNew` → `room.lastElectricityReading/lastWaterReading` → `previousContract.checkoutSettlement` → `contract.initialElectricity/initialWater` → `0`.
2. **Gắn initial meter khi tạo contract.** `contractController.createContract` lấy room, contract trước và invoice mới nhất, rồi gọi `resolveInitialContractMeterTerms` trước normalize meter terms tại `contractController.js:L115-L174`; helper nằm ở `contractTerms.js:L152-L172`. Nhờ vậy khách mới thừa hưởng meter đã chốt của khách trước.
3. **Nhập nháp meter.** Admin có thể gửi một phòng qua `/api/rooms/:id/report-utility` hoặc hàng loạt qua `/api/rooms/bulk-report-utility`; các handler ở `roomController.js:L181` và `L205` ghi draft readings của Room.
4. **Preview hóa đơn.** `/api/invoices/bulk-preview` đọc Room của Landlord, contract `status: 1`, invoice trước và room meter snapshot tại `invoiceController.js:L145-L239`. Preview trả `electricityOld`, `waterOld`, `electricityDraft`, `waterDraft` và giá.
5. **Ràng buộc công thức.** `invoiceCalculator.calculateMeterCharge` tại `invoiceCalculator.js:L40-L72` bắt chỉ số hữu hạn không âm, cấm `newIndex < oldIndex` ở `L57-L63`, tính `usage = new - old` và `amount = round(usage × unitPrice)`.
6. **Chốt thành công.** `createBulkInvoices` dùng `calculateInvoiceAmounts`, insert hóa đơn rồi bulk update Room: `lastElectricityReading`, `lastWaterReading`, đồng thời unset `draftElectricity`, `draftWater`, tại `invoiceController.js:L252-L390`.

### 2.4. Lập hóa đơn và tự nạp đơn giá

1. **Giá từ hợp đồng.** `resolveContractMeterSnapshot` bắt đầu từ `contract.electricityPrice` và `contract.waterPrice` tại `contractTerms.js:L105-L107`. Nếu thiếu, nó đọc service meter snapshot trong contract tại `L109-L126`.
2. **Fallback catalog Landlord.** `invoiceController.getBulkPreview` tải các Service active meter của Landlord, sắp xếp `updatedAt` mới nhất, rồi tính fallback bằng `resolveUtilityPriceDefaults` tại `invoiceController.js:L155-L163`. Helper nhận diện service Electricity/Water và dùng default price dương; fallback cuối cùng là 3.500đ/kWh và 15.000đ/m³ tại `contractTerms.js:L7-L42`, `L128-L130`.
3. **Giá được snapshot trước khi phát hành.** Preview trả `roomAmount = contract.fixedRentPrice`, electricity/water old-new-price, services, parking, internet và garbage tại `invoiceController.js:L183-L239`. WebAdmin map các giá vào modal và cho phép chỉnh tại `webadmin/src/app/dashboard/invoices/page.tsx:L76-L85`, `L397-L412`.
4. **Tính tổng.** `calculateInvoiceAmounts` ghép tiền phòng, điện, nước, dịch vụ, bãi xe, internet, rác, phạt và giảm giá tại `invoiceCalculator.js:L75-L128`. Mỗi meter component có `unitPrice`, `usage` và `amount` trong kết quả.
5. **Bảo toàn đầu vào.** Hóa đơn bulk được validate toàn bộ trước insert bằng `preparedInvoices` ở `invoiceController.js:L252-L260`; khi hợp lệ, Room meter được cập nhật chỉ sau insert.

### 2.5. Trả phòng và quyết toán cọc

1. **Yêu cầu trả phòng.** Tenant gọi `/api/me/request-terminate/:contractId`; `meController.requestTerminateContract` bắt đầu ở `meController.js:L308` và chuyển contract vào trạng thái chờ checkout `status: 5` theo luồng controller.
2. **Preview theo nợ hiện thời.** `getCheckoutPreview` chỉ chấp nhận contract `status === 5`, kiểm tra room thuộc Admin, đọc invoice gần nhất và tính `getOutstandingDebt` thời gian thực tại `contractCheckoutService.js:L91-L127`. Nợ chỉ lấy invoice status `[1,3]` và loại `Tiền cọc`, `final_invoice` tại `L76-L89`.
3. **Công thức settlement.** `calculateCheckoutSettlement` tính điện, nước cuối kỳ bằng meter snapshot; `totalDebt = unpaidAmount + utilitiesAmount + damageAmount`; `refundAmount = max(0, deposit - totalDebt)`; `amountDue = max(0, totalDebt - deposit)` tại `contractCheckoutService.js:L21-L73`.
4. **Transaction nguyên tử.** `checkoutContract` mở Mongoose session và `withTransaction` tại `L130-L176`. Nó kiểm tra contract/status/ownership một lần nữa trước khi thay đổi dữ liệu.
5. **Đóng công nợ cũ và invoice cuối.** Các invoice nợ cũ được chuyển sang `status: 4` tại `L178-L184`. Nếu còn thiếu sau cấn trừ cọc, service tạo `final_invoice` status `1` tại `L186-L199`.
6. **Giải phóng phòng.** Trong cùng transaction: contract thành `status: 2`, lưu `checkoutSettlement`; Room thành `status: 0`, nhận `lastElectricityReading`/`lastWaterReading` cuối và xóa draft meter tại `L201-L214`.

## Phần 3. Hạ tầng thông báo và AI Co-Pilot

### 3.1. Thông báo ba lớp

1. **Lớp DB inbox.** `sendNotification` tạo document Notification tại `backend/src/services/notificationService.js:L82-L114`. Payload chứa `userId`, `recipientId`, title, content/message, category, deep link, metadata và `eventKey`. Khi trùng `eventKey`, unique error `11000` trả document cũ tại `L107-L112`, giúp chống gửi lặp.
2. **Lớp realtime Socket.io.** `socketService.initSocket` dựng Socket.io server, kiểm JWT từ `socket.handshake.auth.token`, gắn `socket.data.userId` và join room `user_<id>` tại `socketService.js:L5-L39`. Notification service emit event `new_notification` vào room đó tại `notificationService.js:L116-L132`.
3. **Lớp Expo Push.** Service đọc PushDevice active, xác thực Expo token, gọi `https://exp.host/--/api/v2/push/send` với category/deepLink/notificationId/metadata tại `notificationService.js:L134-L164`. Token trả `DeviceNotRegistered` bị deactivate ở `L153-L161`; lỗi push không làm mất DB inbox theo chú thích `L162-L164`.
4. **Mobile nhận notification.** Khi đã login, Mobile đăng ký token tại `app/index.tsx:L177-L186`, kết nối Socket bằng JWT ở `L187-L188`, refresh khi nhận `new_notification`, mở đúng tab qua deep-link và mark read khi bấm push tại `L168-L194`.
5. **API inbox.** Device registration/read/unread/list nằm trọn trong bảng API dòng 75-83. `notificationController.js:L12-L105` áp filter quyền theo user hiện tại.

### 3.2. TroHub AI Co-Pilot

1. **Entry point và auth.** `POST /api/ai/chat` dùng `requireAuth` ở `aiRoutes.js:L6`. Controller lấy `req.auth.id`, `req.auth.role` và gọi service tại `aiController.js:L3-L31`.
2. **Gemini.** `aiService.js:L1-L8` chỉ khởi tạo `GoogleGenAI` nếu `GEMINI_API_KEY` tồn tại. Service thử lần lượt `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-flash-latest` tại `L176-L202`.
3. **Bức tường dữ liệu role.** Với role 1, `getUserContext` chỉ đọc Room có `landlordId: userId`, hợp đồng của các room này và invoice của các contract đó tại `aiService.js:L60-L120`. Với role 2, chỉ đọc contract active `tenantId: userId` và invoice của chúng tại `L121-L145`.
4. **Auto-fill được allow-list.** Parser chỉ chấp nhận hai action schema: `FILL_CONTRACT_FORM` và `FILL_UTILITY_READING`, với kiểm tra room code, tenant, số không âm và date format tại `aiService.js:L13-L58`. Dù model trả action, Tenant luôn nhận `action: null` tại `L193-L194`.
5. **Thực thi ở client.** Mobile chỉ xử lý AI action khi `profile.role === 1`, điều hướng sang contract hoặc bulk invoice tại `app/index.tsx:L157-L160`. Contract và BulkInvoice screens kiểm tra type action trước khi điền form.
6. **Giọng nói.** Mobile phụ thuộc `expo-speech` và `expo-speech-recognition` được khai báo ở `package.json:L35-L36`. Backend AI route chỉ nhận `message` text; STT/TTS là concern client, không có API voice riêng trong backend route index.

## Phần 4. Hướng dẫn vận hành

### 4.1. Biến môi trường cốt lõi

| Biến | Dùng tại | Mục đích |
|---|---|---|
| `MONGODB_URI` | cấu hình DB | Chuỗi kết nối MongoDB. |
| `PORT` | `backend/server.js:L98` | Port backend, mặc định `5000`. |
| `JWT_SECRET` | auth/socket services | Ký và verify JWT. |
| `GEMINI_API_KEY` | `aiService.js:L7-L8` | Kích hoạt Gemini AI. |
| SMTP variables | email/password reset services | Gửi OTP và email reset. |
| `EXPO_PUBLIC_API_BASE_URL` | `constants/api.ts:L12-L13` | Override base URL Mobile. |

### 4.2. Lệnh chạy

```bash
# Backend
cd /Users/nguyen/TroHub_Local/backend
npm install
npm run dev

# Backend production-style
cd /Users/nguyen/TroHub_Local/backend
npm start

# Sinh mã mời đăng ký Chủ trọ
cd /Users/nguyen/TroHub_Local/backend
npm run gen-code

# WebAdmin development
cd /Users/nguyen/TroHub_Local/webadmin
npm install
npm run dev

# WebAdmin build/production
cd /Users/nguyen/TroHub_Local/webadmin
npm run build
npm start

# Mobile Expo
cd /Users/nguyen/TroHub_Local
npm install
npx expo start

# Mobile platform targets
cd /Users/nguyen/TroHub_Local
npm run android
npm run ios
npm run web
```

### 4.3. Kiểm tra vận hành trước khi demo

1. Đảm bảo MongoDB và backend đang chạy, backend bind `0.0.0.0` theo `server.js:L98-L100`.
2. Đảm bảo WebAdmin proxy hoặc deployment route `/api/*` đến backend; client WebAdmin luôn gọi relative `/api` tại `webadmin/src/lib/api.ts:L3-L25`.
3. Mobile chạy trên thiết bị thật phải dùng IP LAN hoặc `EXPO_PUBLIC_API_BASE_URL`, không dùng `localhost` của điện thoại.
4. Muốn có AI phải cấu hình `GEMINI_API_KEY`; không có key, `/api/ai/chat` trả lỗi dịch vụ chưa cấu hình từ `aiService.js:L179-L181`.
5. Muốn nhận push phải có Expo project ID trên config app, quyền notification và device token đăng ký thành công theo `services/pushNotificationService.ts:L25-L33`.

## Phát hiện kiến trúc cần theo dõi

| Mức | Phát hiện | Bằng chứng chính xác | Tác động |
|---|---|---|---|
| Cao | Seed endpoints công khai và có thao tác xóa dữ liệu | `/api/seed` tại `seedRoute.js:L12-L82` gọi `deleteMany` nhiều collection; mount `server.js:L63` không gắn middleware. | Môi trường có thể mất dữ liệu nếu endpoint bị truy cập. Cần giới hạn development/admin trước khi public. |
| Cao | Password reset router mới không được mount | `passwordResetRoutes.js:L14-L16`; không có import/mount trong `server.js:L1-L90`; WebAdmin gọi `/auth/password-reset/*` ở `webadmin/src/lib/password-reset.ts:L4-L25`. | Luồng WebAdmin password reset mới không có endpoint backend tương ứng. |
| Trung bình | Không có refresh token | Auth chỉ ký JWT 30 ngày tại `authController.js:L74`, `L125`, `L190-L195`; API index không có refresh route. | Khi token hết hạn, client phải đăng nhập lại; không có rotation/revocation riêng. |
| Trung bình | IPN VNPay có hai public paths | `/api/payments/vnpay/ipn` ở `paymentRoute.js:L16`; `/api/vnpay/ipn` ở `server.js:L67`. | Tăng bề mặt vận hành và cần đảm bảo provider chỉ dùng một canonical callback URL. |
| Trung bình | Một số route không gắn middleware tại router | Ví dụ `meRoute.js:L7`, `L13`, `L16`, `L19`, `L25`; controller phải tự thực thi auth/ownership phù hợp. | Cần review định kỳ vì bảo vệ không nhất quán ở route boundary. |
| Thông tin | Luồng CCCD là QR scan, không phải OCR CCCD image | `CCCDScannerModal.tsx:L58-L70`; OCR backend chỉ là meter `ocrController.js:L12-L27`. | Đúng với CCCD QR, nhưng yêu cầu OCR ảnh CCCD tự do cần dịch vụ khác. |

## Phạm vi version

Báo cáo phản ánh `main` hiện tại. Nhánh `feature/property-membership-dashboard` cho luồng nhiều nhà trọ/người thuê nhiều nhà trọ được giữ riêng theo quyết định vận hành trước đó và không nằm trong code `main` đã lập chỉ mục ở tài liệu này.
