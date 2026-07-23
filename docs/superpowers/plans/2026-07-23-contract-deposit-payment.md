# Contract Deposit Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau khi Người thuê ký hợp đồng, tạo đúng một hóa đơn cọc, mở PaymentModal VietQR/VNPay và duy trì CTA thanh toán cho đến khi Backend xác nhận đã thanh toán.

**Architecture:** Tách nghiệp vụ ký và phát hành hóa đơn cọc vào service Backend duy nhất, được hai endpoint tương thích gọi chung. API hợp đồng trả `depositPayment` để Expo khôi phục trạng thái sau khi mở lại; Expo dùng PaymentModal và invoice service hiện có thay vì xây luồng thanh toán mới.

**Tech Stack:** Node.js, Express, Mongoose, node:test, TypeScript, React Native Expo, PaymentModal, VNPay, VietQR.

---

## Cấu trúc file

- Create `backend/src/services/contractSigningService.js`: xác thực quyền, ký idempotent và tìm/tạo hóa đơn cọc.
- Create `backend/test_contract_deposit_payment.js`: unit/contract test cho service, endpoint và điều kiện duyệt.
- Modify `backend/src/controllers/contractController.js`: ủy quyền ký cho service, bỏ implementation trùng.
- Modify `backend/src/controllers/meController.js`: ủy quyền endpoint tương thích cho cùng service.
- Modify `backend/src/routes/contractRoutes.js`: thêm middleware xác thực Người thuê cho route ký.
- Modify `backend/src/models/Invoice.js`: unique partial index bảo vệ hóa đơn cọc.
- Modify `backend/src/controllers/contractController.js` và mapper hợp đồng: trả `depositPayment`.
- Modify `services/contractService.ts`: nhận metadata thanh toán cọc.
- Modify `types/Contract.ts`: khai báo `depositPayment`.
- Modify `screens/ContractScreen.tsx`: thẻ cọc bền vững và điều phối PaymentModal.
- Modify `screens/InvoiceScreen.tsx` hoặc `services/invoiceService.ts`: cung cấp hàm tải đúng hóa đơn theo ID.
- Modify `test_app_flows.js` hoặc contract test source phù hợp: kiểm tra tích hợp Expo.

### Task 1: Service ký hợp đồng và hóa đơn cọc idempotent

**Files:**
- Create: `backend/test_contract_deposit_payment.js`
- Create: `backend/src/services/contractSigningService.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Viết test RED**

Test service bằng dependency injection:

```js
const result = await signContractAndEnsureDeposit({
  contractId,
  nguoiThueId,
  ContractModel,
  InvoiceModel,
});

assert.equal(result.invoiceId, depositInvoiceId);
assert.equal(result.depositRequired, true);
assert.equal(contract.status, 4);
assert.equal(InvoiceModel.created.length, 1);
```

Các test riêng phải bao phủ:

- JWT Người thuê không sở hữu hợp đồng → mã `CONTRACT_FORBIDDEN`.
- Cọc lớn hơn 0 → tạo hóa đơn status Chưa thanh toán.
- Gọi lại → trả hóa đơn hiện hữu, không tạo bản thứ hai.
- Cọc bằng 0 → không tạo hóa đơn, `invoiceId: null`.
- Tạo hóa đơn lỗi → không lưu trạng thái hợp đồng thành Chờ duyệt.

- [ ] **Step 2: Chạy RED**

Run: `node --test backend/test_contract_deposit_payment.js`  
Expected: FAIL vì service chưa tồn tại.

- [ ] **Step 3: Viết implementation tối thiểu**

Export:

```js
async function signContractAndEnsureDeposit({
  contractId,
  nguoiThueId,
  ContractModel = Contract,
  InvoiceModel = Invoice,
  RoomModel = Room,
}) {}
```

Trình tự an toàn:

1. tải hợp đồng;
2. kiểm tra `tenantId`;
3. tìm hóa đơn cọc hiện hữu;
4. nếu hợp đồng đã status 4 và hóa đơn hợp lệ, trả kết quả idempotent;
5. nếu cọc lớn hơn 0 và chưa có hóa đơn, tạo hóa đơn trước;
6. chỉ sau khi tạo thành công mới lưu status 4;
7. nếu lưu hợp đồng thất bại sau khi vừa tạo hóa đơn, xóa đúng hóa đơn vừa tạo để rollback;
8. không thay đổi hóa đơn hiện hữu.

- [ ] **Step 4: Chạy GREEN**

Run: `node --test backend/test_contract_deposit_payment.js`  
Expected: toàn bộ test service PASS.

- [ ] **Step 5: Gắn test vào backend suite**

Thêm `test_contract_deposit_payment.js` vào script `backend/package.json#test`, chạy `npm test` trong backend.

