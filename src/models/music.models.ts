import mongoose, { Schema, Document } from "mongoose";

export interface IMusic extends Document {
  userId: string;
  prompt: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
}

const MusicSchema = new Schema<IMusic>(
  {
    userId: { type: String, required: true, index: true },
    prompt: { type: String, required: true },
    audioUrl: { type: String, required: true },
    duration: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const Music = mongoose.models.Music || mongoose.model<IMusic>("Music", MusicSchema);