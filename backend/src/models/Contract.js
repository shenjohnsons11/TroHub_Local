import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  roomId: { type: String, required: true },
  landlordUserId: { type: String, required: true },
  tenantUserId: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  rentPrice: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  electricityUnitPrice: { type: Number, default: 0 },
  waterUnitPrice: { type: Number, default: 0 },
  status: { type: String, enum: ["DRAFT", "PENDING_TENANT", "PENDING_LANDLORD", "ACTIVE", "EXPIRED", "CANCELLED"], default: "DRAFT" }
}, { timestamps: true });

export const Contract = mongoose.model('Contract', contractSchema);
