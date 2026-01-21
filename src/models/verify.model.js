import mongoose, { Schema } from "mongoose";

const otpTokenSchema = new Schema(
  {
    email: { type: String, index: true, required: true }, // or phone
    otpHash: { type: String, required: true }, // hash the OTP with bcrypt
    attempts: { type: Number, default: 0 }, // track failed attempts
    createdAt: { type: Date, default: Date.now, expires: 300 }
  },
  { timestamps: true }
);

export const OtpToken = mongoose.model("OtpToken", otpTokenSchema);
