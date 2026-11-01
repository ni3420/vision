import mongoose, { Schema } from "mongoose";

export interface IRateLimitHit {
  /** `${userId}:${route}:${windowStartMs}` — uniqueness is enforced by _id. */
  _id: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const RateLimitHitSchema = new Schema<IRateLimitHit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

// TTL cleanup: Mongo removes the document once the window has ended.
RateLimitHitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitHit =
  mongoose.models.RateLimitHit ||
  mongoose.model<IRateLimitHit>("RateLimitHit", RateLimitHitSchema);
