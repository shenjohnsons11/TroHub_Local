export type HomeData = {
  tenantName: string;
  room: string;
  totalAmount: string;
  paymentStatus: "unpaid" | "paid";
  paymentStatusText: string;
  dueDate: string;
  contractEndDate: string;
  recentRepair: {
    title: string;
    status: string;
  };
};