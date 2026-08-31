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
  myInvoices: Invoice[];
  contracts: Contract[];
  activeContract: Contract | null;
  activeRepairs: RepairRequest[];
  propertyAddress?: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
  recentRepair: {
    title: string;
    status: string;
  };
};
