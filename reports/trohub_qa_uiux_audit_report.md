# BÁO CÁO KIỂM THỬ TOÀN DIỆN & UI/UX AUDIT

**Dự án:** TroHub Local  
**Repository:** `https://github.com/shenjohnsons11/TroHub_Local.git`  
**Đường dẫn local:** `/Users/nguyen/TroHub_Local`  
**Ngày kiểm thử:** 2026-07-08  
**Trọng tâm:** Thanh toán, luồng hóa đơn, logic backend, luồng người dùng Web Admin/Mobile, UI/UX dựa trên screenshot Cypress.

## 1. Tổng quan & Môi trường kiểm thử

### 1.1. Phạm vi kiểm thử

Báo cáo này tổng hợp kết quả từ các hoạt động sau:

- Kiểm tra trạng thái repository và môi trường local.
- Chạy lint/build/test scripts có sẵn.
- Khởi động backend Express và xác minh kết nối MongoDB Atlas.
- Chạy Cypress E2E cho Web Admin.
- Smoke test API liên quan đến hóa đơn, thanh toán và seed route.
- Review code backend/frontend ở các khu vực `auth`, `invoice`, `payment`, `me`, `webadmin`, `webadmin-next`.
- Phân tích screenshot Cypress để đánh giá UI/UX và xác định nguyên nhân fail trực quan.

### 1.2. Trạng thái repository tại thời điểm kiểm thử

| Hạng mục | Kết quả |
|---|---|
| Remote | `origin https://github.com/shenjohnsons11/TroHub_Local.git` |
| Branch local | `main` |
| Trạng thái sync | Local `behind origin/main 1 commit` |
| Commit local HEAD | `57d5443 fix: Thêm thông tin Khách thuê và Phòng vào Bảng tự tính hóa đơn (bảng kế bên) trên màn hình Tạo hóa đơn` |
| Remote mới nhất đã fetch | `47ab981 fix lại đường dẫn và UI người dùng` |
| Working tree | Có thay đổi chưa commit và file mới |
| Quyết định QA | Không `pull`, không reset, không ghi đè thay đổi local. Audit thực hiện trên trạng thái local hiện có. |

Các file đang thay đổi tại thời điểm kiểm thử:

- `app.json`
- `backend/server.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/invoiceController.js`
- `backend/src/controllers/tenantController.js`
- `services/adminService.ts`
- `services/userService.ts`
- `webadmin/src/api-config.js`
- `webadmin/src/app.js`
- File mới: `backend/src/controllers/dashboardController.js`
- File mới: `backend/src/routes/dashboardRoutes.js`
- File mới: `test_multi_room.js`
- Artifact mới từ QA: `webadmin/cypress/screenshots/`

### 1.3. Stack kỹ thuật nhận diện được

| Module | Stack | Ghi chú |
|---|---|---|
| Mobile app | Expo, React Native, Expo Router | Root `package.json` có `expo`, `react-native`, `typescript`, `expo lint`. |
| Backend | Node.js, Express, Mongoose, MongoDB Atlas | `backend/package.json`; server chạy port `3000` theo `.env`. |
| Web Admin legacy | Vanilla JS, CSS, Cypress | `webadmin/package.json`; chạy static server bằng `http-server`. |
| Web Admin Next | Next.js 16, React 19, Tailwind v4, shadcn | `webadmin-next/package.json`; build pass khi có network. |

### 1.4. Kết quả kiểm thử tổng hợp

| Nhóm kiểm thử | Command / Hoạt động | Kết quả | Nhận định |
|---|---|---:|---|
| Backend unit/integration | `cd backend && npm test` | Fail | Không có test thật. Script hiện tại chỉ in `Error: no test specified` rồi exit 1. |
| Root Expo lint | `npm run lint` | Pass | Expo lint chạy xong không báo lỗi. |
| Webadmin Next lint | `cd webadmin-next && npm run lint` | Fail | `51 problems`: `43 errors`, `8 warnings`. |
| Webadmin Next build | `cd webadmin-next && npm run build` | Pass có điều kiện | Pass khi được cấp network để tải Google Fonts. Trong sandbox network-restricted, build fail vì `next/font` không fetch được `Geist`. |
| Backend startup | `cd backend && npm start` | Pass có điều kiện | Pass khi được cấp network ra MongoDB Atlas. Trong sandbox network-restricted, fail `querySrv ECONNREFUSED`. |
| Cypress Web Admin | `cd webadmin && npx cypress run` | Fail | 1 pass, 5 fail. Login spec pass giả, các workflow admin fail vì login API trả 400. |
| API smoke test | `GET /api/invoices` không token | Fail bảo mật | Trả `200`, lộ dữ liệu hóa đơn. |
| API smoke test | `GET /api/payments` không token | Fail bảo mật | Trả `200`, lộ lịch sử thanh toán. |
| API smoke test | `GET /api/seed/check` không token | Warning/Critical risk | Trả `200`; nhóm seed route public. |

