const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidDateParts(day: number, month: number, year: number) {
  return (
    Number.isInteger(day) &&
    Number.isInteger(month) &&
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

export function formatIsoToDisplay(iso: string): string {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return "";
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return isValidDateParts(day, month, year)
    ? `${dayText}/${monthText}/${yearText}`
    : "";
}

export function formatDisplayDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDisplayToIso(value: string): string | null {
  const match = DISPLAY_DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (!isValidDateParts(day, month, year)) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

export function displayDateToLocalDate(value: string): Date | null {
  const iso = parseDisplayToIso(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addTwelveMonths(value: string): string | null {
  const iso = parseDisplayToIso(value);
  if (!iso) return null;
  const [yearText, monthText, dayText] = iso.split("-");
  const targetYear = Number(yearText) + 1;
  const month = Number(monthText);
  const day = Math.min(Number(dayText), daysInMonth(targetYear, month));
  return `${pad(day)}/${pad(month)}/${targetYear}`;
}

export function defaultContractDates(now = new Date()) {
  const startDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  return {
    startDate,
    endDate: addTwelveMonths(startDate) || "",
  };
}

export function resolveEndDateAfterStartChange(
  startDate: string,
  endDateWasEdited: boolean,
  currentEndDate = "",
): string {
  if (endDateWasEdited) return currentEndDate;
  return addTwelveMonths(startDate) || currentEndDate;
}

export function validateContractDateRange(
  startDate: string,
  endDate: string,
): Partial<Record<"startDate" | "endDate", string>> {
  const errors: Partial<Record<"startDate" | "endDate", string>> = {};
  if (!startDate.trim()) {
    errors.startDate = "Vui lòng nhập ngày bắt đầu.";
  } else if (!parseDisplayToIso(startDate)) {
    errors.startDate = "Ngày phải đúng định dạng dd/mm/yyyy.";
  }
  if (!endDate.trim()) {
    errors.endDate = "Vui lòng nhập ngày kết thúc.";
  } else if (!parseDisplayToIso(endDate)) {
    errors.endDate = "Ngày phải đúng định dạng dd/mm/yyyy.";
  }
  const startIso = parseDisplayToIso(startDate);
  const endIso = parseDisplayToIso(endDate);
  if (startIso && endIso && endIso <= startIso) {
    errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
  }
  return errors;
}
