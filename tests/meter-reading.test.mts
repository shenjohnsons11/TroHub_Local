import assert from "node:assert/strict";
import test from "node:test";
import { getMeterPreview } from "../utils/meter-reading.ts";

test("calculates a display-only utility meter preview", () => {
  assert.deepEqual(getMeterPreview(12563.2, 12624.7, 3500), {
    previous: 12563.2,
    current: 12624.7,
    usage: 61.5,
    unitPrice: 3500,
    amount: 215250,
  });
});

test("rejects invalid meter progressions", () => {
  assert.equal(getMeterPreview(20, 19, 3500), null);
});
