export type MeterPreview = {
  previous: number;
  current: number;
  usage: number;
  unitPrice: number;
  amount: number;
};

/**
 * Returns a client-side display preview only. The backend remains the source of
 * truth for invoice calculations and keeps its existing calculation contract.
 */
export function getMeterPreview(
  previous: number,
  current: number,
  unitPrice: number
): MeterPreview | null {
  if (
    ![previous, current, unitPrice].every(Number.isFinite) ||
    previous < 0 ||
    current < previous ||
    unitPrice < 0
  ) {
    return null;
  }

  const usage = current - previous;
  return {
    previous,
    current,
    usage,
    unitPrice,
    amount: Math.round(usage * unitPrice),
  };
}
