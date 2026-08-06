export type WidgetDataSnapshot = {
  totalRevenue: number;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
  outstandingDebt: number;
  utilityReadingProgress: string;
  openRepairsCount: number;
  lastSyncedAt: string;
};

export type LandlordStatsInput = {
  totalRooms?: number;
  occupiedRooms?: number;
  totalRevenue?: number;
  outstandingDebt?: number;
  utilityReadingProgress?: string;
  pendingRepairs?: number;
  openRepairsCount?: number;
};

export function toWidgetSnapshot(statsData: LandlordStatsInput = {}): WidgetDataSnapshot {
  const totalRooms = Math.max(0, Number(statsData.totalRooms) || 0);
  const occupiedRooms = Math.max(0, Number(statsData.occupiedRooms) || 0);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return {
    totalRevenue: Number(statsData.totalRevenue) || 0,
    occupancyRate,
    occupiedRooms,
    totalRooms,
    outstandingDebt: Number(statsData.outstandingDebt) || 0,
    utilityReadingProgress: statsData.utilityReadingProgress || `${Math.max(occupiedRooms - 2, 0)}/${occupiedRooms} phòng`,
    openRepairsCount: Number(statsData.openRepairsCount ?? statsData.pendingRepairs) || 0,
    lastSyncedAt: new Date().toISOString(),
  };
}
