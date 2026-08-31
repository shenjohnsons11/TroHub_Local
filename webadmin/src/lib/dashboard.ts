export type BillingAutomationPolicy = { autoInvoiceEnabled: boolean; invoiceDay: number; dueDay: number; autoRemindEnabled: boolean; remindDaysBeforeDue: number; issueTime?: string };
export type DashboardStats = {
  totalRooms: number; occupiedRooms: number; vacantRooms: number; maintenanceRooms: number; totalTenants: number; pendingRepairs: number; pendingContracts: number; totalRevenue: number; outstandingDebt: number; overdueDebt: number;
  revenueSeries: { period: string; label: string; value: number }[];
  utilitySeries: { period: string; label: string; electricity: number; water: number }[];
  revenueComposition: { rent: number; utilities: number; services: number };
  paymentPerformance: { paid: number; unpaid: number; overdue: number; onTimeRate: number };
  utilityReading: { readyRooms: number; missingRooms: number; totalOccupiedRooms: number; missingRoomCodes: string[] };
  automation: BillingAutomationPolicy;
  floorGroups: { floor: number; rooms: { id: string; roomCode: string; status: number; tenantName: string; meterReady: boolean; missingMeters: string[] }[] }[];
};
