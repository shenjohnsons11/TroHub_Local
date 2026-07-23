const assert = require("node:assert/strict");
const test = require("node:test");

test("builds an overdue snapshot in Asia Ho Chi Minh time", () => {
  const { buildLateFeeSnapshot } = require("./src/services/overdueInvoice");
  const result = buildLateFeeSnapshot({
    issuedAt: "2026-07-01",
    graceDays: 5,
    penaltyRate: 5,
    penaltyBaseAmount: 3000000,
    now: new Date("2026-07-07T00:00:00+07:00"),
  });

  assert.equal(result.overdueAt.toISOString(), "2026-07-06T17:00:00.000Z");
  assert.equal(result.penalty, 150000);
  assert.equal(result.isOverdue, true);
});

test("does not mark an invoice overdue before the boundary", () => {
  const { buildLateFeeSnapshot } = require("./src/services/overdueInvoice");
  const result = buildLateFeeSnapshot({
    issuedAt: "2026-07-01",
    graceDays: 5,
    penaltyRate: 5,
    penaltyBaseAmount: 3000000,
    now: new Date("2026-07-06T23:59:59+07:00"),
  });
  assert.equal(result.isOverdue, false);
});

test("rejects a future issued date", () => {
  const { buildLateFeeSnapshot } = require("./src/services/overdueInvoice");
  assert.throws(() =>
    buildLateFeeSnapshot({
      issuedAt: "2026-07-24",
      graceDays: 5,
      penaltyRate: 5,
      penaltyBaseAmount: 1000000,
      now: new Date("2026-07-23T12:00:00+07:00"),
    }),
  );
});

test("enables Mongoose update pipelines for overdue mutations", async (context) => {
  const Invoice = require("./src/models/Invoice");
  const originalUpdateMany = Invoice.updateMany;
  const originalFindOneAndUpdate = Invoice.findOneAndUpdate;
  const captured = {};

  Invoice.updateMany = async (_query, update, options) => {
    captured.many = { update, options };
    return { modifiedCount: 0 };
  };
  Invoice.findOneAndUpdate = async (_query, update, options) => {
    captured.one = { update, options };
    return null;
  };
  context.after(() => {
    Invoice.updateMany = originalUpdateMany;
    Invoice.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const {
    applyAllOverduePenalties,
    applyOverduePenalty,
  } = require("./src/services/overdueInvoice");
  await applyAllOverduePenalties(new Date("2026-07-23T12:00:00+07:00"));
  await applyOverduePenalty(
    "507f1f77bcf86cd799439011",
    new Date("2026-07-23T12:00:00+07:00"),
  );

  assert.ok(Array.isArray(captured.many.update));
  assert.equal(captured.many.options.updatePipeline, true);
  assert.ok(Array.isArray(captured.one.update));
  assert.equal(captured.one.options.updatePipeline, true);
  assert.equal(captured.one.options.new, true);
});
