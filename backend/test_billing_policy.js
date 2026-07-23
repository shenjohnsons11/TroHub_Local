const assert = require("node:assert/strict");
const test = require("node:test");

test("normalizes a billing policy and ignores client ownership", () => {
  const { normalizeBillingPolicy } = require("./src/services/billingPolicy");
  assert.deepEqual(
    normalizeBillingPolicy({
      lateFeeGraceDays: 5,
      lateFeeRate: 4.5,
      landlordId: "client-value",
    }),
    { lateFeeGraceDays: 5, lateFeeRate: 4.5 },
  );
});

test("rejects policy values outside supported ranges", () => {
  const { normalizeBillingPolicy } = require("./src/services/billingPolicy");
  assert.throws(() =>
    normalizeBillingPolicy({ lateFeeGraceDays: 91, lateFeeRate: 5 }),
  );
  assert.throws(() =>
    normalizeBillingPolicy({ lateFeeGraceDays: 3, lateFeeRate: 101 }),
  );
});

test("billing policy routes require Admin authorization", () => {
  const router = require("./src/routes/billingPolicyRoutes");
  const stack = router.stack || [];
  assert.ok(stack[0]?.name === "requireAdmin");
});
