import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  role: { type: String, enum: ["ADMIN", "TENANT", "LANDLORD"], default: "TENANT" },
  citizenId: { type: String, default: "" },
  address: { type: String, default: "" },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
