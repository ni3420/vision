import mongoose, { Schema } from "mongoose"

export interface IStripeEvent {
  _id: string
  type: string
}

const StripeEventSchema = new Schema<IStripeEvent>(
  {
    _id: { type: String, required: true },
    type: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
)

export const StripeEvent =
  mongoose.models.StripeEvent ||
  mongoose.model<IStripeEvent>("StripeEvent", StripeEventSchema)
