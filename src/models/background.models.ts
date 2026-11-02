import mongoose, { Schema } from "mongoose";

export interface IBackground {
  userId: string;
  sourceKey: string;
  sourceUrl?: string;
  sourceMime: string;
  sourceBytes: number;
  objectKey: string;
  /** Durable public URL when the storage driver provides one. */
  url?: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  provider: string;
  model: string;
  mock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BackgroundSchema = new Schema<IBackground>(
  {
    userId: { type: String, required: true, index: true },
    sourceKey: { type: String, required: true },
    sourceUrl: { type: String },
    sourceMime: { type: String, required: true },
    sourceBytes: { type: Number, required: true, min: 1 },
    objectKey: { type: String, required: true, unique: true },
    url: { type: String },
    mime: { type: String, required: true },
    bytes: { type: Number, required: true, min: 1 },
    width: { type: Number },
    height: { type: Number },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    mock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BackgroundSchema.index({ userId: 1, createdAt: -1 });

export const Background =
  mongoose.models.Background ||
  mongoose.model<IBackground>("Background", BackgroundSchema);
