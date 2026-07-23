const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, relativePath), "utf8");

test("Expo restores the deposit CTA and opens the shared PaymentModal", () => {
  const contractScreen = read("screens/ContractScreen.tsx");
  const contractTypes = read("types/Contract.ts");
  const contractService = read("services/contractService.ts");
  const invoiceService = read("services/invoiceService.ts");

  assert.match(contractTypes, /depositPayment/);
  assert.match(contractService, /depositPayment/);
  assert.match(contractScreen, /Tiền cọc chưa thanh toán/);
  assert.match(contractScreen, /Thanh toán ngay/);
  assert.match(contractScreen, /PaymentModal/);
  assert.match(contractScreen, /paymentInvoice/);
  assert.match(invoiceService, /getInvoiceById/);
});

test("PaymentModal keeps VNPay and VietQR with VNPay preferred", () => {
  const paymentModal = read("components/PaymentModal.tsx");

  assert.match(paymentModal, /createVNPayPayment/);
  assert.match(paymentModal, /createVietQRPayment/);
  assert.match(paymentModal, /useState<PaymentMethod>\("vnpay"\)/);
  assert.ok(
    paymentModal.indexOf('onPress={() => setMethod("vnpay")}') <
      paymentModal.indexOf('onPress={() => setMethod("bank")}'),
  );
});