## 2. Chi tiết luồng kiểm thử hệ thống

### 2.1. Kết quả Cypress E2E

Nguồn test:

- `webadmin/cypress/e2e/login.cy.js`
- `webadmin/cypress/e2e/admin_workflows.cy.js`

Kết quả tổng:

| Spec | Test cases | Pass | Fail | Ghi chú |
|---|---:|---:|---:|---|
| `login.cy.js` | 1 | 1 | 0 | Pass giả vì assertion không kiểm tra dashboard/token. |
| `admin_workflows.cy.js` | 5 | 0 | 5 | Tất cả fail sau login vì menu admin không xuất hiện. |
| Tổng | 6 | 1 | 5 | Tỷ lệ fail thực tế với workflow admin: 100%. |

Chi tiết từng test case:

| Test case | Trạng thái | Log/Assertion chính | Root cause |
|---|---|---|---|
| Login bằng admin account | Pass giả | `cy.url().should('not.include', 'login')` | SPA ở URL `/`; login fail vẫn không chứa chữ `login`, nên assertion không chứng minh đăng nhập thành công. |
| Thêm phòng trọ mới | Fail | `Expected to find content: 'Phòng trọ' but never did` | Login API trả `400`, UI vẫn ở login page nên không có sidebar admin. |
| Thêm tài khoản khách thuê mới | Fail | `Expected to find content: 'Khách thuê' but never did` | Cùng root cause: login không thành công. |
| Tạo hợp đồng | Fail | `Expected to find content: 'Hợp đồng' but never did` | Cùng root cause: login không thành công. |
| Lập hóa đơn hàng loạt | Fail | `Expected to find content: 'Hóa đơn' but never did` | Cùng root cause: login không thành công. |
| Xem danh sách sửa chữa | Fail | `Expected to find content: 'Sửa chữa' but never did` | Cùng root cause: login không thành công. |

### 2.2. Phân tích root cause từ log Cypress

Trong screenshot và log Cypress, request login trả:

```text
POST http://localhost:3000/api/auth/login 400
```

Backend log cho thấy account `admin@trohub.vn` tồn tại, nhưng password `123456` không match:

```text
POST /api/auth/login 400
Mật khẩu đăng nhập không chính xác!
```

Root cause được xác định:

1. README và UI vẫn hướng dẫn tài khoản mẫu `admin@trohub.vn / 123456`.
2. Dữ liệu MongoDB hiện tại có account `admin@trohub.vn`, nhưng password hash không khớp `123456`.
3. Cypress login test chỉ kiểm tra URL, không kiểm tra token, localStorage, dashboard header, sidebar hoặc API `/auth/me`.
4. Các test workflow phụ thuộc login nên fail dây chuyền.

### 2.3. Kết quả API smoke test

Smoke test không gọi endpoint ghi dữ liệu destructive. Các endpoint được gọi:

| Endpoint | Auth token | Kết quả | Đánh giá |
|---|---|---:|---|
| `GET /api/invoices` | Không | `200` | Fail bảo mật. Endpoint public đọc toàn bộ hóa đơn. |
| `GET /api/payments` | Không | `200` | Fail bảo mật. Endpoint public đọc lịch sử thanh toán. |
| `GET /api/seed/check` | Không | `200` | Warning nghiêm trọng. Seed route public. |
| `GET /api/invoices/debts` | Không hợp lệ | `401` | Đúng hơn các endpoint khác, nhưng chưa đủ vì nhiều route cùng domain vẫn public. |
| `GET /api/invoices/bulk-preview` | Không hợp lệ | `401` | Có check đăng nhập, nhưng không đại diện cho toàn bộ invoice domain. |

