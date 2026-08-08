import assert from "node:assert/strict";
import test from "node:test";
import * as formatters from "../src/lib/formatters.ts";

test("formats canonical currency, phone, and CCCD values", () => {
  assert.equal(formatters.formatCurrency(8900000), "8.900.000đ");
  assert.equal(formatters.formatPhone("0901234567"), "0901.234.567");
  assert.equal(formatters.formatCCCD("012345678901"), "0123.4567.8901");
});

test("preserves a fractional meter reading", () => {
  assert.equal(
    (formatters as typeof formatters & { formatMeterReading: (value: unknown) => string }).formatMeterReading("12.563,2"),
    "12.563,2"
  );
});

test("parses Vietnamese and normalized decimal meter entries", () => {
  assert.equal(
    (formatters as typeof formatters & { parseMeterReading: (value: unknown) => number | null }).parseMeterReading("12.563,2"),
    12563.2
  );
  assert.equal(
    (formatters as typeof formatters & { parseMeterReading: (value: unknown) => number | null }).parseMeterReading("12563.2"),
    12563.2
  );
  assert.equal(
    (formatters as typeof formatters & { parseMeterReading: (value: unknown) => number | null }).parseMeterReading("12.563,25"),
    12563.25
  );
  assert.equal(
    (formatters as typeof formatters & { parseMeterReading: (value: unknown) => number | null }).parseMeterReading("12.563,2500"),
    null
  );
});
