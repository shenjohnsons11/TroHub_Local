const assert = require("node:assert/strict");
const test = require("node:test");

const {
  addTwelveMonths,
  defaultContractDates,
  displayDateToLocalDate,
  formatIsoToDisplay,
  formatDisplayDateInput,
  parseDisplayToIso,
  resolveEndDateAfterStartChange,
  validateContractDateRange,
} = require("./utils/contractDate.ts");

test("formats ISO dates for Admin display", () => {
  assert.equal(formatIsoToDisplay("2026-07-23"), "23/07/2026");
});

test("masks editable Admin date input as dd/mm/yyyy", () => {
  assert.equal(formatDisplayDateInput("23072026"), "23/07/2026");
  assert.equal(formatDisplayDateInput("23/07/2026"), "23/07/2026");
  assert.equal(formatDisplayDateInput("23a07b202612"), "23/07/2026");
});

test("parses valid display dates and rejects impossible dates", () => {
  assert.equal(parseDisplayToIso("23/07/2026"), "2026-07-23");
  assert.equal(parseDisplayToIso("31/02/2026"), null);
  assert.equal(parseDisplayToIso("2026-07-23"), null);
});

test("converts a display date to a local Date for native pickers", () => {
  const date = displayDateToLocalDate("23/07/2026");
  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 6);
  assert.equal(date?.getDate(), 23);
  assert.equal(displayDateToLocalDate("31/02/2026"), null);
});

test("adds twelve months and clamps leap day safely", () => {
  assert.equal(addTwelveMonths("29/02/2024"), "28/02/2025");
  assert.equal(addTwelveMonths("23/07/2026"), "23/07/2027");
});

test("creates editable default contract dates from the current local date", () => {
  assert.deepEqual(
    defaultContractDates(new Date(2026, 6, 23, 12, 0, 0)),
    {
      startDate: "23/07/2026",
      endDate: "23/07/2027",
    },
  );
});

test("updates the default end date without overwriting an Admin edit", () => {
  assert.equal(
    resolveEndDateAfterStartChange("24/07/2026", false),
    "24/07/2027",
  );
  assert.equal(
    resolveEndDateAfterStartChange("24/07/2026", true, "01/08/2027"),
    "01/08/2027",
  );
});

test("validates the contract date range", () => {
  assert.deepEqual(
    validateContractDateRange("23/07/2026", "23/07/2027"),
    {},
  );
  assert.equal(
    validateContractDateRange("31/02/2026", "23/07/2027").startDate,
    "Ngày phải đúng định dạng dd/mm/yyyy.",
  );
  assert.equal(
    validateContractDateRange("23/07/2026", "22/07/2026").endDate,
    "Ngày kết thúc phải sau ngày bắt đầu.",
  );
});