Mẫu output API xác nhận dữ liệu thật đang bị trả về public:

```text
GET /api/invoices -> 200
GET /api/payments -> 200
GET /api/seed/check -> 200
```

### 2.4. Kết quả lint/build

#### Backend

`backend/package.json` có:

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

Kết luận:

- Không có unit test cho controller/service.
- Không có integration test cho auth/payment/invoice.
- Không có negative security test.
- Không có test ownership giữa landlord/tenant.

#### Webadmin Next lint

Lint fail với nhóm lỗi chính:

| Nhóm lỗi | Ví dụ | Tác động |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | Nhiều page trong `dashboard/*` | Type safety yếu ở dữ liệu tài chính/hóa đơn. |
| `react-hooks/set-state-in-effect` | `loadData()`, `loadInvoices()`, `loadRooms()` gọi trong effect | Có thể gây render cascade, warning performance. |
| Unused imports/vars | `parseFormattedString`, `FileText`, `Card` | Dấu hiệu code chưa được dọn sạch. |

#### Webadmin Next build

Build pass khi network cho phép tải Google Fonts. Tuy nhiên có warning:

```text
Next.js inferred your workspace root, but it may not be correct.
Detected multiple lockfiles:
* /Users/nguyen/TroHub_Local/webadmin-next/package-lock.json
* /Users/nguyen/TroHub_Local/package-lock.json
```

Rủi ro:

- Turbopack root inference có thể sai trong CI.
- Build behavior có thể khác giữa local/CI.
- Nên cấu hình `turbopack.root` hoặc chuẩn hóa lockfile/workspace.

## 3. Đánh giá Giao diện (Tích hợp Screenshots)

Các screenshot đã được gom vào:

- `reports/assets/01-admin-workflow-add-room-failed.png`
- `reports/assets/02-admin-workflow-add-tenant-failed.png`
- `reports/assets/03-admin-workflow-create-contract-failed.png`
- `reports/assets/04-admin-workflow-bulk-invoice-failed.png`
- `reports/assets/05-admin-workflow-repairs-failed.png`

Tất cả ảnh có độ phân giải `2560 x 1440`, chụp bởi Cypress Electron headless.

### Screenshot 1 - Workflow "Thêm phòng trọ mới" fail

![Screenshot 1 - Admin workflow add room failed](./assets/01-admin-workflow-add-room-failed.png)

**Caption:** Cypress đang chạy test `Thêm phòng trọ mới`. Bên trái là Cypress runner, step login đã gửi `POST /api/auth/login` và nhận `400`. Bên phải là UI vẫn nằm ở màn hình đăng nhập, không có sidebar admin. Test tiếp tục tìm chữ `Phòng trọ` và fail vì dashboard chưa mở.

**Alt-text chi tiết:** Ảnh hiển thị giao diện Cypress chia đôi màn hình. Panel trái nền tối ghi test `admin_workflows.cy.js`; dòng command cho thấy đã nhập password `123456`, click `button[data-login]`, request login bị đánh dấu đỏ `POST 400`. Dòng assertion đang fail là `contains Phòng trọ`. Panel phải là trang TroHub login với nền cam bên trái, form đăng nhập bên phải, nút cam `Đăng nhập`, note tài khoản mẫu `Admin: admin@trohub.vn / 123456`, `Khách: tenant@trohub.vn / 123456`.

**Đánh giá UI/UX:**

- Layout login chia 2 cột rõ ràng, brand color cam nhất quán.
- Vùng illustration tòa nhà lớn nhưng không hỗ trợ hành động chính; khi login fail, người dùng không thấy lỗi nổi bật trong screenshot.
- UI hiển thị tài khoản mẫu sai so với DB hiện tại. Đây là lỗi UX nghiêm trọng vì người dùng làm đúng hướng dẫn nhưng không đăng nhập được.
- Nên thêm error message inline ngay dưới form: `Mật khẩu đăng nhập không chính xác` và đưa focus/aria-live cho screen reader.
- Test nên assert trạng thái sau login bằng sidebar hoặc dashboard title, không dùng URL.

### Screenshot 2 - Workflow "Thêm tài khoản khách thuê mới" fail

![Screenshot 2 - Admin workflow add tenant failed](./assets/02-admin-workflow-add-tenant-failed.png)

**Caption:** Test muốn vào menu `Khách thuê`, nhưng UI vẫn ở login page sau khi API login trả `400`.

