import mongoose, { Schema } from "mongoose";

export interface IMusic {
  userId: string;
  prompt: string;
  audioUrl: string;
  objectKey?: string;
  provider?: string;
  model?: string;
  duration: number;
  createdAt: Date;
}

const MusicSchema = new Schema<IMusic>(
  {
    userId: { type: String, required: true, index: true },
    prompt: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    objectKey: { type: String },
    provider: { type: String },
    model: { type: String },
    duration: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const Music = mongoose.models.Music || mongoose.model<IMusic>("Music", MusicSchema);
