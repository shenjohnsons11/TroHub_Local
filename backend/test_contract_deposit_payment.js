const assert = require("node:assert/strict");
const test = require("node:test");

const CONTRACT_ID = "507f1f77bcf86cd799439011";
const NGUOI_THUE_ID = "507f191e810c19729de860ea";
const OTHER_NGUOI_THUE_ID = "507f191e810c19729de860eb";
const INVOICE_ID = "507f191e810c19729de860ec";
const fs = require("node:fs");
const path = require("node:path");

function createFixture({ deposit = 3500000, status = 0, existingInvoice = null } = {}) {
  const createdInvoices = [];
  const deletedInvoiceIds = [];
  const contract = {
    _id: CONTRACT_ID,
    tenantId: NGUOI_THUE_ID,
    roomId: "507f191e810c19729de860ed",
    fixedDeposit: deposit,
    status,
    tenantConfirmedAt: null,
    saveCalls: 0,
    async save() {
      this.saveCalls += 1;
      return this;
    },
  };
  const ContractModel = {
    async findById(id) {
      return id === CONTRACT_ID ? contract : null;
    },
  };
  const InvoiceModel = {
    async findOne(query) {
      assert.equal(String(query.contractId), CONTRACT_ID);
      assert.equal(query.period, "Tiền cọc");
      return existingInvoice;
    },
    async create(data) {
      const invoice = { _id: INVOICE_ID, ...data };
      createdInvoices.push(invoice);
      return invoice;
    },
    async findByIdAndDelete(id) {
      deletedInvoiceIds.push(String(id));
    },
  };
  const RoomModel = {
    async findById() {
      return { roomCode: "P101" };
    },
  };

  return {
    contract,
    ContractModel,
    InvoiceModel,
    RoomModel,
    createdInvoices,
    deletedInvoiceIds,
  };
}

test("Người thuê signs their contract and creates one deposit invoice", async () => {
  const fixture = createFixture();
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  const result = await signContractAndEnsureDeposit({
    contractId: CONTRACT_ID,
    nguoiThueId: NGUOI_THUE_ID,
    ContractModel: fixture.ContractModel,
    InvoiceModel: fixture.InvoiceModel,
    RoomModel: fixture.RoomModel,
  });

  assert.equal(result.invoiceId, INVOICE_ID);
  assert.equal(result.depositRequired, true);
  assert.equal(result.depositAmount, 3500000);
  assert.equal(result.idempotent, false);
  assert.equal(fixture.contract.status, 4);
  assert.equal(fixture.createdInvoices.length, 1);
  assert.equal(fixture.createdInvoices[0].status, 1);
  assert.equal(fixture.createdInvoices[0].contractId, CONTRACT_ID);
});

test("signing rejects a contract owned by another Người thuê", async () => {
  const fixture = createFixture();
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  await assert.rejects(
    signContractAndEnsureDeposit({
      contractId: CONTRACT_ID,
      nguoiThueId: OTHER_NGUOI_THUE_ID,
      ContractModel: fixture.ContractModel,
      InvoiceModel: fixture.InvoiceModel,
      RoomModel: fixture.RoomModel,
    }),
    (error) => error.code === "CONTRACT_FORBIDDEN" && error.status === 403,
  );
  assert.equal(fixture.createdInvoices.length, 0);
  assert.equal(fixture.contract.status, 0);
});

test("repeated signing returns the existing invoice without creating another", async () => {
  const existingInvoice = {
    _id: INVOICE_ID,
    totalAmount: 3500000,
    status: 1,
  };
  const fixture = createFixture({ status: 4, existingInvoice });
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  const result = await signContractAndEnsureDeposit({
    contractId: CONTRACT_ID,
    nguoiThueId: NGUOI_THUE_ID,
    ContractModel: fixture.ContractModel,
    InvoiceModel: fixture.InvoiceModel,
    RoomModel: fixture.RoomModel,
  });

  assert.equal(result.invoiceId, INVOICE_ID);
  assert.equal(result.idempotent, true);
  assert.equal(fixture.createdInvoices.length, 0);
  assert.equal(fixture.contract.saveCalls, 0);
});