**Alt-text chi tiết:** Cypress runner bên trái ghi test `Thêm tài khoản khách thuê mới`; sau bước login, test fail tại `cy.contains('Khách thuê')`. Bên phải vẫn là form đăng nhập TroHub, không có trạng thái dashboard, không có thanh điều hướng quản trị, không có danh sách khách thuê.

**Đánh giá UI/UX:**

- Login page không cho người dùng biết vì sao đăng nhập không thành công trong vùng nhìn thấy của screenshot.
- Copy `Đăng nhập bằng tài khoản chủ trọ hoặc người thuê` đúng về ý định, nhưng không có phân biệt rõ sau login user sẽ vào portal nào.
- Vùng `Tài khoản mẫu` cần được sinh từ seed/test fixture hoặc được cập nhật theo DB test, không hardcode.
- Với flow khách thuê, failure này chặn toàn bộ CRUD tenant; không thể đánh giá UX trang tenant vì auth gate đã fail.

### Screenshot 3 - Workflow "Tạo hợp đồng" fail

![Screenshot 3 - Admin workflow create contract failed](./assets/03-admin-workflow-create-contract-failed.png)

**Caption:** Test muốn vào menu `Hợp đồng`, nhưng dashboard admin không xuất hiện vì login fail.

**Alt-text chi tiết:** Ảnh vẫn thể hiện form login ở phía phải. Cypress runner bên trái đang ở test `Tạo hợp đồng`, command fail tại `contains Hợp đồng`. Request login trước đó trả `400`, nhưng assertion login trước đó không bắt lỗi.

**Đánh giá UI/UX:**

- Hợp đồng là luồng có rủi ro tài chính/pháp lý, nhưng test hiện tại không tiến được tới màn hình hợp đồng.
- Login fail không được chặn cứng trong `beforeEach`; test tiếp tục chạy và tạo failure nhiễu ở menu.
- UI login cần có trạng thái disabled/loading khi submit, sau đó show error rõ ràng. Nếu đang có loading/error state nhưng không hiển thị trong screenshot, cần kiểm tra lại render path.

### Screenshot 4 - Workflow "Lập hóa đơn hàng loạt" fail

![Screenshot 4 - Admin workflow bulk invoice failed](./assets/04-admin-workflow-bulk-invoice-failed.png)

**Caption:** Test lập hóa đơn hàng loạt fail trước khi vào màn hình hóa đơn. Đây là flow quan trọng nhất với thanh toán, nhưng E2E hiện tại chưa chạm tới nghiệp vụ tính tiền.

**Alt-text chi tiết:** Cypress runner đang chạy test `Lập hóa đơn hàng loạt`, fail tại `contains Hóa đơn`. Bên phải vẫn là login panel với nút `Đăng nhập` và tài khoản mẫu. Không có form chỉ số điện, nước, kỳ hóa đơn, preview tổng tiền hoặc nút xuất hóa đơn.

**Đánh giá UI/UX:**

- Không có bằng chứng visual nào cho màn hình lập hóa đơn vì auth fail.
- Từ code backend, flow bulk invoice đang cho client gửi line item và backend tự tính một phần, nhưng vẫn có risk thiếu validation kỳ hóa đơn trùng, chỉ số mới nhỏ hơn cũ, discount âm, total debt, due date.
- Cần bổ sung screenshot/test cho trạng thái form hóa đơn: empty state, validation error, preview trước xuất, confirmation dialog, success state và rollback khi API fail.

### Screenshot 5 - Workflow "Xem danh sách sửa chữa" fail

![Screenshot 5 - Admin workflow repairs failed](./assets/05-admin-workflow-repairs-failed.png)

**Caption:** Test muốn vào menu `Sửa chữa`, nhưng vẫn bị kẹt ở login page do credential mẫu sai.

**Alt-text chi tiết:** Cypress runner bên trái hiển thị test `Xem danh sách sửa chữa`; fail tại `contains Sửa chữa`. UI bên phải không đổi khỏi form đăng nhập. Không có danh sách request, badge priority, trạng thái xử lý hoặc action admin.

**Đánh giá UI/UX:**

