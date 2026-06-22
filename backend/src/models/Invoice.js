import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  roomId: { type: String, required: true },
  landlordUserId: { type: String, default: "U001" },
  tenantUserId: { type: String, required: true },
  contractId: { type: String, default: null },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  roomAmount: { type: Number, default: 0 },
  electricityAmount: { type: Number, default: 0 },
  waterAmount: { type: Number, default: 0 },
  serviceAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  penaltyDays: { type: Number, default: 0 },
  penaltyRate: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: null },
  transactionCode: { type: String, default: "" },
  paidAt: { type: String, default: null },
  status: { type: String, enum: ["UNPAID", "PAID", "CANCELLED"], default: "UNPAID" }
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