### Task 2: Hai endpoint dùng chung service và bảo vệ dữ liệu

**Files:**
- Modify: `backend/src/controllers/contractController.js`
- Modify: `backend/src/controllers/meController.js`
- Modify: `backend/src/routes/contractRoutes.js`
- Modify: `backend/src/models/Invoice.js`
- Modify: `backend/test_contract_deposit_payment.js`

- [ ] **Step 1: Viết route/controller test RED**

Đọc source và khẳng định:

```js
assert.match(contractControllerSource, /signContractAndEnsureDeposit/);
assert.match(meControllerSource, /signContractAndEnsureDeposit/);
assert.match(contractRoutesSource, /requireTenant/);
assert.match(invoiceModelSource, /partialFilterExpression/);
```

Test controller phải khẳng định ID Người thuê lấy từ `req.auth.id`, không lấy từ body.

- [ ] **Step 2: Chạy RED**

Run: `node --test backend/test_contract_deposit_payment.js`  
Expected: FAIL vì controller chưa dùng chung service và route chưa có guard.

- [ ] **Step 3: Thêm middleware Người thuê**

Tạo hoặc mở rộng middleware JWT hiện có để trả:

```js
req.auth = { id: decoded.id, role: decoded.role };
```

Chỉ role 2 được qua route ký. Hai controller gọi:

```js
const result = await signContractAndEnsureDeposit({
  contractId: req.params.id || req.params.contractId,
  nguoiThueId: req.auth.id,
});
```

Response thống nhất gồm `invoiceId`, `depositRequired`, `depositAmount`, `idempotent`.

- [ ] **Step 4: Thêm unique partial index**

Trong Invoice schema:

```js
invoiceSchema.index(
  { contractId: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: {
      period: "Tiền cọc",
      contractId: { $type: "objectId" },
    },
  },
);
```

Service bắt lỗi code `11000`, sau đó tải và trả hóa đơn cọc hiện hữu.

- [ ] **Step 5: Chạy GREEN và hồi quy**

Run: `npm test` trong `backend`  
Expected: test mới và 28 test hiện tại đều PASS.

### Task 3: API trả trạng thái cọc và bảo vệ Admin duyệt

**Files:**
- Modify: `backend/src/controllers/contractController.js`
- Modify: `backend/src/controllers/meController.js`
- Modify: `backend/test_contract_deposit_payment.js`

- [ ] **Step 1: Viết test RED cho mapper**

Kiểm tra:

```js
assert.deepEqual(await buildDepositPayment(contractWithUnpaidInvoice), {
  required: true,
  invoiceId: unpaidInvoiceId,
  amount: 3500000,
  status: "unpaid",
});
```

Thêm case paid và cọc bằng 0.

- [ ] **Step 2: Chạy RED**

Run: `node --test backend/test_contract_deposit_payment.js`  
Expected: FAIL vì mapper chưa tồn tại.

- [ ] **Step 3: Tạo helper trạng thái cọc**

Service export `buildDepositPayment(contract, InvoiceModel)` và controller thêm trường này vào từng hợp đồng trả cho Người thuê. Không thay đổi dữ liệu hợp đồng Admin không cần dùng.

- [ ] **Step 4: Sửa điều kiện duyệt**

Nếu `fixedDeposit > 0`:

- thiếu hóa đơn cọc → chặn;
- hóa đơn status khác 2 → chặn;
- status 2 → cho duyệt.

Nếu `fixedDeposit === 0`, cho duyệt không cần hóa đơn.

- [ ] **Step 5: Chạy GREEN**

Run: `npm test` trong backend.  
Expected: tất cả PASS.

### Task 4: Expo mở và khôi phục PaymentModal

