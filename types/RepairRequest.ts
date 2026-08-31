export type Priority = "Cao" | "Trung bình" | "Thấp" | "Chưa phân loại";

export type RepairStatus = "pending" | "processing" | "done";

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
  images?: string[];
};
