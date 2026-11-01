import mongoose, { Schema } from "mongoose";

export type AssetKind = "image" | "music";

export interface IAsset {
  userId: string;
  kind: AssetKind;
  objectKey: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  prompt?: string;
  provider: string;
  model: string;
  visibility: "private" | "public";
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["image", "music"], required: true },
    objectKey: { type: String, required: true, unique: true },
    mime: { type: String, required: true },
    bytes: { type: Number, required: true, min: 1 },
    width: { type: Number },
    height: { type: Number },
    durationSec: { type: Number },
    prompt: { type: String },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
  },
  { timestamps: true }
);

AssetSchema.index({ userId: 1, kind: 1, createdAt: -1 });

export const Asset =
  mongoose.models.Asset || mongoose.model<IAsset>("Asset", AssetSchema);