**Files:**
- Modify: `types/Contract.ts`
- Modify: `services/contractService.ts`
- Modify: `services/invoiceService.ts`
- Modify: `screens/ContractScreen.tsx`
- Modify: `test_unified_webadmin_contracts.js` hoặc create `test_contract_deposit_ui.js`
- Modify: `package.json`

- [ ] **Step 1: Viết UI contract test RED**

Kiểm tra source có:

```js
assert.match(contractScreen, /depositPayment/);
assert.match(contractScreen, /Tiền cọc chưa thanh toán/);
assert.match(contractScreen, /Thanh toán ngay/);
assert.match(contractScreen, /PaymentModal/);
assert.match(contractService, /invoiceId/);
assert.match(invoiceService, /getInvoiceById/);
```

- [ ] **Step 2: Chạy RED**

Run: `node --test test_contract_deposit_ui.js`  
Expected: FAIL vì màn hình chưa có CTA và PaymentModal.

- [ ] **Step 3: Mở rộng type và mapper**

`Contract` có:

```ts
depositPayment?: {
  required: boolean;
  invoiceId: string | null;
  amount: number;
  status: "not_required" | "unpaid" | "paid";
};
```

`contractService.signContract` giữ toàn bộ metadata response.

- [ ] **Step 4: Tải đúng hóa đơn**

`invoiceService.getInvoiceById(invoiceId)` gọi `/invoices/:id`, map bằng mapper hiện có và trả `Invoice`. Không lọc theo Phòng.

- [ ] **Step 5: Tích hợp ContractScreen**

Thêm state:

```ts
const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
const [loadingDepositInvoiceId, setLoadingDepositInvoiceId] = useState<string | null>(null);
```

Sau ký, nếu có `invoiceId`, tải hóa đơn rồi mở modal. Với hợp đồng `awaiting_approval` có `depositPayment.status === "unpaid"`, render card và nút `Thanh toán ngay`.

Render cuối màn hình:

```tsx
<PaymentModal
  visible={Boolean(paymentInvoice)}
  invoice={paymentInvoice}
  onClose={() => setPaymentInvoice(null)}
  onConfirm={handleDepositPaymentConfirmed}
/>
```

`handleDepositPaymentConfirmed` tải lại hợp đồng, đóng modal và dùng Notification thành công.

- [ ] **Step 6: Giữ VNPay và VietQR**

Không tạo API thanh toán mới. PaymentModal tiếp tục gọi `invoiceService.createVNPayPayment` và `createVietQRPayment`; thứ tự UI đặt VNPay trước VietQR trong riêng modal hiện có nếu chưa đúng.

- [ ] **Step 7: Chạy GREEN**

Run:

```bash
node --test test_contract_deposit_ui.js
npx tsc --noEmit
npm run lint
```

Expected: test và TypeScript PASS; không có lint error mới.

### Task 5: Xác minh tích hợp

**Files:**
- Modify: `reports/unified-webadmin-report.md`

- [ ] **Step 1: Chạy toàn bộ suite**

Run:

```bash
npm run test:ui
cd backend && npm test
cd .. && npx tsc --noEmit
cd webadmin && npm run lint && npm run build
cd .. && git diff --check
```

Expected: tất cả exit code 0.

- [ ] **Step 2: Kiểm tra ràng buộc**

Xác nhận source mới chỉ dùng Người thuê/nguoiThue/NGUOI_THUE và không sửa `RepairRequest.tenantId`.

- [ ] **Step 3: Manual test**

1. Admin tạo hợp đồng có tiền cọc.
2. Người thuê ký trên Expo.
3. PaymentModal mở và hiển thị VNPay/VietQR.
4. Đóng modal; CTA vẫn còn trong Hợp đồng.
5. Mở lại app; CTA được khôi phục.
6. Thanh toán sandbox; IPN/callback cập nhật hóa đơn.
7. CTA biến mất sau refresh.
8. Admin duyệt thành công.
9. Lặp lại với tiền cọc bằng 0; không mở modal và Admin duyệt được.

- [ ] **Step 4: Cập nhật báo cáo**

Ghi kết quả test, vị trí CTA, hành vi idempotent và xác nhận không push GitHub.
