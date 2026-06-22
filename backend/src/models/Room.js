import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  houseId: { type: String, default: "H001" },
  ownerUserId: { type: String, default: "U001" },
  code: { type: String, required: true },
  name: { type: String, required: true },
  areaM2: { type: Number, default: 0 },
  rentPrice: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  maxOccupants: { type: Number, default: 1 },
  currentOccupants: { type: Number, default: 0 },
  status: { type: String, enum: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"], default: "AVAILABLE" },
  note: { type: String, default: "" }
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