- Failure này tiếp tục xác nhận root cause chung: auth fixture không ổn định.
- Sửa chữa là flow phụ so với thanh toán, nhưng cũng cần role/ownership rõ: tenant chỉ thấy yêu cầu của mình, landlord chỉ thấy phòng của mình.
- UI login chiếm toàn bộ bề mặt, nhưng không đưa phản hồi lỗi rõ tại thời điểm test fail. Điều này làm automation khó phân biệt fail do credential, network hay UI state.

### 3.1. Tổng hợp nhận xét UI/UX từ screenshot

| Heuristic | Nhận xét | Mức độ |
|---|---|---|
| Visibility of system status | Login fail nhưng không có error message rõ trong screenshot; Cypress chỉ thấy request 400. | High |
| Match between UI and actual system state | UI/README nói credential mẫu dùng được, DB thực tế không chấp nhận. | High |
| Error prevention | Test tiếp tục workflow dù login fail; app/test không fail fast ở auth gate. | High |
| Consistency | Brand color cam nhất quán, form layout ổn, nhưng trạng thái lỗi thiếu nhất quán. | Medium |
| Accessibility | Cần thêm inline error, `aria-live`, focus state cho error, và contrast audit cho text muted. | Medium |
| Responsive | Screenshot desktop ổn về bố cục 2 cột, nhưng chưa có bằng chứng mobile/tablet. | Warning |

## 4. Tổng kết & Hành động đề xuất (Action Items)

### 4.1. Findings ưu tiên cao nhất

| Mức độ | Finding | Bằng chứng | Tác động |
|---|---|---|---|
| Critical | `/api/invoices` public read | `GET /api/invoices` không token trả `200`; [invoiceController.js](../backend/src/controllers/invoiceController.js) | Lộ hóa đơn, tenant, phòng, thông tin ngân hàng chủ trọ. |
| Critical | Invoice mutation routes thiếu auth | [invoiceRoutes.js](../backend/src/routes/invoiceRoutes.js) | Người lạ có thể tạo, cập nhật, mark-paid, nhắc nợ invoice nếu biết endpoint/id. |
| Critical | `/api/seed` chứa route xóa/nạp lại dữ liệu | [seedRoute.js](../backend/src/routes/seedRoute.js) | Rủi ro phá dữ liệu nếu deploy public. |
| High | `/api/payments` public read | [paymentController.js](../backend/src/controllers/paymentController.js) | Lộ lịch sử giao dịch và số tiền. |
| High | Tenant payment thiếu ownership check | [meController.js](../backend/src/controllers/meController.js) | Tenant có thể mark-paid invoice người khác nếu biết id. |
| High | Payment UX là self-confirm, không phải gateway verified | [PaymentModal.tsx](../components/PaymentModal.tsx) | Người dùng có thể xác nhận đã thanh toán dù chưa có giao dịch thật. |
| High | Cypress login test pass giả | [login.cy.js](../webadmin/cypress/e2e/login.cy.js) | Test suite không bắt auth regression. |

### 4.2. Action items bắt buộc trước khi tiếp tục phát triển payment

- [ ] Tạo middleware `requireAuth` dùng chung cho backend.
- [ ] Tạo middleware `requireRole([1])`, `requireRole([2])` cho landlord/tenant.
- [ ] Tạo policy `canAccessInvoice(user, invoice)` để check ownership theo contract, room, landlord, tenant.
- [ ] Gắn auth middleware vào toàn bộ route domain: rooms, tenants, contracts, invoices, payments, repairs, settings, dashboard.
- [ ] Xóa hoặc vô hiệu hóa `/api/seed/*` ở production. Seed phải chạy bằng CLI nội bộ, không phải GET route public.
- [ ] Sửa `getAllInvoices`: không token phải trả `401`, token invalid phải trả `401`, landlord chỉ thấy invoice của phòng mình, tenant chỉ thấy invoice thuộc contract của mình.
- [ ] Sửa `/api/payments`: landlord chỉ thấy transaction thuộc invoice của phòng mình; tenant chỉ thấy transaction của invoice mình.
- [ ] Sửa `/api/me/pay-invoice/:invoiceId`: verify invoice thuộc active/current contract của tenant.
- [ ] Không cho client set `totalAmount` và `status` tự do khi tạo invoice; backend phải tự tính và validate.
- [ ] Dùng MongoDB transaction/session khi đổi invoice paid và tạo Transaction.
- [ ] Thêm unique guard hoặc idempotency key để tránh double transaction.
- [ ] Xóa `console.log("LOGIN FETCHED ACCOUNT:", account)` vì đang log password hash và dữ liệu cá nhân/ngân hàng.
- [ ] Sửa seed/test credential để `admin@trohub.vn / 123456` khớp DB test hoặc cập nhật README/UI theo credential đúng.

