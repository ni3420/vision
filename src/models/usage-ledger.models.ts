import mongoose, { Schema } from "mongoose";

export type UsageKind = "image" | "background" | "music" | "conversation";
export type UsageStatus = "reserved" | "settled" | "refunded";

export interface IUsageLedger {
  userId: string;
  kind: UsageKind;
  status: UsageStatus;
  idempotencyKey?: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UsageLedgerSchema = new Schema<IUsageLedger>(
  {
    userId: { type: String, required: true, index: true },
    // "music" stays in the enum so historical ledger rows remain valid.
    kind: {
      type: String,
      enum: ["image", "background", "music", "conversation"],
      required: true,
    },
    status: {
      type: String,
      enum: ["reserved", "settled", "refunded"],
      required: true,
      default: "reserved",
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
    reason: { type: String },
  },
  { timestamps: true }
);

UsageLedgerSchema.index({ userId: 1, createdAt: -1 });

export const UsageLedger =
  mongoose.models.UsageLedger ||
  mongoose.model<IUsageLedger>("UsageLedger", UsageLedgerSchema);
