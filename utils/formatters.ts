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
