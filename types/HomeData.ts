import { Contract } from "./Contract";
import { Invoice } from "./Invoice";
import { RepairRequest } from "./RepairRequest";

export type HomeData = {
  tenantName: string;
  room: string;
  totalAmount: string;
  paymentStatus: "unpaid" | "paid";
  paymentStatusText: string;
  dueDate: string;
  contractEndDate: string;
<<<<<<< HEAD
=======
  myInvoices: Invoice[];
  activeContract: Contract | null;
  activeRepairs: RepairRequest[];
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
  propertyAddress?: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
  recentRepair: {
    title: string;
    status: string;
  };
};
