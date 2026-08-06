export type MeterType = "electricity" | "water";

export function applyMeterReading<T extends Record<string, { electricity: string; water: string }>>(
  readings: T,
  roomId: string,
  meterType: MeterType,
  value: string,
): T {
  const current = readings[roomId] || { electricity: "", water: "" };
  return { ...readings, [roomId]: { ...current, [meterType]: value } } as T;
}
