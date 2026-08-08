const digitsOnly = (value: unknown) => String(value ?? "").replace(/\D/g, "");

export function unformatDigits(value: unknown): string {
  return digitsOnly(value);
}

export function unformatNumber(value: unknown): number {
  return Number(digitsOnly(value)) || 0;
}

export function formatNumberInput(value: unknown): string {
  const digits = digitsOnly(value);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
}

export function formatCurrency(value: unknown): string {
  return `${formatNumberInput(value) || "0"}đ`;
}

/**
 * Formats a utility meter reading without collapsing its fractional precision.
 * This is intentionally separate from money formatting, which remains integer-only.
 */
export function formatMeterReading(value: unknown): string {
  const parsed = parseMeterReading(value);
  return parsed === null
    ? ""
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(parsed);
}

/** Parses Vietnamese (12.563,2) and normalized (12563.2) meter entries. */
export function parseMeterReading(value: unknown): number | null {
  const source = String(value ?? "").trim().replace(/\s/g, "");
  if (!source) return null;

  const normalized = source.includes(",")
    ? source.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/.test(source)
      ? source.replace(/\./g, "")
      : source;

  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatPhone(value: unknown): string {
  const digits = digitsOnly(value).slice(0, 10);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)]
    .filter(Boolean)
    .join(".");
}

export function formatCCCD(value: unknown): string {
  const digits = digitsOnly(value).slice(0, 12);
  return [digits.slice(0, 4), digits.slice(4, 8), digits.slice(8)]
    .filter(Boolean)
    .join(".");
}