### 4.3. Action items cho QA Automation

- [ ] Sửa `login.cy.js`: sau login phải assert dashboard/sidebar xuất hiện, token tồn tại, role đúng, không còn form login.
- [ ] Trong `beforeEach`, fail fast nếu login API trả non-2xx.
- [ ] Thêm Cypress negative test cho login sai password: phải hiển thị inline error.
- [ ] Thêm API integration test: `GET /api/invoices` không token trả `401`.
- [ ] Thêm API integration test: `GET /api/payments` không token trả `401`.
- [ ] Thêm API integration test: `PUT /api/invoices/:id/pay` không token trả `401`.
- [ ] Thêm API integration test: tenant A không thể pay invoice của tenant B.
- [ ] Thêm API integration test: landlord A không thể đọc invoice của landlord B.
- [ ] Thêm test double-click/concurrent mark-paid không tạo transaction trùng.
- [ ] Thêm test tạo invoice với `totalAmount` client giả mạo phải bị backend bỏ qua hoặc reject.
- [ ] Thêm test route seed không tồn tại hoặc trả `404/403` trong production env.

### 4.4. Action items cho UI/UX

- [ ] Login form phải hiển thị lỗi rõ ràng khi API trả `400`.
- [ ] Thêm trạng thái loading khi submit login để tránh double submit.
- [ ] Tài khoản mẫu trong UI phải lấy từ fixture/dev seed hoặc được loại bỏ khỏi production build.
- [ ] Payment modal phải đổi copy `VNPay/ZaloPay` nếu chưa có gateway thật. Không được nói “sẽ chuyển sang cổng” khi không redirect.
- [ ] QR payment cần trạng thái `Đang chờ xác nhận`, `Đã xác nhận`, `Thất bại`, `Hết hạn`.
- [ ] Manual mark-paid trên admin phải yêu cầu phương thức, mã giao dịch, ngày thu, người xác nhận, ghi chú.
- [ ] Tất cả lỗi payment/invoice cần hiển thị inline hoặc toast có action rõ, không chỉ log console.
- [ ] Thêm audit contrast cho text muted, warning box, badge status.
- [ ] Test responsive cho login, dashboard, invoice list, payment modal ở mobile/tablet.

### 4.5. Action items cho kiến trúc payment

- [ ] Tách payment thành state machine: `unpaid`, `payment_pending`, `paid`, `failed`, `overdue`, `cancelled`.
- [ ] Tạo collection `PaymentIntent` hoặc mở rộng `Transaction` với trạng thái pending và idempotency key.
- [ ] Không đổi invoice sang paid từ client trực tiếp. Chỉ đổi sau callback/webhook hoặc admin reconciliation có audit log.
- [ ] Lưu audit trail: ai xác nhận, lúc nào, từ IP/device nào, phương thức nào, mã tham chiếu nào.
- [ ] Thêm reconciliation screen cho chủ trọ: danh sách giao dịch pending cần đối soát.
- [ ] Với VietQR, cần ghi rõ đây là QR chuyển khoản thủ công, không tự xác minh nếu chưa tích hợp ngân hàng/gateway.

### 4.6. Kết luận

Hệ thống hiện chưa đạt ngưỡng an toàn cho luồng thanh toán. Vấn đề không nằm ở một bug đơn lẻ mà là thiếu lớp authorization/policy thống nhất trên backend. Các route hóa đơn và thanh toán đang public hoặc thiếu ownership check, trong khi UI lại tạo cảm giác payment đã được xác minh. Test automation hiện tại chưa bảo vệ được hệ thống vì login test pass giả và backend không có test thật.

Ưu tiên xử lý nên là:

1. Khóa toàn bộ API bằng auth middleware và ownership policy.
2. Tắt seed route public.
3. Sửa credential/test fixture để Cypress phản ánh đúng trạng thái hệ thống.
4. Viết negative security tests trước khi sửa controller.
5. Thiết kế lại payment flow theo pending/confirmed/audit trail thay vì client self-confirm.