test("zero deposit signs without creating an invoice", async () => {
  const fixture = createFixture({ deposit: 0 });
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  const result = await signContractAndEnsureDeposit({
    contractId: CONTRACT_ID,
    nguoiThueId: NGUOI_THUE_ID,
    ContractModel: fixture.ContractModel,
    InvoiceModel: fixture.InvoiceModel,
    RoomModel: fixture.RoomModel,
  });

  assert.equal(result.invoiceId, null);
  assert.equal(result.depositRequired, false);
  assert.equal(fixture.createdInvoices.length, 0);
  assert.equal(fixture.contract.status, 4);
});

test("invoice creation failure leaves the contract unsigned", async () => {
  const fixture = createFixture();
  fixture.InvoiceModel.create = async () => {
    throw new Error("database unavailable");
  };
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  await assert.rejects(
    signContractAndEnsureDeposit({
      contractId: CONTRACT_ID,
      nguoiThueId: NGUOI_THUE_ID,
      ContractModel: fixture.ContractModel,
      InvoiceModel: fixture.InvoiceModel,
      RoomModel: fixture.RoomModel,
    }),
    /database unavailable/,
  );
  assert.equal(fixture.contract.status, 0);
  assert.equal(fixture.contract.saveCalls, 0);
});

test("contract save failure rolls back the newly created deposit invoice", async () => {
  const fixture = createFixture();
  fixture.contract.save = async () => {
    throw new Error("contract save failed");
  };
  const { signContractAndEnsureDeposit } = require("./src/services/contractSigningService");

  await assert.rejects(
    signContractAndEnsureDeposit({
      contractId: CONTRACT_ID,
      nguoiThueId: NGUOI_THUE_ID,
      ContractModel: fixture.ContractModel,
      InvoiceModel: fixture.InvoiceModel,
      RoomModel: fixture.RoomModel,
    }),
    /contract save failed/,
  );
  assert.deepEqual(fixture.deletedInvoiceIds, [INVOICE_ID]);
});

test("both signing endpoints use the shared service and require Người thuê auth", () => {
  const read = (relativePath) =>
    fs.readFileSync(path.join(__dirname, relativePath), "utf8");
  const contractControllerSource = read("src/controllers/contractController.js");
  const meControllerSource = read("src/controllers/meController.js");
  const contractRoutesSource = read("src/routes/contractRoutes.js");
  const meRoutesSource = read("src/routes/meRoute.js");
  const invoiceModelSource = read("src/models/Invoice.js");

  assert.match(contractControllerSource, /signContractAndEnsureDeposit/);
  assert.match(contractControllerSource, /buildDepositPayment/);
  assert.match(contractControllerSource, /tenantId:\s*nguoiThueId/);
  assert.match(
    contractControllerSource,
    /fixedDeposit[\s\S]*!depositInvoice[\s\S]*depositInvoice\.status !== 2/,
  );
  assert.match(meControllerSource, /signContractAndEnsureDeposit/);
  assert.match(contractRoutesSource, /requireTenant/);
  assert.match(meRoutesSource, /requireTenant/);
  assert.match(invoiceModelSource, /partialFilterExpression/);
});

test("deposit payment metadata distinguishes unpaid paid and zero deposit", async () => {
  const { buildDepositPayment } = require("./src/services/contractSigningService");
  const unpaidInvoice = {
    _id: INVOICE_ID,
    totalAmount: 3500000,
    status: 1,
  };
  const paidInvoice = { ...unpaidInvoice, status: 2 };
  const createInvoiceModel = (invoice) => ({
    async findOne() {
      return invoice;
    },
  });

  assert.deepEqual(
    await buildDepositPayment(
      { _id: CONTRACT_ID, fixedDeposit: 3500000 },
      createInvoiceModel(unpaidInvoice),
    ),
    {
      required: true,
      invoiceId: INVOICE_ID,
      amount: 3500000,
      status: "unpaid",
    },
  );
  assert.equal(
    (
      await buildDepositPayment(
        { _id: CONTRACT_ID, fixedDeposit: 3500000 },
        createInvoiceModel(paidInvoice),
      )
    ).status,
    "paid",
  );
  assert.deepEqual(
    await buildDepositPayment(
      { _id: CONTRACT_ID, fixedDeposit: 0 },
      createInvoiceModel(null),
    ),
    {
      required: false,
      invoiceId: null,
      amount: 0,
      status: "not_required",
    },
  );
});
