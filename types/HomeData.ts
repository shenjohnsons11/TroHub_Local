export type HomeData = {
  tenantName: string;
  room: string;
  totalAmount: string;
  paymentStatus: "unpaid" | "paid";
  paymentStatusText: string;
  dueDate: string;
  contractEndDate: string;
  propertyAddress?: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
  recentRepair: {
    title: string;
    status: string;
  };
};
