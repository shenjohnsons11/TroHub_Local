export type CCCDQrData = {
  idCard: string;
  fullName: string;
};

export function parseCCCDQr(value: string): CCCDQrData | null {
  const [idCard = "", , fullName = ""] = value.split("|");
  const digits = idCard.replace(/\D/g, "");

  return digits.length === 12 && fullName.trim()
    ? { idCard: digits, fullName: fullName.trim() }
    : null;
}
