export type Priority =
  | "Cao"
  | "Trung bình"
  | "Thấp"
  | "Chưa phân loại";

export type RepairStatus =
  | "pending"
  | "processing"
  | "done"
  | "cancelled";

export type RepairRequest = {
  id: string;

  contractId?: string;

  roomId?: string;

  room: string;

  type: string;

  priority?: Priority;

  description: string;

  status: RepairStatus;

  createdAt: string;

  appointmentDate?: string;

  scheduledAt?: string;

  landlordNote?: string;

  estimatedCost?: number;

  actualCost?: number;

  completedAt?: string;

  images?: string[];

  tenantName?: string;

  tenantPhone?: string;
};